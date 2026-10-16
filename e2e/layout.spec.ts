import { expect, test } from '@playwright/test';

const LOCALES = [
  { locale: 'es', other: 'en', ogLocale: 'es_CO', ogAlternate: 'en_US' },
  { locale: 'en', other: 'es', ogLocale: 'en_US', ogAlternate: 'es_CO' },
] as const;

for (const { locale, other, ogLocale, ogAlternate } of LOCALES) {
  test.describe(`/${locale}/`, () => {
    test('serves a localized document with one heading', async ({ page }, testInfo) => {
      const response = await page.goto(`/${locale}/`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).not.toBeEmpty();
      await expect(page.locator('main')).toHaveCount(1);
      await page.screenshot({
        path: `test-results/screens/${testInfo.project.name}-${locale}.png`,
        fullPage: true,
      });
    });

    test('declares canonical, hreflang trio and Open Graph metadata', async ({ page }) => {
      await page.goto(`/${locale}/`);
      const href = (selector: string) => page.locator(selector).getAttribute('href');
      const content = (selector: string) => page.locator(selector).getAttribute('content');

      const canonical = await href('link[rel="canonical"]');
      expect(canonical).toMatch(new RegExp(`^https://[^/]+/${locale}/$`));
      expect(await href('link[rel="alternate"][hreflang="es"]')).toMatch(/\/es\/$/);
      expect(await href('link[rel="alternate"][hreflang="en"]')).toMatch(/\/en\/$/);
      expect(await href('link[rel="alternate"][hreflang="x-default"]')).toMatch(
        /^https:\/\/[^/]+\/$/,
      );
      expect(await href(`link[rel="alternate"][hreflang="${other}"]`)).toMatch(
        new RegExp(`/${other}/$`),
      );

      expect(await content('meta[property="og:locale"]')).toBe(ogLocale);
      expect(await content('meta[property="og:locale:alternate"]')).toBe(ogAlternate);
      expect(await content('meta[property="og:title"]')).toBeTruthy();
      expect(await content('meta[name="description"]')).toBeTruthy();
      // No media.ogImage is uploaded yet: an empty og:image must never be emitted.
      await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
    });

    test('loads the self-hosted fonts without third-party requests', async ({ page }) => {
      const external: string[] = [];
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.hostname !== 'localhost') external.push(request.url());
      });
      await page.goto(`/${locale}/`);
      await page.evaluate(() => document.fonts.ready);
      expect(external).toEqual([]);
      const family = await page.locator('h1').evaluate((el) => getComputedStyle(el).fontFamily);
      expect(family).toContain('Space Grotesk Variable');
    });
  });
}

test('the 404 page links to both languages and is not indexable', async ({ page }) => {
  // The platform serves this document with status 404 for unknown paths (asserted with the
  // on-demand worker in redirect.spec.ts); here the document itself is checked.
  await page.goto('/404');
  await expect(page.locator('a[href="/es/"]')).toBeVisible();
  await expect(page.locator('a[href="/en/"]')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('link[rel="alternate"]')).toHaveCount(0);
});
