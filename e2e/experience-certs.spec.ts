import { expect, test } from '@playwright/test';
import {
  seededCertifications,
  seededExperience,
  seededStackName,
  type PageLocale,
} from './helpers';

const COPY: Record<
  PageLocale,
  {
    experience: string;
    certifications: string;
    present: string;
    inProgress: string;
    kinds: Record<'certification' | 'education' | 'training', string>;
  }
> = {
  es: {
    experience: 'Experiencia',
    certifications: 'Certificaciones',
    present: 'Actualidad',
    inProgress: 'En curso',
    kinds: { certification: 'Certificación', education: 'Educación', training: 'Curso' },
  },
  en: {
    experience: 'Experience',
    certifications: 'Certifications',
    present: 'Present',
    inProgress: 'In progress',
    kinds: { certification: 'Certification', education: 'Education', training: 'Course' },
  },
};

for (const locale of ['es', 'en'] as const) {
  const copy = COPY[locale];
  const roles = seededExperience(locale);
  const certs = seededCertifications(locale);

  test.describe(`experience and certifications /${locale}/`, () => {
    test('experience lists the roles in order with the current one first', async ({ page }) => {
      await page.goto(`/${locale}/`);
      const section = page.locator('section#experience');
      await expect(section.getByRole('heading', { level: 2, name: copy.experience })).toBeVisible();
      const items = section.locator('ol > li');
      await expect(items).toHaveCount(roles.length);
      for (const [index, role] of roles.entries()) {
        const item = items.nth(index);
        await expect(item.getByRole('heading', { level: 3 })).toContainText(role.role);
        await expect(item).toContainText(role.company);
        await expect(item).toContainText(role.location);
      }
      expect(roles[0]?.end).toBe('present');
      await expect(items.first().locator('[data-period]')).toContainText(copy.present);
    });

    test('experience renders the Markdown achievements as a list', async ({ page }) => {
      await page.goto(`/${locale}/`);
      const first = page.locator('section#experience ol > li').first();
      const bullets = (roles[0]?.achievements ?? '')
        .split('\n')
        .filter((line) => line.startsWith('- '));
      expect(bullets.length).toBeGreaterThanOrEqual(3);
      const list = first.locator('[data-achievements] > li');
      await expect(list).toHaveCount(bullets.length);
      await expect(list.first()).toHaveText(bullets[0]?.slice(2) ?? '');
      expect(await first.innerText()).not.toMatch(/^\s*- /m);
    });

    test('experience shows stack chips with catalog names', async ({ page }) => {
      await page.goto(`/${locale}/`);
      const first = page.locator('section#experience ol > li').first();
      const chips = first.locator('[data-chip]');
      await expect(chips).toHaveCount(roles[0]?.stack.length ?? -1);
      await expect(chips.first()).toHaveText(seededStackName(roles[0]?.stack[0] ?? ''));
    });

    test('certifications are grouped by kind with Credly links and the in-progress badge', async ({
      page,
    }) => {
      await page.goto(`/${locale}/`);
      const section = page.locator('section#certifications');
      await expect(
        section.getByRole('heading', { level: 2, name: copy.certifications }),
      ).toBeVisible();
      for (const kind of ['certification', 'education', 'training'] as const) {
        const group = section.getByRole('heading', { level: 3, name: copy.kinds[kind] });
        await expect(group).toHaveCount(1);
      }
      for (const cert of certs.filter((c) => c.credentialUrl)) {
        const link = section.getByRole('link', { name: new RegExp(cert.name) });
        await expect(link).toHaveAttribute('href', cert.credentialUrl ?? '');
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      }
      const aws = certs.find((c) => c.code === 'AIF-C01');
      expect(aws).toBeDefined();
      await expect(section).toContainText('AIF-C01');
      const inProgress = certs.filter((c) => c.status === 'in-progress');
      expect(inProgress).toHaveLength(1);
      await expect(section.locator('li', { hasText: inProgress[0]?.name })).toContainText(
        copy.inProgress,
      );
      await expect(section.getByText(copy.inProgress)).toHaveCount(1);
    });

    test('header anchors reach the new sections', async ({ page }) => {
      await page.goto(`/${locale}/`);
      const nav = page.getByRole('navigation', {
        name: locale === 'es' ? 'Navegación principal' : 'Main navigation',
      });
      await expect(nav.getByRole('link', { name: copy.experience })).toHaveAttribute(
        'href',
        '#experience',
      );
      await expect(nav.getByRole('link', { name: copy.certifications })).toHaveAttribute(
        'href',
        '#certifications',
      );
    });

    test('sections are readable without JavaScript and never overflow', async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(`/${locale}/`);
      await expect(page.locator('section#experience ol > li').first()).toBeVisible();
      await expect(page.locator('section#certifications')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      await context.close();
    });
  });
}
