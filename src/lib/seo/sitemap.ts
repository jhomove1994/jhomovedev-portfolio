import { LOCALES } from '../../i18n/locales';
import { localizedPath } from '../i18n/paths';
import { buildAlternates, origin } from './alternates';

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * Sitemap for the localized home pages. Each URL lists the full hreflang set, matching the
 * head alternates. `lastmod` is emitted only when the caller supplies a value it can vouch for.
 */
export function buildSitemap(site: string | undefined, lastmod?: string): string {
  const base = origin(site);
  const alternates = buildAlternates(base, '/')
    .map(
      ({ hreflang, href }) =>
        `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(href)}"/>`,
    )
    .join('\n');
  const urls = LOCALES.map((locale) => {
    const lines = [`    <loc>${escapeXml(`${base}${localizedPath(locale)}`)}</loc>`];
    if (lastmod) lines.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
    lines.push(alternates);
    return `  <url>\n${lines.join('\n')}\n  </url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}
