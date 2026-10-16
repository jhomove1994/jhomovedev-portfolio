import { DEFAULT_LOCALE, type Locale } from '../../i18n/locales';

export interface ResolvedCv {
  href: string;
  /** Language of the file that is actually served. */
  fileLocale: Locale;
  /** True when the visitor's locale has no CV and the default-locale file is served instead. */
  isFallback: boolean;
}

type MediaByLocale = Partial<Record<Locale, { cv?: string | undefined } | undefined>>;

/**
 * Picks the CV for a locale: its own file first, then the default-locale file (flagged as
 * fallback so the button can say "(Spanish)"). Returns `null` when nothing is uploaded, which
 * is the normal state until the author uploads a PDF from the admin.
 */
export function resolveCv(media: MediaByLocale, locale: Locale): ResolvedCv | null {
  const own = media[locale]?.cv;
  if (own) return { href: own, fileLocale: locale, isFallback: false };

  const fallback = media[DEFAULT_LOCALE]?.cv;
  if (locale !== DEFAULT_LOCALE && fallback) {
    return { href: fallback, fileLocale: DEFAULT_LOCALE, isFallback: true };
  }
  return null;
}
