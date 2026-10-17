import { expect, test, type Page } from '@playwright/test';

// Phones have no still (terminal-first, see hero-layout.spec.ts); these cover 768px and up.
import { stubWebgl2 } from './helpers';

// The static hero (no WebGL2): the 2D terminal sits on the monitor glass of the committed still.
test.beforeEach(async ({ page }) => {
  await stubWebgl2(page, 'none');
});

const rect = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const r = document.querySelector(sel)!.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }, selector);

test.describe('static hero still', () => {
  test('wide: the terminal is on the glass and the desk stays visible around it', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'wide layout');
    await page.goto('/es/');
    const stage = await rect(page, '.hero-still');
    const frame = await rect(page, '.hero-frame');
    // A monitor-sized frame, not the whole still: the desk, lamp and keyboard show around it.
    expect(frame.width / stage.width).toBeGreaterThan(0.38);
    expect(frame.width / stage.width).toBeLessThan(0.55);
    expect(frame.height / stage.height).toBeLessThan(0.55);
    expect(frame.left - stage.left).toBeGreaterThan(0.3 * stage.width);
    expect(frame.top + frame.height).toBeLessThan(stage.top + 0.85 * stage.height);
    // The terminal text is readable: a line is at least 12 px tall.
    const lineHeight = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.querySelector('.hero-frame .term-row')!).lineHeight),
    );
    expect(lineHeight).toBeGreaterThanOrEqual(12);
  });

  test('tablet: the frame sits on the cropped still within the first viewport', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'sets its own viewport');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/es/');
    const still = await rect(page, '.hero-still');
    const frame = await rect(page, '.hero-frame');
    expect(frame.top + frame.height).toBeLessThanOrEqual(1024);
    expect(frame.top).toBeGreaterThanOrEqual(still.top);
    expect(frame.top + frame.height).toBeLessThanOrEqual(still.top + still.height);
    expect(frame.left).toBeGreaterThanOrEqual(still.left);
    expect(frame.left + frame.width).toBeLessThanOrEqual(still.left + still.width + 0.5);
  });
});
