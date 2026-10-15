import type { Locale } from '../../i18n/locales';

export const PRESENT = 'present';

const YEAR_MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

function formatYearMonth(value: string, locale: Locale): string {
  const match = YEAR_MONTH.exec(value);
  if (!match) {
    throw new Error(`Invalid period value "${value}": expected YYYY-MM`);
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  // Parts instead of a pattern: Spanish would otherwise render "mayo de 2024".
  const parts = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).formatToParts(date);
  const month = parts.find((part) => part.type === 'month')?.value;
  const year = parts.find((part) => part.type === 'year')?.value;
  return `${month} ${year}`;
}

/**
 * Human period such as `May 2024 - Present`. `end` is `YYYY-MM` or the literal `present`,
 * which is replaced by the localized `presentLabel` (copy lives in the UI dictionary).
 */
export function formatPeriod(
  start: string,
  end: string,
  locale: Locale,
  presentLabel: string,
): string {
  const from = formatYearMonth(start, locale);
  const to = end === PRESENT ? presentLabel : formatYearMonth(end, locale);
  return `${from} - ${to}`;
}
