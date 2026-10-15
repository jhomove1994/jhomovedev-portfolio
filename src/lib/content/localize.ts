import { DEFAULT_LOCALE, type Locale } from '../../i18n/locales';
import { parseEntryId } from './entry-id';

/** Any Content Layer entry: id is `<locale>/<slug>`. */
export interface LocalizableEntry {
  id: string;
}

export interface Localized<T extends LocalizableEntry> {
  slug: string;
  /** Locale actually served; differs from the requested one when `isFallback` is true. */
  locale: Locale;
  isFallback: boolean;
  entry: T;
}

export interface LocalizeOptions {
  /** Called once per slug served from the default locale. Omit it in production builds. */
  onFallback?: (slug: string, requested: Locale) => void;
}

/** Entries grouped by slug, then by locale; slug order follows first appearance. */
function groupBySlug<T extends LocalizableEntry>(
  entries: readonly T[],
): Map<string, Map<Locale, T>> {
  const bySlug = new Map<string, Map<Locale, T>>();
  for (const entry of entries) {
    const { locale, slug } = parseEntryId(entry.id);
    const perLocale = bySlug.get(slug) ?? new Map<Locale, T>();
    perLocale.set(locale, entry);
    bySlug.set(slug, perLocale);
  }
  return bySlug;
}

function resolveSlug<T extends LocalizableEntry>(
  slug: string,
  perLocale: Map<Locale, T>,
  locale: Locale,
  options: LocalizeOptions,
): Localized<T> {
  const requested = perLocale.get(locale);
  if (requested) {
    return { slug, locale, isFallback: false, entry: requested };
  }

  const fallback = perLocale.get(DEFAULT_LOCALE);
  if (locale === DEFAULT_LOCALE || !fallback) {
    // The default locale is the source of truth: every slug must exist in it.
    throw new Error(`Content "${slug}" has no "${DEFAULT_LOCALE}" entry (requested "${locale}")`);
  }

  options.onFallback?.(slug, locale);
  return { slug, locale: DEFAULT_LOCALE, isFallback: true, entry: fallback };
}

/**
 * Resolves a collection for one locale. Missing translations fall back to the default
 * locale; slugs that exist only in a non-default locale are kept when resolving it, but
 * resolving the default locale for such a slug throws.
 */
export function localizeCollection<T extends LocalizableEntry>(
  entries: readonly T[],
  locale: Locale,
  options: LocalizeOptions = {},
): Localized<T>[] {
  const grouped = groupBySlug(entries);
  const result: Localized<T>[] = [];
  for (const [slug, perLocale] of grouped) {
    if (locale !== DEFAULT_LOCALE && !perLocale.has(locale) && !perLocale.has(DEFAULT_LOCALE)) {
      continue;
    }
    result.push(resolveSlug(slug, perLocale, locale, options));
  }
  return result;
}

/** Resolves a per-locale singleton (ids `<locale>/index`), with default-locale fallback. */
export function localizeSingleton<T extends LocalizableEntry>(
  entries: readonly T[],
  locale: Locale,
  options: LocalizeOptions = {},
): Localized<T> {
  const grouped = groupBySlug(entries);
  const [slug, perLocale] = [...grouped.entries()][0] ?? [];
  if (slug === undefined || perLocale === undefined) {
    throw new Error(`Singleton for locale "${locale}" not found: no entries`);
  }
  return resolveSlug(slug, perLocale, locale, options);
}
