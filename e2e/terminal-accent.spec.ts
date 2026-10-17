import { expect, test } from '@playwright/test';
import { terminalLabels } from '../src/i18n/ui';
import { stubWebgl2, type PageLocale } from './helpers';

/** Mint accent as the browser reports it (`#3DDC97`). */
const ACCENT_RGB = 'rgb(61, 220, 151)';

for (const locale of ['es', 'en'] as const satisfies readonly PageLocale[]) {
  test(`terminal /${locale}/ keeps the accent on cursor, active window and prompt marker`, async ({
    page,
  }) => {
    await stubWebgl2(page, 'none');
    await page.goto(`/${locale}/`);
    const input = page
      .locator('#hero')
      .getByRole('textbox', { name: terminalLabels(locale).inputLabel });
    await expect(input).toBeVisible();
    // Output with plain text, run buttons, links and an error line, so every tone is on screen.
    for (const command of ['help', 'contact', 'proyects']) {
      await input.fill(command);
      await input.press('Enter');
    }

    const result = await page.evaluate((accent) => {
      const allowed = '.term-cursor, .term-window[aria-current], .term-chevron';
      const props = [
        'color',
        'backgroundColor',
        'borderTopColor',
        'borderRightColor',
        'borderBottomColor',
        'borderLeftColor',
        'caretColor',
      ] as const;
      const offenders: string[] = [];
      const accented = new Set<string>();
      for (const el of document.querySelectorAll('#hero .term, #hero .term *')) {
        const style = getComputedStyle(el);
        for (const prop of props) {
          if (style[prop] !== accent) continue;
          if (el.matches(allowed)) accented.add(el.className.toString());
          else offenders.push(`${el.tagName}.${el.className} ${prop}`);
        }
      }
      const term = document.querySelector('#hero .term');
      const line = document.querySelector('#hero .term-line');
      return {
        offenders,
        accented: [...accented],
        fontFamily: term ? getComputedStyle(term).fontFamily : '',
        lineFontSize: line ? parseFloat(getComputedStyle(line).fontSize) : 0,
      };
    }, ACCENT_RGB);

    expect(result.offenders).toEqual([]);
    expect(result.accented.some((name) => name.includes('term-chevron'))).toBe(true);
    expect(result.fontFamily).toMatch(/^"?JetBrains Mono/i);
    expect(result.lineFontSize).toBeGreaterThanOrEqual(12);
  });
}
