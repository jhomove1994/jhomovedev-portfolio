/**
 * Photographs the 3D desk into the committed static hero still (A10).
 *
 *   pnpm build && pnpm capture:hero
 *
 * Opens `/es/?3d=1&capture=1` in a fresh Chromium context (so the persisted override of earlier
 * runs cannot leak), waits for the scene and two rendered frames, hides everything but the desk
 * with the `[data-capture]` rule and writes src/assets/hero/hero-still.jpg (JPEG keeps it under
 * the 150 KB image budget). The monitor glass of the rest pose is small (about 20% of the stage),
 * so the static hero's 2D terminal frame (src/lib/hero/still-anchor.json) is deliberately larger
 * and floats over it: the script reads the glass from the live camera through
 * `window.__heroCapture.screenRect()` and fails when that frame would leave part of it uncovered.
 * It serves `dist/` with `astro preview` unless CAPTURE_ORIGIN points at a running server.
 * Software WebGL (SwiftShader) is allowed, so it also works on machines without a GPU.
 * Runs on Node type stripping (>=22.18): keep to erasable TypeScript syntax.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname } from 'node:path';
import { chromium, type Browser } from '@playwright/test';
import { frameCoversGlass, parseCapturePort } from '../src/lib/hero/capture.ts';

const STILL_PATH = 'src/assets/hero/hero-still.jpg';
const ANCHOR_PATH = 'src/lib/hero/still-anchor.json';
const PORT = parseCapturePort(process.env.CAPTURE_PORT, 4398);
const ORIGIN = process.env.CAPTURE_ORIGIN ?? `http://localhost:${PORT}`;
// The stage is 16:10 and as wide as the viewport allows; the extra height keeps the header out of
// the way so the stage is exactly 1600x1000.
const VIEWPORT = { width: 1600, height: 1100 };
const STAGE = { width: 1600, height: 1000 };
const JPEG_QUALITY = 86;
const READY_TIMEOUT = 60_000;
const IMAGE_BUDGET = 150 * 1024;
const ASTRO_BIN = 'node_modules/.bin/astro';

function portIsFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, () => probe.close(() => resolve(true)));
  });
}

let server: ChildProcess | null = null;
let browser: Browser | null = null;
let tempPath: string | null = null;

/** Releases everything this run owns; safe to call more than once and from signal handlers. */
async function cleanup(): Promise<void> {
  const open = browser;
  browser = null;
  await open?.close().catch(() => {});
  server?.kill();
  server = null;
  if (tempPath) rmSync(tempPath, { force: true });
  tempPath = null;
}

for (const [signal, code] of [
  ['SIGINT', 130],
  ['SIGTERM', 143],
] as const) {
  process.once(signal, () => {
    void cleanup().finally(() => process.exit(code));
  });
}

async function startPreview(): Promise<void> {
  if (process.env.CAPTURE_ORIGIN) return;
  if (!(await portIsFree(PORT))) {
    throw new Error(`port ${PORT} is already in use: stop that process or set CAPTURE_PORT`);
  }
  // The astro binary is spawned directly (no pnpm or shell wrapper), so kill() reaches the server.
  const child = spawn(ASTRO_BIN, ['preview', '--ignore-lock', '--port', String(PORT)], {
    stdio: 'ignore',
  });
  server = child;
  let died: string | null = null;
  child.once('error', (error) => (died = `could not start ${ASTRO_BIN}: ${error.message}`));
  child.once('exit', (code, signal) => {
    died = `astro preview exited during startup (${signal ?? `code ${code}`}); run "pnpm build" first`;
  });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (died) throw new Error(died);
    try {
      if ((await fetch(`${ORIGIN}/`)).ok && !died) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`astro preview did not start on ${ORIGIN}; run "pnpm build" first`);
}

try {
  await startPreview();
  browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext({ viewport: VIEWPORT })).newPage();
  await page.goto(`${ORIGIN}/es/?3d=1&capture=1`);
  const hero = page.locator('#hero');
  await hero.waitFor();
  await page.waitForFunction(
    () => document.getElementById('hero')?.getAttribute('data-hero-state') === 'ready',
    undefined,
    { timeout: READY_TIMEOUT },
  );
  // Two frames after ready: the boot loader fade and the first lit frame are done by then.
  const seen = await page.evaluate(() => window.__heroRenderCount ?? 0);
  await page.waitForFunction((n) => (window.__heroRenderCount ?? 0) >= n + 2, seen);
  await page.evaluate(() => document.documentElement.setAttribute('data-capture', ''));
  await page.evaluate(() => document.fonts.ready);

  const stage = page.locator('.hero-still');
  const box = await stage.boundingBox();
  if (!box || Math.round(box.width) !== STAGE.width || Math.round(box.height) !== STAGE.height) {
    throw new Error(
      `stage is ${box?.width}x${box?.height}, expected ${STAGE.width}x${STAGE.height}`,
    );
  }
  const anchor = await page.evaluate(() => window.__heroCapture?.screenRect());
  if (!anchor)
    throw new Error('window.__heroCapture is missing: is ?capture=1 reaching the scene?');

  const frame = JSON.parse(readFileSync(ANCHOR_PATH, 'utf8')) as typeof anchor;
  if (!frameCoversGlass(frame, anchor)) {
    throw new Error(
      `${ANCHOR_PATH} ${JSON.stringify(frame)} does not cover the glass ${JSON.stringify(anchor)}`,
    );
  }

  mkdirSync(dirname(STILL_PATH), { recursive: true });
  tempPath = `${STILL_PATH}.tmp`;
  await stage.screenshot({
    path: tempPath,
    type: 'jpeg',
    quality: JPEG_QUALITY,
    scale: 'css',
  });
  const size = statSync(tempPath).size;
  if (size > IMAGE_BUDGET) {
    throw new Error(
      `still is ${(size / 1024).toFixed(1)} KB, over the ${IMAGE_BUDGET / 1024} KB image budget`,
    );
  }
  renameSync(tempPath, STILL_PATH);
  tempPath = null;
  console.log(`still  ${STILL_PATH} (${(size / 1024).toFixed(1)} KB)`);
  console.log(`glass  ${JSON.stringify(anchor)} inside frame ${JSON.stringify(frame)}`);
} finally {
  await cleanup();
}
