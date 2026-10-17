import { expect, test } from '@playwright/test';
import { seededProfile, stubWebgl2, type PageLocale } from './helpers';

const LABELS: Record<PageLocale, { enable: string; disable: string }> = {
  es: { enable: 'Activar 3D', disable: 'Desactivar 3D' },
  en: { enable: 'Enable 3D', disable: 'Disable 3D' },
};

for (const locale of ['es', 'en'] as const) {
  const profile = seededProfile(locale);
  const labels = LABELS[locale];

  test.describe(`hero modes /${locale}/`, () => {
    test('server-rendered hero is static with a readable transcript and no controls', async ({
      browser,
    }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(`/${locale}/`);
      const hero = page.locator('#hero');
      await expect(hero).toHaveAttribute('data-hero-mode', 'static');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(hero.getByRole('log')).toContainText(profile.whoami);
      await expect(hero.locator('input')).toHaveCount(0);
      await expect(hero.locator('[data-hero-toggle]')).toHaveCount(0);
      await expect(hero.locator('canvas')).toHaveCount(0);
      await context.close();
    });

    test('software rendering stays static and offers an unpressed toggle', async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'desktop heuristics');
      await stubWebgl2(page, 'software');
      await page.goto(`/${locale}/`);
      const hero = page.locator('#hero');
      await expect(hero).toHaveAttribute('data-hero-mode', 'static');
      await expect(hero).toHaveAttribute('data-hero-reason', 'software-renderer');
      const toggle = hero.locator('button[data-hero-toggle]');
      await expect(toggle).toHaveText(labels.enable);
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await toggle.focus();
      await expect(toggle).toBeFocused();
      await expect(page.locator('canvas')).toHaveCount(0);
      await expect(page.locator('h1')).toHaveCount(1);
    });

    test('reduced motion keeps the static hero and removes the toggle', async ({ page }) => {
      await stubWebgl2(page, 'hardware');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/${locale}/`);
      const hero = page.locator('#hero');
      await expect(hero).toHaveAttribute('data-hero-reason', 'reduced-motion');
      await expect(hero).toHaveAttribute('data-hero-mode', 'static');
      await expect(hero.locator('[data-hero-toggle]')).toHaveCount(0);
      await expect(hero.getByRole('log')).toContainText(profile.whoami);
    });

    test('missing WebGL2 stays static without a canvas or toggle', async ({ page }) => {
      await stubWebgl2(page, 'none');
      await page.goto(`/${locale}/`);
      const hero = page.locator('#hero');
      await expect(hero).toHaveAttribute('data-hero-reason', 'no-webgl2');
      await expect(hero).toHaveAttribute('data-hero-mode', 'static');
      await expect(page.locator('canvas')).toHaveCount(0);
      await expect(hero.locator('[data-hero-toggle]')).toHaveCount(0);
    });

    test('mobile is static and labels the toggle for 3D', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'mobile', 'mobile heuristics');
      await stubWebgl2(page, 'hardware');
      await page.goto(`/${locale}/`);
      const hero = page.locator('#hero');
      await expect(hero).toHaveAttribute('data-hero-reason', 'mobile');
      await expect(hero).toHaveAttribute('data-hero-mode', 'static');
      await expect(hero.locator('button[data-hero-toggle]')).toHaveText(labels.enable);
      await expect(page.locator('canvas')).toHaveCount(0);
    });

    test('an explicit ?3d=0 survives a plain visit (override persisted)', async ({ page }) => {
      await stubWebgl2(page, 'hardware');
      await page.goto(`/${locale}/?3d=0`);
      await expect(page.locator('#hero')).toHaveAttribute('data-hero-reason', 'override-off');
      await page.goto(`/${locale}/`);
      const hero = page.locator('#hero');
      await expect(hero).toHaveAttribute('data-hero-mode', 'static');
      await expect(hero).toHaveAttribute('data-hero-reason', 'override-off');
      expect(await page.evaluate(() => localStorage.getItem('jhomove:hero-mode'))).toBe('0');
    });

    test('the toggle stores the choice and flips pressed state and label', async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'desktop heuristics');
      await stubWebgl2(page, 'software');
      await page.goto(`/${locale}/`);
      const hero = page.locator('#hero');
      const toggle = hero.locator('button[data-hero-toggle]');
      await toggle.click();
      expect(await page.evaluate(() => localStorage.getItem('jhomove:hero-mode'))).toBe('1');
      await expect(hero).toHaveAttribute('data-hero-reason', 'override-on');
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(toggle).toHaveText(labels.disable);
      await toggle.click();
      expect(await page.evaluate(() => localStorage.getItem('jhomove:hero-mode'))).toBe('0');
      await expect(hero).toHaveAttribute('data-hero-mode', 'static');
      await expect(toggle).toHaveText(labels.enable);
    });
  });
}
