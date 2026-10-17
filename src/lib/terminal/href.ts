// Link policy for anything the terminal renders as an anchor. Pure: no DOM, no framework.

const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'mailto:']);
// ASCII control characters (browsers strip some of them inside URLs, which hides schemes).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const SCHEME = /^([a-z][a-z0-9+.-]*:)/i;

/**
 * Returns `href` unchanged when it is safe to render as a link, otherwise `null`.
 * Allowed: http, https, mailto, same-origin absolute paths (`/x`) and fragments (`#x`).
 * Everything else (javascript:, data:, phone links, protocol-relative URLs, bare relative
 * paths, anything with control characters) is rejected.
 */
export function safeHref(href: string): string | null {
  if (href === '' || href !== href.trim() || CONTROL_CHARACTERS.test(href)) return null;

  const scheme = SCHEME.exec(href)?.[1]?.toLowerCase();
  if (scheme !== undefined) return ALLOWED_SCHEMES.has(scheme) ? href : null;

  if (href.startsWith('#')) return href;
  // `//host` is protocol-relative and `/\host` is read as one by browsers: both leave the origin.
  if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/\\')) return href;
  return null;
}
