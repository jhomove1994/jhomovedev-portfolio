import { expect, test, type Page } from '@playwright/test';
import { stubWebgl2 } from './helpers';
import { decodePng } from './png';

// Hero composition per width: terminal-first under 768px, desk scene from 768px.
// The 3D block needs real WebGL2; the flag only allows a software fallback without a GPU.
test.use({ launchOptions: { args: ['--enable-unsafe-swiftshader'] } });

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

const box = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el): Box => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      };
    });

const COPY = ['#hero-title', '.hero-headline', '.hero-place', '.hero-cta'] as const;
const TERMINAL_PARTS = [
  '.hero-frame .term-scroll',
  '.hero-frame .term-status',
  '.hero-frame .term-tmux',
];
/** Terminal frame height floor on a phone: a few log lines plus both status bars. */
const MIN_FRAME_HEIGHT = 288;

test.describe('terminal-first hero under 768px', () => {
  for (const motion of ['no-preference', 'reduce'] as const) {
    for (const locale of ['es', 'en'] as const) {
      test(`${locale}, motion ${motion}: copy then a whole terminal in the first viewport`, async ({
        page,
      }, testInfo) => {
        test.skip(testInfo.project.name !== 'mobile', 'phone viewport');
        await stubWebgl2(page, 'hardware');
        await page.emulateMedia({ reducedMotion: motion });
        await page.goto(`/${locale}/?3d=1`);
        await expect(page.locator('.hero-frame').getByRole('textbox')).toBeVisible();
        const viewport = page.viewportSize()!;

        // No desk on a phone: no still, no canvas, no toggle.
        await expect(page.locator('.hero-still')).toBeHidden();
        await expect(page.locator('#hero canvas')).toHaveCount(0);
        await expect(page.locator('[data-hero-toggle]')).toHaveCount(0);

        const header = await box(page, 'header');
        const frame = await box(page, '.hero-frame');
        let previousBottom = header.bottom;
        for (const selector of COPY) {
          const part = await box(page, selector);
          expect(part.height, selector).toBeGreaterThan(0);
          expect(part.top, selector).toBeGreaterThanOrEqual(previousBottom - 0.5);
          previousBottom = part.bottom;
        }
        // Full width, right below the copy and entirely inside the first viewport.
        expect(frame.top).toBeGreaterThanOrEqual(previousBottom);
        expect(frame.bottom).toBeLessThanOrEqual(viewport.height);
        expect(frame.width / viewport.width).toBeGreaterThan(0.85);
        expect(frame.height).toBeGreaterThanOrEqual(MIN_FRAME_HEIGHT);

        // Log, statusline and tmux bar are stacked inside the frame, none clipped or overlapping.
        let partTop = frame.top;
        for (const selector of TERMINAL_PARTS) {
          const part = await box(page, selector);
          expect(part.height, selector).toBeGreaterThan(16);
          expect(part.top, selector).toBeGreaterThanOrEqual(partTop - 0.5);
          expect(part.bottom, selector).toBeLessThanOrEqual(frame.bottom + 0.5);
          partTop = part.bottom;
        }
        // The log keeps room for the transcript, not just the bars.
        expect((await box(page, '.hero-frame .term-scroll')).height).toBeGreaterThan(120);
      });
    }
  }
});

/** Viewports from the redesign brief: tablet, a docked-DevTools laptop, laptop, desktop. */
const WIDE_VIEWPORTS = [
  { width: 768, height: 1024 },
  { width: 1000, height: 700 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
] as const;
/** Every piece of hero copy, one text colour each. */
const COPY_TEXT = ['#hero-title', '.hero-headline', '.hero-place > span', '.hero-cta a'] as const;
const WCAG_AA = 4.5;

const intersects = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * Lowest WCAG contrast between each copy element's text colour and the pixels actually rendered
 * behind it: the copy is made transparent (layout unchanged), then the element's box is captured
 * and every pixel is compared with the text colour. Scene, still, scrim and canvas all count.
 */
async function copyContrast(page: Page): Promise<{ selector: string; ratio: number }[]> {
  const targets: { selector: string; color: string; box: Box }[] = [];
  for (const selector of COPY_TEXT) {
    for (const element of await page.locator(selector).all()) {
      const { color, box: b } = await element.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return {
          color: getComputedStyle(el).color,
          box: {
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
          },
        };
      });
      targets.push({ selector, color, box: b });
    }
  }
  const style = await page.addStyleTag({
    content:
      '.hero-copy, .hero-copy * { color: transparent !important; ' +
      'text-decoration-color: transparent !important; border-color: transparent !important; }',
  });
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (r: number, g: number, b: number) =>
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const results = [];
  for (const { selector, color, box: b } of targets) {
    const [r, g, bl] = color.match(/\d+(\.\d+)?/g)!.map(Number);
    const text = luminance(r!, g!, bl!);
    const png = await page.screenshot({
      clip: { x: b.left, y: b.top, width: Math.max(1, b.width), height: Math.max(1, b.height) },
    });
    const { rgba } = decodePng(png);
    let worst = Infinity;
    for (let i = 0; i < rgba.length; i += 4) {
      const bg = luminance(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!);
      const ratio = (Math.max(text, bg) + 0.05) / (Math.min(text, bg) + 0.05);
      worst = Math.min(worst, ratio);
    }
    results.push({ selector, ratio: worst });
  }
  await style.evaluate((el) => (el as HTMLElement).remove());
  return results;
}

async function expectReadableCopy(page: Page, label: string) {
  const results = await copyContrast(page);
  console.log(
    `contrast ${label}: ${results.map((r) => `${r.selector} ${r.ratio.toFixed(2)}`).join(', ')}`,
  );
  for (const { selector, ratio } of results) {
    expect(ratio, `${label} ${selector}`).toBeGreaterThanOrEqual(WCAG_AA);
  }
}

test.describe('desk scene hero from 768px, static', () => {
  for (const viewport of WIDE_VIEWPORTS) {
    for (const motion of ['no-preference', 'reduce'] as const) {
      test(`${viewport.width}px, motion ${motion}: copy beside the scene, a big terminal on the glass`, async ({
        page,
      }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport');
        await page.setViewportSize(viewport);
        await stubWebgl2(page, motion === 'reduce' ? 'hardware' : 'none');
        await page.emulateMedia({ reducedMotion: motion });
        await page.goto('/es/');
        await expect(page.locator('#hero')).toHaveAttribute('data-hero-mode', 'static');
        await expect(page.locator('.hero-frame').getByRole('textbox')).toBeVisible();

        const still = await box(page, '.hero-still');
        const frame = await box(page, '.hero-frame');
        // The copy never covers the scene (so never the lamp shade).
        for (const selector of COPY) {
          expect(intersects(await box(page, selector), still), selector).toBe(false);
        }
        // The terminal is on the scene, inside the first viewport, wide and with real text sizes.
        expect(frame.left).toBeGreaterThanOrEqual(still.left - 0.5);
        expect(frame.right).toBeLessThanOrEqual(still.right + 0.5);
        expect(frame.top).toBeGreaterThanOrEqual(still.top - 0.5);
        expect(frame.bottom).toBeLessThanOrEqual(Math.min(still.bottom, viewport.height) + 0.5);
        expect(frame.width).toBeGreaterThanOrEqual(440);
        expect(frame.width / still.width).toBeGreaterThan(0.65);
        expect(frame.height).toBeGreaterThanOrEqual(MIN_FRAME_HEIGHT);
        const fontSize = await page
          .locator('.hero-frame .term-line')
          .first()
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        expect(fontSize).toBeGreaterThanOrEqual(13);
        for (const selector of TERMINAL_PARTS) {
          const part = await box(page, selector);
          expect(part.bottom, selector).toBeLessThanOrEqual(frame.bottom + 0.5);
        }

        await expectReadableCopy(page, `static ${motion} ${viewport.width}`);
      });
    }
  }
});

let webgl2Available = true;

test.describe('desk scene hero from 768px, 3D', () => {
  // Real WebGL, one scene at a time (see hero-3d.spec.ts).
  test.describe.configure({ retries: 1, mode: 'default' });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    webgl2Available = await page.evaluate(
      () => document.createElement('canvas').getContext('webgl2') !== null,
    );
    await page.close();
  });

  for (const viewport of WIDE_VIEWPORTS) {
    test(`${viewport.width}px: readable copy beside the canvas, terminal on the monitor`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport');
      test.skip(!webgl2Available, 'WebGL2 is unavailable in this headless browser');
      await page.setViewportSize(viewport);
      await page.goto('/es/?3d=1');
      await expect(page.locator('#hero')).toHaveAttribute('data-hero-state', 'ready', {
        timeout: 25_000,
      });
      await expect(page.locator('.monitor-terminal[data-placed]')).toHaveCount(1);
      await expect(page.locator('.hero-frame')).toHaveCount(0);
      // The canvas element is as wide as the final zoom frame; what shows at rest is the still's box.
      const canvas = await box(page, '#hero .hero-still');
      for (const selector of COPY) {
        expect(intersects(await box(page, selector), canvas), selector).toBe(false);
      }
      // Let the canvas cross-fade settle before sampling what is behind the copy.
      await page.waitForTimeout(500);
      await expectReadableCopy(page, `3d ${viewport.width}`);
    });
  }
});
