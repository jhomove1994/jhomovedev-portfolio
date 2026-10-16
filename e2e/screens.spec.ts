import { expect, test } from '@playwright/test';
import { decodePng } from './png';
import { accentRatio } from '../src/lib/visual/accent-ratio';

const LOCALES = ['es', 'en'] as const;
/** Terminal/neon budget: the accent covers at most ~10% of the surface. */
const MAX_ACCENT_RATIO = 0.1;

for (const locale of LOCALES) {
  test(`full page /${locale}/ stays within the accent budget`, async ({ page }, testInfo) => {
    await page.goto(`/${locale}/`);
    await page.evaluate(() => document.fonts.ready);
    const path = `test-results/screens/${testInfo.project.name}-${locale}.png`;
    // CSS scale keeps mobile (dsf 3) captures small enough to decode quickly.
    const png = await page.screenshot({ path, fullPage: true, scale: 'css' });

    const { rgba } = decodePng(png);
    const ratio = accentRatio(rgba);
    console.log(`accent ratio ${testInfo.project.name}-${locale}: ${(ratio * 100).toFixed(3)}%`);
    expect(ratio).toBeLessThanOrEqual(MAX_ACCENT_RATIO);
  });
}
