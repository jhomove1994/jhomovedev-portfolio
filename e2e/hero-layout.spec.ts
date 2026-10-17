import { expect, test, type Page } from '@playwright/test';
import { stubWebgl2 } from './helpers';

// Hero composition per width: terminal-first under 768px, desk scene from 768px.

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
