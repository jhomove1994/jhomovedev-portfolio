import { isLocale, type Locale } from '../../i18n/locales';

function normalize(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments.length === 0 ? '/' : `/${segments.join('/')}/`;
}

/** `/es/` for the home, `/en/about/` for nested paths. Always ends with a slash. */
export function localizedPath(locale: Locale, path = '/'): string {
  return normalize(`/${locale}${normalize(path)}`);
}

/** Removes a leading supported-locale segment: `/en/x/` -> `/x/`. */
export function stripLocale(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const [first, ...rest] = segments;
  if (first !== undefined && isLocale(first)) {
    return normalize(rest.join('/'));
  }
  return normalize(pathname);
}

/** Same page in another locale: `/es/about/` -> `/en/about/`. */
export function switchLocalePath(pathname: string, target: Locale): string {
  return localizedPath(target, stripLocale(pathname));
}
