import { expect, test } from '@playwright/test';
import { stubWebgl2 } from './helpers';
import { decodePng } from './png';
import { accentRatio } from '../src/lib/visual/accent-ratio';

// The 3D shot needs real WebGL2: `--enable-unsafe-swiftshader` only allows a software fallback on
// machines without a GPU. The static shots stub WebGL2 away, so the flag is harmless to them.
test.use({ launchOptions: { args: ['--enable-unsafe-swiftshader'] } });

const LOCALES = ['es', 'en'] as const;
/** Terminal/neon budget: the accent covers at most ~10% of the surface. */
const MAX_ACCENT_RATIO = 0.1;
/** The 3D scene may spend a little more (the lit screen and bloom): at most 15% (S7). */
const MAX_ACCENT_RATIO_3D = 0.15;
const READY_TIMEOUT = 25_000;

for (const locale of LOCALES) {
  test(`full page /${locale}/ stays within the accent budget`, async ({ page }, testInfo) => {
    // The static shots stub WebGL2 away; the 3D shot is the separate test below.
    await stubWebgl2(page, 'none');
    await page.goto(`/${locale}/`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('#hero')).toHaveAttribute('data-hero-mode', 'static');
    await expect(page.locator('#hero').getByRole('textbox')).toBeVisible();
    const path = `test-results/screens/${testInfo.project.name}-${locale}.png`;
    // CSS scale keeps mobile (dsf 3) captures small enough to decode quickly.
    const png = await page.screenshot({ path, fullPage: true, scale: 'css' });

    const { rgba } = decodePng(png);
    const ratio = accentRatio(rgba);
    console.log(`accent ratio ${testInfo.project.name}-${locale}: ${(ratio * 100).toFixed(3)}%`);
    expect(ratio).toBeLessThanOrEqual(MAX_ACCENT_RATIO);
  });
}

test.describe('3d hero', () => {
  // One scene at a time, like hero-3d.spec.ts.
  test.describe.configure({ retries: 1, mode: 'default' });

  test('stays within the 3d accent budget at 1440', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the 3D shot is taken at 1440 on desktop only');
    await page.goto('/es/?3d=1');
    // A browser without WebGL2 (no GPU, no SwiftShader) reverts the hero to static: skip, loudly.
    const webgl2 = await page.evaluate(
      () => document.createElement('canvas').getContext('webgl2') !== null,
    );
    test.skip(!webgl2, 'WebGL2 is unavailable in this headless browser (no GPU or SwiftShader)');
    await expect(page.locator('#hero')).toHaveAttribute('data-hero-state', 'ready', {
      timeout: READY_TIMEOUT,
    });
    await page.evaluate(() => document.fonts.ready);
    const png = await page.screenshot({
      path: `test-results/screens/${testInfo.project.name}-es-3d.png`,
      scale: 'css',
    });

    const ratio = accentRatio(decodePng(png).rgba);
    console.log(`accent ratio ${testInfo.project.name}-es-3d: ${(ratio * 100).toFixed(3)}%`);
    expect(ratio).toBeLessThanOrEqual(MAX_ACCENT_RATIO_3D);
  });
});
