import { expect, test, type Page } from '@playwright/test';
import { terminalLabels } from '../src/i18n/ui';
import { COMMAND_NAMES } from '../src/lib/terminal/types';
import { seededProfile } from './helpers';
import { decodePng } from './png';

// Real WebGL2 is needed: no stubs here. `--enable-unsafe-swiftshader` only allows a software
// fallback on machines without a GPU; it never forces software rendering.
test.use({ launchOptions: { args: ['--enable-unsafe-swiftshader'] } });
// One real WebGL scene at a time: four of them in parallel starve each other and the ready budget.
test.describe.configure({ retries: 1, mode: 'default' });

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
        // The zoom holds the hero for extra scroll distance below it by design; the stage itself
        // and everything above the fold must not move.
        const wrap = document.querySelector('.hero-pin');
        const hold = document.getElementById('hero')!;
        const pinned = wrap
          ? wrap.getBoundingClientRect().height - hold.getBoundingClientRect().height
          : 0;
        return { stageHeight: stage.height, nextTop: next.top + window.scrollY - pinned };
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

const labels = terminalLabels('es');
const profile = seededProfile('es');

/** Opens the 3D hero and waits until the scene is up; returns the terminal on the monitor. */
async function openMonitor(page: Page, query = '?3d=1') {
  await open3d(page, query);
  await untilReady(page);
  const input = hero(page).getByRole('textbox', { name: labels.inputLabel });
  await expect(input).toBeVisible();
  return {
    input,
    log: hero(page).getByRole('log'),
    windows: hero(page).getByRole('navigation', { name: labels.windowsLabel }),
    async run(command: string) {
      await input.fill(command);
      await input.press('Enter');
    },
  };
}

/** The hero text and the first lines print the finished intro, so settle before measuring. */
const introDone = (page: Page) =>
  expect(hero(page).locator('.term-live')).toHaveAttribute('data-typing', 'false', {
    timeout: 10_000,
  });

test.describe('@3d terminal', () => {
  test('the monitor is the terminal: the 2D frame is gone and there is one session surface', async ({
    page,
  }) => {
    const term = await openMonitor(page);
    await expect(hero(page).locator('.hero-frame')).toHaveCount(0);
    await expect(hero(page).getByRole('log')).toHaveCount(1);
    await expect(hero(page).getByRole('textbox')).toHaveCount(1);
    await expect(hero(page).locator('.hero-screen-layer .monitor-terminal')).toBeVisible();
    // The layer is not inside the aria-hidden canvas wrapper, so the terminal stays accessible.
    await expect(page.locator('.hero-canvas [role="log"]')).toHaveCount(0);
    await expect(term.log).toBeVisible();
  });

  test('typing whoami and Enter prints the profile text', async ({ page }) => {
    const term = await openMonitor(page);
    await introDone(page);
    const printed = term.log.getByText(profile.whoami);
    await expect(printed).toHaveCount(1); // the intro's own whoami
    await term.run('whoami');
    await expect(printed).toHaveCount(2);
    await expect(term.input).toHaveValue('');
  });

  test('help lists the same commands, in the page language, as the static terminal', async ({
    page,
  }) => {
    const term = await openMonitor(page);
    await introDone(page);
    await term.run('help');
    await expect(term.log).toContainText(labels.helpIntro);
    for (const name of COMMAND_NAMES) {
      await expect(term.log).toContainText(`${name}  ${labels.commands[name]}`);
    }
  });

  test('the box lands on the rendered glass: same bounds as the lit screen within 3 px', async ({
    page,
  }) => {
    await openMonitor(page);
    await introDone(page);
    // Ground truth is the pixels: hide the terminal, find the lit glass in the canvas, compare.
    const canvas = hero(page).locator('canvas');
    const box = await page.evaluate(() => {
      const c = document.querySelector('#hero canvas')!.getBoundingClientRect();
      const r = document.querySelector('.monitor-terminal')!.getBoundingClientRect();
      return {
        left: r.left - c.left,
        top: r.top - c.top,
        right: r.right - c.left,
        bottom: r.bottom - c.top,
      };
    });
    await page.addStyleTag({ content: '.monitor-terminal{visibility:hidden !important}' });
    const { width, height, rgba } = decodePng(await canvas.screenshot());
    const lit = (x: number, y: number) => {
      const i = (y * width + x) * 4;
      return rgba[i + 1]! > 80 && rgba[i + 1]! > rgba[i]! + 40;
    };
    // Walk out from the middle of the box until the lit glass ends on each side.
    const cx = Math.round((box.left + box.right) / 2);
    const cy = Math.round((box.top + box.bottom) / 2);
    expect(lit(cx, cy)).toBe(true); // the glass is there
    let left = cx;
    let right = cx;
    let top = cy;
    let bottom = cy;
    while (left > 0 && lit(left - 1, cy)) left -= 1;
    while (right < width - 1 && lit(right + 1, cy)) right += 1;
    while (top > 0 && lit(cx, top - 1)) top -= 1;
    while (bottom < height - 1 && lit(cx, bottom + 1)) bottom += 1;
    expect(Math.abs(box.left - left)).toBeLessThanOrEqual(3);
    expect(Math.abs(box.right - (right + 1))).toBeLessThanOrEqual(3);
    expect(Math.abs(box.top - top)).toBeLessThanOrEqual(3);
    expect(Math.abs(box.bottom - (bottom + 1))).toBeLessThanOrEqual(3);
  });

  test('keeps the 2D frame and no monitor terminal below 1024 px', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await open3d(page);
    // Stacked layout: the island sits under the still and hydrates once it scrolls into view.
    await hero(page).locator('.hero-monitor').scrollIntoViewIfNeeded();
    await untilReady(page);
    await expect(hero(page).locator('.hero-frame')).toBeVisible();
    await expect(hero(page).locator('.monitor-terminal')).toHaveCount(0);
    await expect(hero(page).getByRole('textbox')).toHaveCount(1);
  });

  test('types the intro on first show, then idles at the prompt', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __typed?: boolean };
      new MutationObserver(() => {
        if (document.querySelector('.term-live[data-typing="true"]')) w.__typed = true;
      }).observe(document, { subtree: true, childList: true, attributes: true });
    });
    const term = await openMonitor(page);
    await introDone(page);
    expect(await page.evaluate(() => (window as unknown as { __typed?: boolean }).__typed)).toBe(
      true,
    );
    await expect(term.log).toContainText(profile.whoami);
    await expect(term.input).toBeVisible();
    await expect(term.input).toHaveValue('');
  });

  test('a keypress while the intro types completes it at once', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as {
        __skip?: { typingAfter: string | undefined; draft: string };
      };
      const observer = new MutationObserver(() => {
        if (!document.querySelector('.term-live[data-typing="true"]')) return;
        const input = document.querySelector<HTMLInputElement>('.monitor-terminal .term-input');
        if (!input) return;
        observer.disconnect();
        input.focus();
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
        // React flushes the store update right after the handler: look a moment later, well
        // inside the ~700 ms the intro would otherwise take.
        window.setTimeout(() => {
          w.__skip = {
            typingAfter: document.querySelector<HTMLElement>('.term-live')?.dataset.typing,
            draft: input.value,
          };
        }, 60);
      });
      observer.observe(document, { subtree: true, childList: true, attributes: true });
    });
    const term = await openMonitor(page);
    await page.waitForFunction(() => (window as unknown as { __skip?: unknown }).__skip);
    const skip = await page.evaluate(
      () => (window as unknown as { __skip?: { typingAfter?: string } }).__skip,
    );
    expect(skip?.typingAfter).toBe('false');
    await expect(term.log).toContainText(profile.whoami);
    await expect(term.input).toBeVisible();
  });

  test('does not take the focus on its own', async ({ page }) => {
    await openMonitor(page);
    await introDone(page);
    const focusedInput = await page.evaluate(
      () => document.activeElement?.classList.contains('term-input') === true,
    );
    expect(focusedInput).toBe(false);
  });

  test('hands a focused, half-typed 2D prompt over to the monitor, keeping the draft', async ({
    page,
  }) => {
    await page.route('**/DeskExperience*.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_500));
      await route.continue();
    });
    await open3d(page);
    const twoD = hero(page).getByRole('textbox', { name: labels.inputLabel });
    await twoD.click();
    await twoD.pressSequentially('proj');
    await untilReady(page);
    const monitor = hero(page).locator('.monitor-terminal').getByRole('textbox');
    await expect(monitor).toBeFocused();
    await expect(monitor).toHaveValue('proj');
    await page.keyboard.type('ects');
    await page.keyboard.press('Enter');
    await expect(hero(page).getByRole('log')).toContainText(/projects|proyectos/i);
  });

  test('leaves the focus alone when the 2D prompt was not focused', async ({ page }) => {
    await page.route('**/DeskExperience*.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      await route.continue();
    });
    await open3d(page);
    await expect(hero(page).getByRole('textbox', { name: labels.inputLabel })).toBeVisible();
    await untilReady(page);
    const monitor = hero(page).locator('.monitor-terminal').getByRole('textbox');
    await expect(monitor).toBeVisible();
    await expect(monitor).not.toBeFocused();
  });

  test('is readable at 1440: lines are at least 10 px tall and the box is a fifth of the stage', async ({
    page,
  }) => {
    const term = await openMonitor(page);
    await introDone(page);
    const lineHeight = await term.log
      .locator('.term-line')
      .first()
      .evaluate((el) => el.getBoundingClientRect().height);
    expect(lineHeight).toBeGreaterThanOrEqual(10);
    const { box, stage } = await page.evaluate(() => ({
      box: document.querySelector('.monitor-terminal')!.getBoundingClientRect().width,
      stage: document.querySelector('.hero-screen-layer')!.getBoundingClientRect().width,
    }));
    expect(box / stage).toBeGreaterThanOrEqual(0.19);
  });

  test('focus and keys behave as in the static terminal: click, Tab, Esc', async ({ page }) => {
    const term = await openMonitor(page);
    await introDone(page);
    await term.input.click();
    await expect(term.input).toBeFocused();
    await term.input.pressSequentially('wh');
    await term.input.press('Tab');
    await expect(term.input).toHaveValue('whoami');
    await expect(term.input).toBeFocused();

    await term.input.fill('');
    await term.input.press('Tab');
    await expect(term.input).not.toBeFocused();
    await expect(term.windows.getByRole('button').first()).toBeFocused();

    await term.input.focus();
    await term.input.press('Escape');
    await expect(term.input).not.toBeFocused();
  });

  test('the camera follows a fine pointer a little: moving across the page changes the view', async ({
    page,
  }) => {
    await openMonitor(page);
    await introDone(page);
    const shot = async (x: number, y: number) => {
      await page.mouse.move(x, y);
      await page.waitForTimeout(1_200); // the rig eases toward the pointer
      return decodePng(await hero(page).locator('canvas').screenshot());
    };
    const left = await shot(5, 450);
    const right = await shot(1435, 450);
    let differing = 0;
    for (let i = 0; i < left.rgba.length; i += 4) {
      const delta =
        Math.abs(left.rgba[i]! - right.rgba[i]!) +
        Math.abs(left.rgba[i + 1]! - right.rgba[i + 1]!) +
        Math.abs(left.rgba[i + 2]! - right.rgba[i + 2]!);
      if (delta > 30) differing += 1;
    }
    expect(differing / (left.width * left.height)).toBeGreaterThan(0.01);
  });
});

/** The terminal box on the glass, in CSS pixels of the viewport. */
const terminalBox = (page: Page) =>
  page.evaluate(() => {
    const r = document.querySelector('.monitor-terminal')!.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });
const htmlHas = (page: Page, name: string) =>
  page.evaluate((cls) => document.documentElement.classList.contains(cls), name);
const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));
const scrollInstantly = (page: Page, y: number) =>
  page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
const sectionTop = (page: Page, id: string) =>
  page.evaluate((target) => document.getElementById(target)!.getBoundingClientRect().top, id);
/** Waits for the box to stop moving: Lenis and the camera both ease. */
async function settled(page: Page) {
  let previous = await terminalBox(page);
  await expect
    .poll(async () => {
      await page.waitForTimeout(250);
      const next = await terminalBox(page);
      const still =
        Math.abs(next.width - previous.width) < 0.5 && Math.abs(next.top - previous.top) < 0.5;
      previous = next;
      return still;
    })
    .toBe(true);
  return previous;
}
/** Scroll distance of the zoom at 1440x900: 1.2 viewport heights. */
const ZOOM_END = 1080;

test.describe('@3d zoom', () => {
  test('the static hero keeps native smooth scrolling and no Lenis', async ({ page }) => {
    await open3d(page, '?3d=0');
    await expect(hero(page)).toHaveAttribute('data-hero-mode', 'static');
    expect(await htmlHas(page, 'lenis')).toBe(false);
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
    ).toBe('smooth');
    await expect(page.locator('.hero-pin')).toHaveCount(0);
  });

  test('reduced motion stays static: no Lenis and no pin', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open3d(page);
    await expect(hero(page)).toHaveAttribute('data-hero-mode', 'static');
    expect(await htmlHas(page, 'lenis')).toBe(false);
    await expect(page.locator('.hero-pin')).toHaveCount(0);
  });

  test('the 3D hero runs Lenis, pins the hero and turns native smooth scrolling off', async ({
    page,
  }) => {
    await openMonitor(page);
    await expect.poll(() => htmlHas(page, 'lenis')).toBe(true);
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
    ).toBe('auto');
    await expect(page.locator('.hero-pin')).toHaveCount(1);
  });

  test('at the end of the range the terminal covers 60% of the viewport width and still works', async ({
    page,
  }) => {
    const term = await openMonitor(page);
    await introDone(page);
    await scrollInstantly(page, ZOOM_END);
    const end = await settled(page);
    expect(end.width).toBeGreaterThanOrEqual(0.6 * 1440);
    await term.run('whoami');
    await expect(term.log).toContainText(profile.whoami.slice(0, 20));
    await term.input.click();
    await expect(term.input).toBeFocused();
  });

  test('scrolling back restores the rest framing within 2 px', async ({ page }) => {
    await openMonitor(page);
    await introDone(page);
    const rest = await settled(page);
    await scrollInstantly(page, ZOOM_END);
    await settled(page);
    await scrollInstantly(page, 0);
    const back = await settled(page);
    for (const key of ['left', 'top', 'width', 'height'] as const) {
      expect(Math.abs(back[key] - rest[key])).toBeLessThanOrEqual(2);
    }
  });

  test('past the range the next section follows the hero with no gap', async ({ page }) => {
    await openMonitor(page);
    await scrollInstantly(page, ZOOM_END + 400);
    await page.waitForTimeout(500);
    const { heroBottom, nextTop } = await page.evaluate(() => ({
      heroBottom: document.getElementById('hero')!.getBoundingClientRect().bottom,
      nextTop: document.querySelector('main section[id]:not(#hero)')!.getBoundingClientRect().top,
    }));
    expect(heroBottom).toBeGreaterThan(0);
    expect(nextTop - heroBottom).toBeGreaterThanOrEqual(0);
    expect(nextTop - heroBottom).toBeLessThanOrEqual(100);
  });

  test('a header anchor brings its section into view, clear of the sticky header', async ({
    page,
  }) => {
    await openMonitor(page);
    await page.locator('header nav a[href="#experience"]').click();
    const header = await page.evaluate(
      () => document.querySelector('header')!.getBoundingClientRect().bottom,
    );
    // The section keeps its own scroll-margin-top below the header: in view, never under it.
    await expect
      .poll(async () => await sectionTop(page, 'experience'))
      .toBeGreaterThanOrEqual(header);
    await expect.poll(async () => await sectionTop(page, 'experience')).toBeLessThan(header + 100);
    await page.waitForTimeout(800);
    expect(await sectionTop(page, 'experience')).toBeGreaterThanOrEqual(header);
    await expect(page).toHaveURL(/#experience$/);
    await expect(page.locator('#experience')).toBeFocused();
  });

  test('the skip link jumps to main and moves the focus there', async ({ page }) => {
    await openMonitor(page);
    await scrollInstantly(page, 300);
    await page.locator('a[href="#main"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });

  test('the experience command scrolls to the section through the same scroller', async ({
    page,
  }) => {
    const term = await openMonitor(page);
    await introDone(page);
    await term.run('experience');
    await expect
      .poll(async () => Math.round(await sectionTop(page, 'experience')))
      .toBeLessThan(200);
    expect(await scrollY(page)).toBeGreaterThan(ZOOM_END);
  });

  test('a hash on load shows its section', async ({ page }) => {
    await page.goto('/en/?3d=1#experience');
    await expect.poll(async () => Math.abs(await sectionTop(page, 'experience'))).toBeLessThan(120);
    expect(await scrollY(page)).toBeGreaterThan(0);
  });

  test('the wheel over the terminal log scrolls the log, not the page', async ({ page }) => {
    const term = await openMonitor(page);
    await introDone(page);
    for (let i = 0; i < 3; i += 1) await term.run('help');
    const log = await hero(page).locator('.term-scroll').first().elementHandle();
    const box = (await log!.boundingBox())!;
    const before = await log!.evaluate((el) => el.scrollTop);
    expect(before).toBeGreaterThan(0);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -120);
    await expect.poll(() => log!.evaluate((el) => el.scrollTop)).toBeLessThan(before);
    expect(await scrollY(page)).toBe(0);
  });

  test('switching 3D off removes Lenis, the pin and the zoom', async ({ page }) => {
    await openMonitor(page);
    await expect.poll(() => htmlHas(page, 'lenis')).toBe(true);
    await scrollInstantly(page, 400);
    await hero(page).locator('button[data-hero-toggle]').click();
    await expect(hero(page)).toHaveAttribute('data-hero-mode', 'static');
    await expect.poll(() => htmlHas(page, 'lenis')).toBe(false);
    await expect(page.locator('.hero-pin')).toHaveCount(0);
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
    ).toBe('smooth');
    expect(
      await page.evaluate(() => document.querySelector<HTMLElement>('.hero-copy')!.style.opacity),
    ).toBe('');
  });
});
