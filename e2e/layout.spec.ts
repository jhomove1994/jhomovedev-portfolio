import { expect, test } from '@playwright/test';

const LOCALES = [
  { locale: 'es', other: 'en', ogLocale: 'es_CO', ogAlternate: 'en_US' },
  { locale: 'en', other: 'es', ogLocale: 'en_US', ogAlternate: 'es_CO' },
] as const;

for (const { locale, other, ogLocale, ogAlternate } of LOCALES) {
  test.describe(`/${locale}/`, () => {
    test('serves a localized document with one heading', async ({ page }) => {
      const response = await page.goto(`/${locale}/`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).not.toBeEmpty();
      await expect(page.locator('main')).toHaveCount(1);
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
      // Each locale shares its own absolute image URL, rendered as a large Twitter card.
      expect(await content('meta[property="og:image"]')).toMatch(
        new RegExp(`^https://[^/]+/uploads/og-jhonatan-moreno-${locale}\\.png$`),
      );
      expect(await content('meta[name="twitter:card"]')).toBe('summary_large_image');
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

for (const locale of ['es', 'en'] as const) {
  test(`/${locale}/ section titles never collide with their content`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    const sections = page.locator('main section[id]:not(#hero)');
    const count = await sections.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const section = sections.nth(i);
      const title = section.locator('> [data-section-head] > h2').first();
      const content = section.locator('> :not([data-section-head])').first();
      const id = await section.getAttribute('id');
      const [t, c] = await Promise.all([title.boundingBox(), content.boundingBox()]);
      expect(t, `#${id} title`).not.toBeNull();
      expect(c, `#${id} content`).not.toBeNull();
      // Titles must not spill out of their own box...
      const clipped = await title.evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(clipped, `#${id} title overflows its box`).toBeLessThanOrEqual(0);
      // ...and keep a visible gap: beside the content (side by side) or above it (stacked).
      const stacked = c!.y >= t!.y + t!.height - 1;
      const gap = stacked ? c!.y - (t!.y + t!.height) : c!.x - (t!.x + t!.width);
      expect(gap, `#${id} gap to content`).toBeGreaterThanOrEqual(16);
    }
  });
}

for (const locale of ['es', 'en'] as const) {
  test(`/${locale}/ hero is full-bleed, in view and never overflows`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    const { viewport, overflow } = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(overflow).toBeLessThanOrEqual(0);

    const hero = await page.locator('#hero').boundingBox();
    expect(hero?.width).toBeCloseTo(viewport, 0);
    // The remaining sections keep their reading column; only the hero spans the viewport.
    const about = await page.locator('section#about').boundingBox();
    expect(about?.width).toBeLessThan(viewport - 16);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('main#main #hero')).toHaveCount(1);
  });

  test(`/${locale}/ hero keeps its terminal inside the stage`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    const stage = await page.locator('.hero-stage').boundingBox();
    const terminal = await page.locator('#hero .term').boundingBox();
    expect(terminal).not.toBeNull();
    expect(terminal!.x).toBeGreaterThanOrEqual(stage!.x - 1);
    expect(terminal!.x + terminal!.width).toBeLessThanOrEqual(stage!.x + stage!.width + 1);
    expect(terminal!.y).toBeGreaterThanOrEqual(stage!.y - 1);
    expect(terminal!.y + terminal!.height).toBeLessThanOrEqual(stage!.y + stage!.height + 1);
    // Readable size at both viewports.
    expect(terminal!.height).toBeGreaterThanOrEqual(280);
  });
}

test('--header-h matches the sticky header height where the stage is viewport-sized', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the stage only uses --header-h from 1024px');
  await page.goto('/es/');
  const { token, header } = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.height = 'var(--header-h)';
    document.body.appendChild(probe);
    const token = probe.getBoundingClientRect().height;
    probe.remove();
    return { token, header: document.querySelector('header')!.getBoundingClientRect().height };
  });
  expect(Math.abs(token - header)).toBeLessThanOrEqual(1);
});
