import { DEFAULT_LOCALE, type Locale } from '../../i18n/locales';
import { t } from '../../i18n/ui';

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

export interface CvButtonModel {
  href: string;
  label: string;
  /** Language of the file, for the `lang` attribute of the link. */
  lang: Locale;
}

/**
 * Everything the CV button needs, or `null` when there is nothing to download so the page
 * renders no control at all. The label carries the language suffix when the file is not in the
 * visitor's language.
 */
export function cvButton(media: MediaByLocale, locale: Locale): CvButtonModel | null {
  const cv = resolveCv(media, locale);
  if (!cv) return null;
  const base = t(locale, 'buttons.downloadCv');
  const label = cv.isFallback ? `${base} ${t(locale, 'labels.spanishSuffix')}` : base;
  return { href: cv.href, label, lang: cv.fileLocale };
}
