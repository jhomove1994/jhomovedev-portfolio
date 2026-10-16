import { describe, expect, it } from 'vitest';
import { buildAlternates, buildHeadMeta } from '../../../src/lib/seo/alternates';

const SITE = 'https://x.dev';

describe('buildAlternates', () => {
  it('returns es, en and x-default for the home path', () => {
    expect(buildAlternates(SITE, '/es/')).toEqual([
      { hreflang: 'es', href: 'https://x.dev/es/' },
      { hreflang: 'en', href: 'https://x.dev/en/' },
      { hreflang: 'x-default', href: 'https://x.dev/' },
    ]);
  });

  it('accepts a path without locale and tolerates a trailing slash on site', () => {
    expect(buildAlternates('https://x.dev/', '/')).toEqual(buildAlternates(SITE, '/en/'));
  });

  it('points x-default at the default-locale URL for non-home paths', () => {
    const alternates = buildAlternates(SITE, '/en/about/');
    expect(alternates.find((a) => a.hreflang === 'x-default')?.href).toBe(
      'https://x.dev/es/about/',
    );
    expect(alternates.find((a) => a.hreflang === 'en')?.href).toBe('https://x.dev/en/about/');
  });

  it('throws a clear error when site is missing', () => {
    expect(() => buildAlternates(undefined, '/es/')).toThrow(/site/i);
    expect(() => buildAlternates('', '/es/')).toThrow(/site/i);
  });
});

describe('buildHeadMeta', () => {
  it('builds a per-locale canonical and og locale mapping', () => {
    const es = buildHeadMeta({ site: SITE, locale: 'es', path: '/es/' });
    expect(es.canonical).toBe('https://x.dev/es/');
    expect(es.ogLocale).toBe('es_CO');
    expect(es.ogLocaleAlternates).toEqual(['en_US']);

    const en = buildHeadMeta({ site: SITE, locale: 'en', path: '/en/' });
    expect(en.canonical).toBe('https://x.dev/en/');
    expect(en.ogLocale).toBe('en_US');
    expect(en.ogLocaleAlternates).toEqual(['es_CO']);
  });

  it('includes the alternates', () => {
    expect(buildHeadMeta({ site: SITE, locale: 'en', path: '/en/' }).alternates).toHaveLength(3);
  });

  it('omits og:image when unset and absolutizes upload paths when set', () => {
    expect(buildHeadMeta({ site: SITE, locale: 'es', path: '/es/' }).ogImage).toBeUndefined();
    expect(
      buildHeadMeta({ site: SITE, locale: 'es', path: '/es/', ogImage: '/uploads/og.png' }).ogImage,
    ).toBe('https://x.dev/uploads/og.png');
  });

  it('throws when site is undefined', () => {
    expect(() => buildHeadMeta({ site: undefined, locale: 'es', path: '/es/' })).toThrow(/site/i);
  });
});
