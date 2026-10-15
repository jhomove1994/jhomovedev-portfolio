import { isLocale, type Locale } from '../../i18n/locales';

export interface ParsedEntryId {
  locale: Locale;
  slug: string;
}

const SINGLETON_SLUG = 'index';

function assertLocale(value: string, source: string): Locale {
  if (!isLocale(value)) {
    throw new Error(`Unknown locale "${value}" in content path "${source}"`);
  }
  return value;
}

/**
 * Content Layer id for a file path relative to the collection base.
 * - `es/av-villas.md`            -> `es/av-villas`
 * - `es.json`, `profile.es.json` -> `es/index` (singleton per locale)
 */
export function entryIdFromPath(path: string): string {
  const withoutExt = path.replace(/\.[^./]+$/, '');
  const slashIndex = withoutExt.indexOf('/');

  if (slashIndex === -1) {
    const locale = withoutExt.slice(withoutExt.lastIndexOf('.') + 1);
    return `${assertLocale(locale, path)}/${SINGLETON_SLUG}`;
  }

  const locale = assertLocale(withoutExt.slice(0, slashIndex), path);
  return `${locale}/${withoutExt.slice(slashIndex + 1)}`;
}

/** Splits a Content Layer id (`<locale>/<slug>`); unknown locales are never accepted silently. */
export function parseEntryId(id: string): ParsedEntryId {
  const slashIndex = id.indexOf('/');
  const slug = slashIndex === -1 ? '' : id.slice(slashIndex + 1);
  if (slug === '') {
    throw new Error(`Invalid content entry id "${id}": expected "<locale>/<slug>"`);
  }
  return { locale: assertLocale(id.slice(0, slashIndex), id), slug };
}
