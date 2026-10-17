import { expect, test, type Locator, type Page } from '@playwright/test';
import { terminalLabels } from '../src/i18n/ui';
import { COMMAND_NAMES } from '../src/lib/terminal/types';
import { seededProfile, stubWebgl2, type PageLocale } from './helpers';

interface Terminal {
  hero: Locator;
  log: Locator;
  input: Locator;
  windows: Locator;
  run: (command: string) => Promise<void>;
}

/** Opens the static hero (WebGL2 stubbed away so the mode never depends on the machine's GPU). */
async function openTerminal(page: Page, locale: PageLocale): Promise<Terminal> {
  const labels = terminalLabels(locale);
  await stubWebgl2(page, 'none');
  await page.goto(`/${locale}/`);
  const hero = page.locator('#hero');
  const input = hero.getByRole('textbox', { name: labels.inputLabel });
  // The input only exists after hydration, so waiting for it also waits for the island.
  await expect(input).toBeVisible();
  return {
    hero,
    log: hero.getByRole('log'),
    input,
    windows: hero.getByRole('navigation', { name: labels.windowsLabel }),
    async run(command) {
      await input.fill(command);
      await input.press('Enter');
    },
  };
}

const isInputFocused = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.activeElement?.classList.contains('term-input') === true);

const hasHorizontalOverflow = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

for (const locale of ['es', 'en'] as const) {
  const profile = seededProfile(locale);
  const labels = terminalLabels(locale);
  const other: PageLocale = locale === 'es' ? 'en' : 'es';

  test.describe(`terminal /${locale}/`, () => {
    test('whoami prints the seeded profile text', async ({ page }) => {
      const term = await openTerminal(page, locale);
      await term.run('whoami');
      await expect(term.log).toContainText(profile.whoami);
      await expect(term.input).toHaveValue('');
    });

    test('help lists every command described in the page language', async ({ page }) => {
      const term = await openTerminal(page, locale);
      await term.run('help');
      await expect(term.log).toContainText(labels.helpIntro);
      for (const name of COMMAND_NAMES) {
        await expect(term.log).toContainText(`${name}  ${labels.commands[name]}`);
      }
      await expect(term.log).toContainText(`${labels.helpHint} sudo hire-me`);
    });

    test('Tab completes a command and keeps focus in the input', async ({ page }) => {
      const term = await openTerminal(page, locale);
      await term.input.focus();
      await term.input.pressSequentially('wh');
      await term.input.press('Tab');
      await expect(term.input).toHaveValue('whoami');
      await expect(term.input).toBeFocused();
    });

    test('Tab on an empty input moves focus on and Shift+Tab leaves it', async ({ page }) => {
      const term = await openTerminal(page, locale);
      await term.input.focus();
      await term.input.press('Tab');
      await expect(term.input).not.toBeFocused();
      await expect(term.windows.getByRole('button').first()).toBeFocused();

      await term.input.focus();
      await term.input.press('Shift+Tab');
      await expect(term.input).not.toBeFocused();
    });

    test('Escape blurs the input and Up recalls history', async ({ page }) => {
      const term = await openTerminal(page, locale);
      await term.run('whoami');
      await term.run('stack');
      await term.input.press('ArrowUp');
      await expect(term.input).toHaveValue('stack');
      await term.input.press('ArrowUp');
      await expect(term.input).toHaveValue('whoami');
      await term.input.press('ArrowDown');
      await expect(term.input).toHaveValue('stack');
      await term.input.press('Escape');
      await expect(term.input).not.toBeFocused();
    });

    test('clear and Ctrl+L empty the log but keep history', async ({ page }) => {
      const term = await openTerminal(page, locale);
      await term.run('whoami');
      await expect(term.log).toContainText(profile.whoami);
      await term.run('clear');
      await expect(term.log).not.toContainText(profile.whoami);

      await term.run('whoami');
      await expect(term.log).toContainText(profile.whoami);
      await term.input.press('Control+l');
      await expect(term.log).not.toContainText(profile.whoami);
      await term.input.press('ArrowUp');
      await expect(term.input).toHaveValue('whoami');
    });

    test('a keyboard-only visit can reach the prompt, run a command and a window', async ({
      page,
    }) => {
      const term = await openTerminal(page, locale);
      let presses = 0;
      while (!(await isInputFocused(page)) && presses < 60) {
        await page.keyboard.press('Tab');
        presses += 1;
      }
      expect(await isInputFocused(page)).toBe(true);

      await page.keyboard.type('help');
      await page.keyboard.press('Enter');
      await expect(term.log).toContainText(labels.helpIntro);

      await page.keyboard.press('Tab');
      const stack = term.windows.getByRole('button', { name: /:stack/ });
      while ((await stack.evaluate((el) => el === document.activeElement)) === false) {
        await page.keyboard.press('Tab');
      }
      await page.keyboard.press('Enter');
      await expect(stack).toHaveAttribute('aria-current', 'true');
    });

    test('the log is an announced region, the input is named and nothing autofocuses', async ({
      page,
    }) => {
      const term = await openTerminal(page, locale);
      await expect(term.log).toHaveAttribute('aria-live', 'polite');
      await expect(term.log).toHaveAttribute('aria-label', labels.logLabel);
      await expect(term.input).toHaveAccessibleName(labels.inputLabel);
      expect(await isInputFocused(page)).toBe(false);
      await expect(page.locator('body')).toBeFocused();
    });

    test('clicking the pane focuses the input', async ({ page }) => {
      const term = await openTerminal(page, locale);
      await term.hero.locator('.term-status').click();
      await expect(term.input).toBeFocused();
    });

    test('the log follows new output without scrolling the page', async ({ page }) => {
      const term = await openTerminal(page, locale);
      for (let i = 0; i < 3; i += 1) await term.run('help');
      const scroller = term.hero.locator('.term-scroll');
      await expect
        .poll(() =>
          scroller.evaluate((el) => ({
            scrollable: el.scrollHeight > el.clientHeight,
            atEnd: el.scrollHeight - el.scrollTop - el.clientHeight <= 2,
          })),
        )
        .toEqual({ scrollable: true, atEnd: true });
    });

    test('output stays inside the page width', async ({ page }) => {
      const term = await openTerminal(page, locale);
      for (const command of ['help', 'experience', 'stack', 'certs', 'contact']) {
        await term.run(command);
      }
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });

    test(`lang ${other} navigates to the other locale`, async ({ page }) => {
      const term = await openTerminal(page, locale);
      await term.run(`lang ${other}`);
      await page.waitForURL(`**/${other}/`);
      await expect(page.locator('html')).toHaveAttribute('lang', other);
    });

    test('sudo hire-me shows the contact call to action', async ({ page }) => {
      const term = await openTerminal(page, locale);
      await term.run('sudo hire-me');
      await expect(term.log).toContainText(labels.sudoHireMe);
      await expect(term.log.locator('a[href^="mailto:"]')).toHaveCount(1);
    });

    test('every command runs without an error on this viewport', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const term = await openTerminal(page, locale);
      for (const command of [
        'whoami',
        'experience',
        'projects',
        'stack',
        'certs',
        'contact',
        'cv',
        'ask hola',
        'clear',
      ]) {
        await term.run(command);
        await expect(term.input).toHaveValue('');
        await expect(term.log.locator('[data-tone="error"]')).toHaveCount(0);
      }
      expect(errors).toEqual([]);
    });

    test.describe('clickable suggestions', () => {
      test('a tmux window runs its command and becomes the current window', async ({ page }) => {
        const term = await openTerminal(page, locale);
        const stack = term.windows.getByRole('button', { name: /:stack/ });
        const current = term.windows.locator('[aria-current]');
        await expect(current).toContainText('whoami');
        await stack.click();
        await expect(stack).toHaveAttribute('aria-current', 'true');
        await expect(current).toHaveCount(1);
      });

      test('clicking a help entry runs it as one history entry', async ({ page }) => {
        const term = await openTerminal(page, locale);
        await term.run('help');
        await term.log.getByRole('button', { name: 'whoami', exact: true }).click();
        await expect(term.log).toContainText(profile.whoami);

        await term.input.focus();
        await term.input.press('ArrowUp');
        await expect(term.input).toHaveValue('whoami');
        await term.input.press('ArrowUp');
        await expect(term.input).toHaveValue('help');
        await term.input.press('ArrowUp');
        await expect(term.input).toHaveValue('help');
      });

      test('an unknown command offers its near match as a button', async ({ page }) => {
        const term = await openTerminal(page, locale);
        await term.run('proyects');
        await expect(term.log).toContainText(labels.didYouMean);
        const suggestion = term.log.getByRole('button', { name: 'projects', exact: true });
        await expect(suggestion).toHaveCount(1);
        await suggestion.click();
        await expect(term.log).toContainText(labels.projectsEmpty);
      });

      test('with no published projects the contact suggestion prints contact', async ({ page }) => {
        const term = await openTerminal(page, locale);
        await term.run('projects');
        await expect(term.log).toContainText(labels.projectsEmpty);
        await term.log.getByRole('button', { name: 'contact', exact: true }).click();
        await expect(term.log.locator('a[href^="mailto:"]')).toHaveCount(1);
        await expect(term.windows.locator('[aria-current]')).toContainText('contact');
      });

      test('windows work by keyboard and fit the page width', async ({ page }) => {
        const term = await openTerminal(page, locale);
        await term.input.focus();
        await term.input.press('Tab');
        const first = term.windows.getByRole('button').first();
        await expect(first).toBeFocused();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');
        await expect(term.windows.getByRole('button').nth(1)).toHaveAttribute(
          'aria-current',
          'true',
        );
        expect(await hasHorizontalOverflow(page)).toBe(false);
        const bar = await term.windows.boundingBox();
        const viewport = page.viewportSize();
        expect(bar).not.toBeNull();
        expect(bar!.x + bar!.width).toBeLessThanOrEqual(viewport!.width + 1);
      });
    });
  });
}
