import type { Locale } from '../../i18n/locales';

const Q_VALUE = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/;

type Candidate = { tag: string; q: number };

function parseItem(item: string): Candidate | undefined {
  const [rawTag = '', ...params] = item.split(';');
  const tag = rawTag.trim().toLowerCase();
  if (!tag) return undefined;
  let q = 1;
  for (const param of params) {
    const [key = '', value = ''] = param.split('=');
    if (key.trim().toLowerCase() !== 'q') continue;
    if (!Q_VALUE.test(value.trim())) return undefined;
    q = Number(value);
  }
  return { tag, q };
}

/**
 * Picks the best supported locale from an `Accept-Language` header.
 * Region subtags are ignored (`en-US` -> `en`), `q=0` excludes a tag, `*` resolves to the
 * fallback, malformed items are skipped and ties keep header order. The result always comes
 * from `supported` (or `fallback`), so input is never reflected.
 */
export function pickLocale(
  header: string | null | undefined,
  supported: readonly Locale[],
  fallback: Locale,
): Locale {
  if (typeof header !== 'string') return fallback;

  const candidates = header
    .split(',')
    .map(parseItem)
    .filter((candidate): candidate is Candidate => candidate !== undefined && candidate.q > 0)
    .map((candidate, index) => ({ ...candidate, index }))
    .sort((a, b) => b.q - a.q || a.index - b.index);

  for (const { tag } of candidates) {
    if (tag === '*') return fallback;
    const primary = tag.split('-')[0];
    const match = supported.find((locale) => locale === primary);
    if (match) return match;
  }
  return fallback;
}
