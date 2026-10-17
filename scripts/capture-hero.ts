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
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from '@playwright/test';
import { frameCoversGlass } from '../src/lib/hero/capture.ts';

const STILL_PATH = 'src/assets/hero/hero-still.jpg';
const ANCHOR_PATH = 'src/lib/hero/still-anchor.json';
const PORT = Number(process.env.CAPTURE_PORT ?? 4398);
const ORIGIN = process.env.CAPTURE_ORIGIN ?? `http://localhost:${PORT}`;
// The stage is 16:10 and as wide as the viewport allows; the extra height keeps the header out of
// the way so the stage is exactly 1600x1000.
const VIEWPORT = { width: 1600, height: 1100 };
const STAGE = { width: 1600, height: 1000 };
const JPEG_QUALITY = 86;
const READY_TIMEOUT = 60_000;

async function startPreview(): Promise<ChildProcess | null> {
  if (process.env.CAPTURE_ORIGIN) return null;
  const server = spawn('pnpm', ['astro', 'preview', '--ignore-lock', '--port', String(PORT)], {
    stdio: 'ignore',
  });
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${ORIGIN}/`)).ok) return server;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  server.kill();
  throw new Error(`astro preview did not start on ${ORIGIN}; run "pnpm build" first`);
}

const server = await startPreview();
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
try {
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
  await stage.screenshot({
    path: STILL_PATH,
    type: 'jpeg',
    quality: JPEG_QUALITY,
    scale: 'css',
  });
  console.log(`still  ${STILL_PATH} (${(statSync(STILL_PATH).size / 1024).toFixed(1)} KB)`);
  console.log(`glass  ${JSON.stringify(anchor)} inside frame ${JSON.stringify(frame)}`);
} finally {
  await browser.close();
  server?.kill();
}
