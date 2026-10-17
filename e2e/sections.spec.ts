import { expect, test } from '@playwright/test';
import { seededLeadership, seededProfile, type PageLocale } from './helpers';

const LOCALES: { locale: PageLocale; about: string; path: string }[] = [
  { locale: 'es', about: 'Sobre mí', path: 'Camino a Tech Lead' },
  { locale: 'en', about: 'About', path: 'Path to Tech Lead' },
];

for (const { locale, about, path } of LOCALES) {
  const profile = seededProfile(locale);

  test.describe(`sections /${locale}/`, () => {
    test('hero has the single h1, headline and location', async ({ page }) => {
      await page.goto(`/${locale}/`);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(profile.name);
      const hero = page.locator('main').getByRole('region', { name: profile.name });
      await expect(hero).toContainText(profile.headline);
      await expect(hero).toContainText(profile.location);
      await expect(hero).toContainText(locale === 'es' ? 'Trabajo en remoto' : 'Remote');
    });

    test('hero carries the whoami line in the terminal and the single h1 inside #hero', async ({
      page,
    }) => {
      await page.goto(`/${locale}/`);
      const hero = page.locator('#hero');
      await expect(hero.locator('h1')).toHaveText(profile.name);
      await expect(hero.getByRole('log')).toContainText(profile.whoami);
    });

    test('never renders the availability value', async ({ page }) => {
      await page.goto(`/${locale}/`);
      const text = (await page.locator('body').innerText()).toLowerCase();
      expect(text).not.toContain('open-to-offers');
      expect(text).not.toContain('freelance');
    });

    test('about shows the bio with a readable line length', async ({ page }) => {
      await page.goto(`/${locale}/`);
      const section = page.locator('section#about');
      await expect(section.getByRole('heading', { level: 2, name: about })).toBeVisible();
      const bio = section.locator('p', { hasText: profile.bio.slice(0, 40) });
      await expect(bio).toHaveText(profile.bio);
      const { width, fontSize } = await bio.evaluate((el) => ({
        width: el.getBoundingClientRect().width,
        fontSize: parseFloat(getComputedStyle(el).fontSize),
      }));
      // 68ch is roughly 68 * 0.55em for this face; the bound only has to prove it is capped.
      expect(width).toBeLessThanOrEqual(fontSize * 68 * 0.75);
    });

    test('path lists the evidenced milestones in order as commit nodes', async ({ page }) => {
      await page.goto(`/${locale}/`);
      const section = page.locator('section#path');
      await expect(section.getByRole('heading', { level: 2, name: path })).toBeVisible();
      const expected = seededLeadership(locale);
      expect(expected.length).toBeGreaterThanOrEqual(4);
      const items = section.locator('ol > li');
      await expect(items).toHaveCount(expected.length);
      for (const [index, milestone] of expected.entries()) {
        const item = items.nth(index);
        await expect(item.getByRole('heading', { level: 3 })).toHaveText(milestone.title);
        await expect(item).toContainText(milestone.evidence);
      }
      const nodes = section.locator('[data-commit-node]');
      await expect(nodes).toHaveCount(expected.length);
      const colors = await nodes.evaluateAll((els) =>
        els.map((el) => getComputedStyle(el).backgroundColor),
      );
      expect(new Set(colors)).toEqual(new Set(['rgb(61, 220, 151)']));
    });

    test('hides TODO(autor) placeholders in the production build', async ({ page }) => {
      await page.goto(`/${locale}/`);
      expect(seededLeadership(locale, { includeTodo: true }).length).toBeGreaterThan(
        seededLeadership(locale).length,
      );
      expect(await page.locator('body').innerText()).not.toContain('TODO(autor)');
    });

    test('header anchors point at rendered sections', async ({ page }) => {
      await page.goto(`/${locale}/`);
      const nav = page.getByRole('navigation', {
        name: locale === 'es' ? 'Navegación principal' : 'Main navigation',
      });
      await expect(nav.getByRole('link', { name: about })).toHaveAttribute('href', '#about');
      await expect(nav.getByRole('link', { name: path })).toHaveAttribute('href', '#path');
      await expect(page.locator('#about')).toHaveCount(1);
      await expect(page.locator('#path')).toHaveCount(1);
    });

    test('is readable without JavaScript', async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(`/${locale}/`);
      await expect(page.locator('h1')).toHaveText(profile.name);
      await expect(page.locator('section#about')).toContainText(profile.bio);
      await expect(page.locator('section#path ol > li').first()).toBeVisible();
      await context.close();
    });
  });
}
