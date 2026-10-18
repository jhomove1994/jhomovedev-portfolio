import { DEFAULT_LOCALE, LOCALES, type Locale } from '../../i18n/locales';
import { localizedPath, stripLocale } from '../i18n/paths';

export type Alternate = { hreflang: Locale | 'x-default'; href: string };

export const OG_LOCALES: Record<Locale, string> = { es: 'es_CO', en: 'en_US' };

export type HeadMetaInput = {
  site: string | undefined;
  locale: Locale;
  /** Current pathname, with or without the locale prefix. */
  path: string;
  /** Public path or absolute URL of the Open Graph image; omitted when unset. */
  ogImage?: string | undefined;
};

export type HeadMeta = {
  canonical: string;
  alternates: Alternate[];
  ogLocale: string;
  ogLocaleAlternates: string[];
  ogImage?: string;
};

export function origin(site: string | undefined): string {
  if (typeof site !== 'string' || site.trim() === '') {
    throw new Error('Missing site URL: set `site` in astro.config.mjs (see src/lib/site.ts)');
  }
  return site.trim().replace(/\/+$/, '');
}

/** hreflang trio. `x-default` is the root for the home path, else the default-locale URL. */
export function buildAlternates(site: string | undefined, path: string): Alternate[] {
  const base = origin(site);
  const bare = stripLocale(path);
  const alternates: Alternate[] = LOCALES.map((locale) => ({
    hreflang: locale,
    href: `${base}${localizedPath(locale, bare)}`,
  }));
  const xDefault = bare === '/' ? `${base}/` : `${base}${localizedPath(DEFAULT_LOCALE, bare)}`;
  return [...alternates, { hreflang: 'x-default', href: xDefault }];
}

export function buildHeadMeta(input: HeadMetaInput): HeadMeta {
  const base = origin(input.site);
  const bare = stripLocale(input.path);
  const meta: HeadMeta = {
    canonical: `${base}${localizedPath(input.locale, bare)}`,
    alternates: buildAlternates(base, bare),
    ogLocale: OG_LOCALES[input.locale],
    ogLocaleAlternates: LOCALES.filter((locale) => locale !== input.locale).map(
      (locale) => OG_LOCALES[locale],
    ),
  };
  if (input.ogImage) {
    meta.ogImage = /^https?:\/\//.test(input.ogImage) ? input.ogImage : `${base}${input.ogImage}`;
  }
  return meta;
}
