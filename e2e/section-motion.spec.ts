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

for (const locale of ['es', 'en'] as const) {
  test.describe(`experience rail /${locale}/`, () => {
    const nodes = '#experience [data-rail-node]';
    const lit = '#experience [data-rail-node].is-lit';

    test('reduced motion renders the rail full with every node lit', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/${locale}/`);
      await page.locator('#experience').scrollIntoViewIfNeeded();
      const fill = await page.locator('#experience [data-rail-fill]').evaluate((el) => {
        const { height } = el.getBoundingClientRect();
        return { height, track: el.parentElement!.getBoundingClientRect().height };
      });
      expect(fill.height).toBeGreaterThan(0);
      expect(fill.height).toBeCloseTo(fill.track - 16, 0);
      const colors = await page
        .locator(nodes)
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor));
      expect(colors.length).toBeGreaterThan(1);
      expect(new Set(colors)).toEqual(new Set(['rgb(61, 220, 151)']));
    });

    test('with motion the fill follows the scroll and lights the nodes it passes', async ({
      page,
    }) => {
      await page.goto(`/${locale}/`);
      await page.mouse.wheel(0, 40);
      await expect(page.locator('html')).toHaveClass(/motion/);
      const total = await page.locator(nodes).count();
      expect(total).toBeGreaterThan(1);
      const rail = page.locator('#experience [data-rail]');
      await page.evaluate(() => window.scrollTo(0, 0));
      await rail.scrollIntoViewIfNeeded();
      const before = await page.locator(lit).count();
      expect(before).toBeLessThan(total);
      // Bring the end of the rail to the reading line: the fill is complete, every node lit.
      await rail.evaluate((el) => {
        const { bottom } = el.getBoundingClientRect();
        window.scrollBy(0, bottom - window.innerHeight * 0.5);
      });
      await expect(page.locator(lit)).toHaveCount(total);
      await expect
        .poll(() => rail.evaluate((el) => Number(el.style.getPropertyValue('--fill'))))
        .toBeCloseTo(1, 1);
    });
  });
}
