import { describe, expect, it } from 'vitest';
import { buildSitemap } from '../../../src/lib/seo/sitemap';

const SITE = 'https://x.dev';

describe('buildSitemap', () => {
  const xml = buildSitemap(SITE);

  it('declares the sitemap and xhtml namespaces', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  });

  it('lists one url per locale home', () => {
    expect(xml.match(/<loc>[^<]+<\/loc>/g)).toEqual([
      '<loc>https://x.dev/es/</loc>',
      '<loc>https://x.dev/en/</loc>',
    ]);
  });

  it('gives every url the full es, en and x-default alternates', () => {
    const links = xml.match(/<xhtml:link [^>]+\/>/g) ?? [];
    expect(links).toHaveLength(6);
    expect(links.slice(0, 3)).toEqual([
      '<xhtml:link rel="alternate" hreflang="es" href="https://x.dev/es/"/>',
      '<xhtml:link rel="alternate" hreflang="en" href="https://x.dev/en/"/>',
      '<xhtml:link rel="alternate" hreflang="x-default" href="https://x.dev/"/>',
    ]);
  });

  it('omits lastmod unless given and tolerates a trailing slash on site', () => {
    expect(xml).not.toContain('lastmod');
    expect(buildSitemap('https://x.dev/', '2026-10-17')).toContain('<lastmod>2026-10-17</lastmod>');
    expect(buildSitemap('https://x.dev/')).toBe(xml);
  });

  it('escapes XML special characters in URLs', () => {
    expect(buildSitemap('https://x.dev/?a=1&b=2')).toContain('&amp;');
  });
});
