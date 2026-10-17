import { gzipSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import { stubWebgl2 } from './helpers';

/** Gzip budget for every script the static first view loads. */
const MAX_GZIP_BYTES = 100 * 1024;

/**
 * Library fingerprints of the lazy 3D stack. Plain `lenis` is deliberately absent: the hero
 * island ships the `data-lenis-prevent` attribute name, which says nothing about the library.
 */
const HEAVY_MARKERS: Record<string, RegExp> = {
  three: /WebGLRenderer/,
  gsap: /ScrollTrigger|GreenSock/,
  lenis: /lenis-smooth|lenis-stopped/,
};

interface LoadedScript {
  url: string;
  gzipBytes: number;
  source: string;
}

/** Opens `/es/` on the static path and returns every script the page actually loaded. */
async function loadStaticPage(page: Page): Promise<{ scripts: LoadedScript[]; origins: string[] }> {
  const pending: Promise<LoadedScript | null>[] = [];
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (!url.pathname.endsWith('.js')) return;
    pending.push(
      response.body().then(
        (body) => ({
          url: url.pathname,
          gzipBytes: gzipSync(body).length,
          source: body.toString('utf8'),
        }),
        () => null,
      ),
    );
  });
  await stubWebgl2(page, 'none');
  await page.goto('/es/');
  // The island is `client:visible`: its input only appears once its scripts ran.
  await expect(page.locator('#hero').getByRole('textbox')).toBeVisible();
  await page.waitForLoadState('networkidle');
  const scripts = (await Promise.all(pending)).filter(
    (script): script is LoadedScript => script !== null,
  );
  return { scripts, origins: [...origins] };
}

test('the static first view stays within the script budget', async ({ page }, testInfo) => {
  const { scripts } = await loadStaticPage(page);
  const total = scripts.reduce((sum, script) => sum + script.gzipBytes, 0);
  console.log(
    `js budget ${testInfo.project.name}: ${scripts.length} scripts, ${(total / 1024).toFixed(1)} KB gzip`,
  );
  expect(scripts.length).toBeGreaterThan(0);
  expect(total).toBeLessThanOrEqual(MAX_GZIP_BYTES);
});

test('no loaded script carries the 3D, scroll-animation or smooth-scroll libraries', async ({
  page,
}) => {
  const { scripts } = await loadStaticPage(page);
  const hits = scripts.flatMap((script) =>
    Object.entries(HEAVY_MARKERS)
      .filter(([, marker]) => marker.test(script.source))
      .map(([library]) => `${library} in ${script.url}`),
  );
  expect(hits).toEqual([]);
});

test('the hero island hydrates when visible and nothing third-party loads', async ({ page }) => {
  const { origins } = await loadStaticPage(page);
  const island = page.locator('#hero astro-island[client="visible"]');
  await expect(island).toHaveCount(1);
  expect(origins.filter((origin) => origin !== new URL(page.url()).origin)).toEqual([]);
});
