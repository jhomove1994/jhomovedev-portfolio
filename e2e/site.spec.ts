import { expect, test } from '@playwright/test';
import { seededProfile, type PageLocale } from './helpers';

const LOCALES: PageLocale[] = ['es', 'en'];
const SECTIONS = ['about', 'path', 'experience', 'certifications', 'contact'];

test.describe('admin entry point', () => {
  test('is not indexable and loads the CMS script', async ({ page }) => {
    // The CMS bundle comes from a third-party CDN; the test only asserts the tag is wired.
    await page.route('https://unpkg.com/**', (route) => route.abort());
    const response = await page.goto('/admin/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('script[src*="sveltia-cms"]')).toHaveCount(1);
  });

  test('robots.txt disallows /admin', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toMatch(/^User-agent:\s*\*/m);
    expect(body).toMatch(/^Disallow:\s*\/admin\/?\s*$/m);
  });

  test('serves the CMS config', async ({ request }) => {
    const response = await request.get('/admin/config.yml');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('backend:');
  });
});

for (const locale of LOCALES) {
  test.describe(`site baseline /${locale}/`, () => {
    test('shows every section and the mailto link without JavaScript', async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(`/${locale}/`);
      await expect(page.locator('h1')).toHaveText(seededProfile(locale).name);
      for (const id of SECTIONS) {
        await expect(page.locator(`section#${id}`), `section #${id}`).toBeVisible();
      }
      await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible();
      await context.close();
    });

    test('ships no form, phone link or WhatsApp entry point', async ({ page }) => {
      await page.goto(`/${locale}/`);
      await expect(page.locator('form')).toHaveCount(0);
      await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
      await expect(page.locator('a[href*="wa.me"], a[href*="whatsapp"]')).toHaveCount(0);
    });

    test('has a single h1 and no horizontal overflow', async ({ page }) => {
      await page.goto(`/${locale}/`);
      await expect(page.locator('h1')).toHaveCount(1);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}
