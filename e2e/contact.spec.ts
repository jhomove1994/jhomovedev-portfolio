import { expect, test } from '@playwright/test';
import { seededProfile, type PageLocale } from './helpers';

const COPY: Record<
  PageLocale,
  { contact: string; copy: string; copied: string; cv: string; nav: string }
> = {
  es: {
    contact: 'Contacto',
    copy: 'Copiar',
    copied: 'Copiado',
    cv: 'Descargar CV',
    nav: 'Navegación principal',
  },
  en: {
    contact: 'Contact',
    copy: 'Copy',
    copied: 'Copied',
    cv: 'Download CV',
    nav: 'Main navigation',
  },
};

for (const locale of ['es', 'en'] as const) {
  const copy = COPY[locale];
  const { contact } = seededProfile(locale) as unknown as {
    contact: { email: string; linkedin: string };
  };

  test.describe(`contact and CV /${locale}/`, () => {
    test('contact shows mailto and LinkedIn links', async ({ page }) => {
      await page.goto(`/${locale}/`);
      const section = page.locator('section#contact');
      await expect(section.getByRole('heading', { level: 2, name: copy.contact })).toBeVisible();
      await expect(section.locator(`a[href="mailto:${contact.email}"]`)).toBeVisible();
      const linkedin = section.locator(`a[href="${contact.linkedin}"]`);
      await expect(linkedin).toBeVisible();
      await expect(linkedin).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('copy button copies the email and confirms politely', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.goto(`/${locale}/`);
      const section = page.locator('section#contact');
      const button = section.getByRole('button', { name: new RegExp(copy.copy, 'i') });
      await expect(button).toBeVisible();
      await button.click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(contact.email);
      const status = section.locator('[aria-live="polite"]');
      await expect(status).toHaveText(copy.copied);
    });

    test('without JavaScript the email stays usable and the copy button is hidden', async ({
      browser,
    }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(`/${locale}/`);
      const section = page.locator('section#contact');
      await expect(section.locator(`a[href="mailto:${contact.email}"]`)).toBeVisible();
      await expect(section.locator('[data-copy-email]')).toBeHidden();
      await context.close();
    });

    test('hero offers the email link', async ({ page }) => {
      await page.goto(`/${locale}/`);
      const hero = page.locator('section[aria-labelledby="hero-title"]');
      await expect(hero.locator(`a[href="mailto:${contact.email}"]`)).toBeVisible();
    });

    test('hides the CV button while no CV is uploaded', async ({ page }) => {
      await page.goto(`/${locale}/`);
      await expect(page.locator('[data-cv-button]')).toHaveCount(0);
      await expect(page.getByRole('link', { name: new RegExp(copy.cv) })).toHaveCount(0);
      await expect(page.locator('a[download]')).toHaveCount(0);
      await expect(page.locator('a[href$=".pdf"]')).toHaveCount(0);
    });

    test('renders no form, phone link or WhatsApp', async ({ page }) => {
      await page.goto(`/${locale}/`);
      const html = (await page.content()).toLowerCase();
      expect(html).not.toContain('<form');
      expect(html).not.toContain('te' + 'l:');
      expect(html).not.toContain('whatsapp');
      expect(html).not.toContain('wa.me');
    });

    test('header anchors reach contact', async ({ page }) => {
      await page.goto(`/${locale}/`);
      const nav = page.getByRole('navigation', { name: copy.nav });
      await expect(nav.getByRole('link', { name: copy.contact })).toHaveAttribute(
        'href',
        '#contact',
      );
    });
  });
}
