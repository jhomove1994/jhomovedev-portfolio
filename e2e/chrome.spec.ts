import { expect, test } from '@playwright/test';
import { seededProfile, type PageLocale } from './helpers';

const LOCALES: { locale: PageLocale; other: PageLocale; otherName: string; ownName: string }[] = [
  { locale: 'es', other: 'en', ownName: 'Español', otherName: 'English' },
  { locale: 'en', other: 'es', ownName: 'English', otherName: 'Español' },
];

for (const { locale, other, ownName, otherName } of LOCALES) {
  test.describe(`chrome /${locale}/`, () => {
    test('has a sticky header with the brand linking home', async ({ page }) => {
      await page.goto(`/${locale}/`);
      const header = page.getByRole('banner');
      await expect(header).toHaveCount(1);
      expect(await header.evaluate((el) => getComputedStyle(el).position)).toBe('sticky');
      const brand = header.getByRole('link', { name: seededProfile(locale).brand });
      await expect(brand).toHaveAttribute('href', `/${locale}/`);
    });

    test('switches to the same page in the other language', async ({ page }) => {
      await page.goto(`/${locale}/`);
      const switcher = page.getByRole('navigation', {
        name: locale === 'es' ? 'Cambiar idioma' : 'Change language',
      });
      const current = switcher.getByRole('link', { name: ownName });
      await expect(current).toHaveAttribute('aria-current', 'page');
      await expect(current).toHaveAttribute('lang', locale);
      const target = switcher.getByRole('link', { name: otherName });
      await expect(target).not.toHaveAttribute('aria-current', /.*/);
      await expect(target).toHaveAttribute('href', `/${other}/`);
      await expect(target).toHaveAttribute('hreflang', other);
      await target.click();
      await expect(page).toHaveURL(new RegExp(`/${other}/$`));
      await expect(page.locator('html')).toHaveAttribute('lang', other);
    });

    test('has a footer with the owner name and the current year', async ({ page }) => {
      await page.goto(`/${locale}/`);
      const footer = page.getByRole('contentinfo');
      await expect(footer).toHaveCount(1);
      await expect(footer).toContainText(seededProfile(locale).name);
      await expect(footer).toContainText(String(new Date().getFullYear()));
    });

    test('keeps the skip link first and never overflows horizontally', async ({ page }) => {
      await page.goto(`/${locale}/`);
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('href', '#main');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}
