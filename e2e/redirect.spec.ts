import { expect, test } from '@playwright/test';

const redirect = (headers: Record<string, string>) => ({ headers, maxRedirects: 0 });

test.describe('root redirect by Accept-Language', () => {
  test('sends English browsers to /en/', async ({ request }) => {
    const response = await request.get('/', redirect({ 'accept-language': 'en-US,en;q=0.9' }));
    expect(response.status()).toBe(302);
    expect(new URL(response.headers()['location']!, 'http://x').pathname).toBe('/en/');
    expect(response.headers()['vary']).toMatch(/accept-language/i);
    expect(response.headers()['cache-control']).toMatch(/private/);
    expect(response.headers()['cache-control']).toMatch(/no-store/);
  });

  test('sends Spanish browsers to /es/', async ({ request }) => {
    const response = await request.get('/', redirect({ 'accept-language': 'es-CO,es;q=0.9' }));
    expect(response.status()).toBe(302);
    expect(new URL(response.headers()['location']!, 'http://x').pathname).toBe('/es/');
  });

  test('honours q-values over header order', async ({ request }) => {
    const response = await request.get('/', redirect({ 'accept-language': 'es;q=0.3,en;q=0.8' }));
    expect(new URL(response.headers()['location']!, 'http://x').pathname).toBe('/en/');
  });

  test.describe('falls back to /es/', () => {
    for (const [name, header] of [
      ['an unsupported language', 'fr-FR,fr;q=0.9'],
      ['a wildcard', '*'],
      ['garbage', ';;q=abc,,<script>'],
    ] as const) {
      test(`for ${name}`, async ({ request }) => {
        const response = await request.get('/', redirect({ 'accept-language': header }));
        expect(response.status()).toBe(302);
        expect(new URL(response.headers()['location']!, 'http://x').pathname).toBe('/es/');
      });
    }

    test('without the header', async ({ request }) => {
      // Playwright always sends a default Accept-Language, so clear it explicitly.
      const response = await request.get('/', redirect({ 'accept-language': '' }));
      expect(response.status()).toBe(302);
      expect(new URL(response.headers()['location']!, 'http://x').pathname).toBe('/es/');
    });
  });

  test('never reflects request input into the target', async ({ request }) => {
    const response = await request.get(
      '/',
      redirect({ 'accept-language': 'https://evil.example/,en;q=0.1' }),
    );
    expect(response.headers()['location']).toMatch(/^\/(es|en)\/$/);
  });
});

test('unknown locale paths answer 404 with the neutral page', async ({ page }) => {
  const response = await page.goto('/fr/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('a[href="/es/"]')).toBeVisible();
  await expect(page.locator('a[href="/en/"]')).toBeVisible();
});

test('localized pages stay static and cacheable', async ({ request }) => {
  const response = await request.get('/en/', { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control'] ?? '').not.toMatch(/no-store/);
});
