import { expect, test } from '@playwright/test';

const CONTACT_COMMANDS = { es: '$ ./contacto.sh', en: '$ ./contact.sh' } as const;
const COMMANDS = { es: '$ cat sobre-mi.md', en: '$ cat about.md' } as const;

for (const locale of ['es', 'en'] as const) {
  const command = COMMANDS[locale];

  test.describe(`section motion /${locale}/`, () => {
    test('reduced motion shows the final state at once and never hides content', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/${locale}/`);
      await page.locator('#about').scrollIntoViewIfNeeded();
      await expect(page.locator('html')).not.toHaveClass(/motion/);
      await expect(page.locator('#about [data-cmd-text]')).toHaveText(command);
      await expect(page.locator('#about [data-cmd-caret]')).toBeHidden();
      const opacities = await page
        .locator('[data-reveal-item]')
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
      expect(opacities.length).toBeGreaterThan(0);
      expect(new Set(opacities)).toEqual(new Set(['1']));
    });

    test('without JavaScript every command and item is visible', async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(`/${locale}/`);
      await expect(page.locator('#about [data-cmd-text]')).toHaveText(command);
      for (const item of await page.locator('[data-reveal-item]').all()) {
        await expect(item).toHaveCSS('opacity', '1');
      }
      await context.close();
    });

    test('with motion allowed, a section types its command and then reveals its content once', async ({
      page,
    }) => {
      await page.goto(`/${locale}/`);
      // The first scroll starts the motion; sections still below the fold animate when reached.
      await page.mouse.wheel(0, 40);
      await expect(page.locator('html')).toHaveClass(/motion/);
      const contact = page.locator('#contact');
      await expect(contact).not.toHaveAttribute('data-revealed', '');
      await contact.scrollIntoViewIfNeeded();
      const typed = contact.locator('[data-cmd-text]');
      await expect(typed).toHaveText(CONTACT_COMMANDS[locale]);
      const first = contact.locator('[data-reveal-item]').first();
      await expect(first).toHaveClass(/is-in/);
      await expect(first).toHaveCSS('opacity', '1');
      await expect(contact.locator('[data-cmd-caret]')).toHaveAttribute('data-done', '');
      // Runs once: the command is not retyped when the section is left and reached again.
      await page.evaluate(() => window.scrollTo(0, 0));
      await contact.scrollIntoViewIfNeeded();
      await expect(typed).toHaveText(CONTACT_COMMANDS[locale]);
    });

    test('does not scroll horizontally', async ({ page }) => {
      await page.goto(`/${locale}/`);
      await page.locator('#contact').scrollIntoViewIfNeeded();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}
