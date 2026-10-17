import { expect, test, type Page } from '@playwright/test';
import { decodePng } from './png';

// Real WebGL2 is needed: no stubs here. `--enable-unsafe-swiftshader` only allows a software
// fallback on machines without a GPU; it never forces software rendering.
test.use({ launchOptions: { args: ['--enable-unsafe-swiftshader'] } });
test.describe.configure({ retries: 1 });

const READY_TIMEOUT = 25_000;
const LOW_FPS_TIMEOUT = 60_000;
const BACKGROUND = [0x0a, 0x0e, 0x0d] as const;
const MIN_DIFFERING_PIXELS = 0.03;

let webgl2Available = true;
test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  webgl2Available = await page.evaluate(
    () => document.createElement('canvas').getContext('webgl2') !== null,
  );
  await page.close();
});

test.beforeEach(({ browserName }, testInfo) => {
  test.skip(browserName !== 'chromium', 'Chromium only');
  test.skip(testInfo.project.name !== 'desktop', 'the 3D scene is verified on the desktop project');
  test.skip(
    !webgl2Available,
    'WebGL2 is unavailable in this headless browser (no GPU or SwiftShader)',
  );
});

const open3d = (page: Page, query = '?3d=1') => page.goto(`/es/${query}`);
const hero = (page: Page) => page.locator('#hero');
const untilReady = (page: Page) =>
  expect(hero(page)).toHaveAttribute('data-hero-state', 'ready', { timeout: READY_TIMEOUT });

test.describe('@3d scene', () => {
  test('reaches ready with a real, hidden, non-blank canvas and a single h1', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await open3d(page);
    await untilReady(page);

    await expect(hero(page)).toHaveAttribute('data-hero-mode', '3d');
    await expect(hero(page)).toHaveAttribute('data-hero-reason', 'override-on');
    const canvas = hero(page).locator('canvas');
    await expect(canvas).toHaveCount(1);
    await expect(canvas).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('h1')).toHaveCount(1);

    const { width, height, rgba } = decodePng(await canvas.screenshot());
    let differing = 0;
    for (let i = 0; i < rgba.length; i += 4) {
      const delta =
        Math.abs(rgba[i]! - BACKGROUND[0]) +
        Math.abs(rgba[i + 1]! - BACKGROUND[1]) +
        Math.abs(rgba[i + 2]! - BACKGROUND[2]);
      if (delta > 12) differing += 1;
    }
    expect(differing / (width * height)).toBeGreaterThanOrEqual(MIN_DIFFERING_PIXELS);
    expect(errors).toEqual([]);
  });

  test('caps the pixel ratio at 1.5 even on a 2x display', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await open3d(page);
    await untilReady(page);
    const { drawing, css } = await page.locator('#hero canvas').evaluate((el) => {
      const canvas = el as HTMLCanvasElement;
      return { drawing: canvas.width, css: canvas.clientWidth };
    });
    expect(drawing).toBeLessThanOrEqual(css * 1.5);
    expect(drawing).toBeGreaterThan(css); // not collapsed to 1x width either: dpr range is [1, 1.5]
    await context.close();
  });

  test('does not move the page when the scene replaces the still', async ({ page }) => {
    const measure = () =>
      page.evaluate(() => {
        const stage = document.querySelector('#hero .hero-stage')!.getBoundingClientRect();
        const next = document.querySelector('main section[id]:not(#hero)')!.getBoundingClientRect();
        return { stageHeight: stage.height, nextTop: next.top + window.scrollY };
      });
    await open3d(page, '?3d=0');
    await expect(hero(page)).toHaveAttribute('data-hero-state', 'idle');
    const before = await measure();
    await open3d(page);
    await untilReady(page);
    const after = await measure();
    expect(Math.abs(after.stageHeight - before.stageHeight)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.nextTop - before.nextTop)).toBeLessThanOrEqual(1);
  });

  test('stops rendering off screen and resumes when visible again', async ({ page }) => {
    await open3d(page, '?3d=1&probe=1');
    await untilReady(page);
    const frames = () => page.evaluate(() => window.__heroRenderCount ?? 0);

    await expect.poll(frames).toBeGreaterThan(0);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('#hero')).not.toBeInViewport();
    await page.waitForTimeout(500); // let the last in-flight frame land
    const paused = await frames();
    await page.waitForTimeout(600);
    expect(await frames()).toBe(paused);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(frames).toBeGreaterThan(paused);
  });

  test('reverts to static with load-failed when the scene chunk is blocked', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/DeskExperience*.js', (route) => route.abort());
    await open3d(page);
    await expect(hero(page)).toHaveAttribute('data-hero-reason', 'load-failed');
    await expect(hero(page)).toHaveAttribute('data-hero-mode', 'static');
    await expect(hero(page)).toHaveAttribute('data-hero-state', 'error');
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.locator('h1')).toBeVisible();
    await expect(hero(page).getByRole('textbox')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('reverts to static when the model fails to load', async ({ page }) => {
    await page.route('**/hero-desk.glb', (route) => route.abort());
    await open3d(page);
    await expect(hero(page)).toHaveAttribute('data-hero-reason', 'load-failed');
    await expect(hero(page)).toHaveAttribute('data-hero-mode', 'static');
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  test('keeps the text and the static hero while the scene chunk is slow', async ({ page }) => {
    await page.route('**/DeskExperience*.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_500));
      await route.continue();
    });
    await open3d(page);
    await expect(page.locator('h1')).toBeVisible();
    await expect(hero(page)).toHaveAttribute('data-hero-mode', 'static');
    await expect(hero(page)).toHaveAttribute('data-hero-state', 'loading');
    await expect(page.locator('canvas')).toHaveCount(0);
    await untilReady(page);
    await expect(hero(page)).toHaveAttribute('data-hero-mode', '3d');
  });

  test('returns to static when the WebGL context is lost', async ({ page }) => {
    await open3d(page);
    await untilReady(page);
    await page.evaluate(() => {
      const canvas = document.querySelector('#hero canvas') as HTMLCanvasElement;
      const gl = canvas.getContext('webgl2')!;
      gl.getExtension('WEBGL_lose_context')!.loseContext();
    });
    await expect(hero(page)).toHaveAttribute('data-hero-reason', 'load-failed');
    await expect(hero(page)).toHaveAttribute('data-hero-mode', 'static');
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  test('shows a boot loader while the model downloads, then removes it', async ({ page }) => {
    await page.route('**/hero-desk.glb', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      await route.continue();
    });
    await open3d(page);
    const loader = page.locator('[data-hero-loader]');
    await expect(loader).toBeVisible();
    await expect(loader).toContainText('%');
    await expect(page.locator('h1')).toBeVisible();
    await untilReady(page);
    await expect(loader).toHaveCount(0);
  });

  test('falls back to static with low-fps when the floor tier stays too slow, once and unsaved', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    // Deterministic slowness: every animation frame is held back ~90 ms (about 10 fps).
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) =>
        window.setTimeout(() => raf(callback), 90) as unknown as number;
    });
    await open3d(page);
    await expect(hero(page)).toHaveAttribute('data-hero-reason', 'low-fps', {
      timeout: LOW_FPS_TIMEOUT,
    });
    await expect(hero(page)).toHaveAttribute('data-hero-mode', 'static');
    await expect(hero(page)).toHaveAttribute('data-hero-state', 'idle');
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.locator('h1')).toBeVisible();
    await expect(hero(page).getByRole('textbox')).toBeVisible();
    // The revert is not a user choice: nothing is stored for the next visit.
    const stored = await page.evaluate(() => window.localStorage.getItem('jhomove:hero-mode'));
    expect(stored).toBe('1'); // only the explicit ?3d=1 query was persisted, never an "off"
    expect(errors).toEqual([]);
  });

  test('the toggle switches 3D off, removing the canvas', async ({ page }) => {
    await open3d(page);
    await untilReady(page);
    const toggle = hero(page).locator('button[data-hero-toggle]');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await toggle.click();
    await expect(hero(page)).toHaveAttribute('data-hero-mode', 'static');
    await expect(hero(page)).toHaveAttribute('data-hero-reason', 'override-off');
    await expect(page.locator('canvas')).toHaveCount(0);
  });
});
