import { describe, expect, it } from 'vitest';
import { pickLocale } from '../../../src/lib/i18n/accept-language';
import { LOCALES } from '../../../src/i18n/locales';

const pick = (header: string | null | undefined) => pickLocale(header, LOCALES, 'es');

describe('pickLocale', () => {
  it.each([
    ['en-US,en;q=0.9', 'en'],
    ['es-CO,es;q=0.9,en;q=0.8', 'es'],
    ['es;q=0.3,en;q=0.9', 'en'],
    ['fr-FR,fr;q=0.9', 'es'],
    ['es;q=0,en', 'en'],
    ['EN-gb', 'en'],
    ['en;q=0.8, es;q=0.8', 'en'],
    ['es;q=0.8, en;q=0.8', 'es'],
  ] as const)('maps %j to %s', (header, expected) => {
    expect(pick(header)).toBe(expected);
  });

  it('resolves the wildcard to the fallback locale', () => {
    expect(pick('*')).toBe('es');
    expect(pickLocale('*', LOCALES, 'en')).toBe('en');
  });

  it('uses the fallback for missing or empty headers', () => {
    expect(pick(null)).toBe('es');
    expect(pick(undefined)).toBe('es');
    expect(pick('')).toBe('es');
    expect(pick('   ')).toBe('es');
  });

  it('does not throw on malformed headers and falls back', () => {
    expect(() => pick(';;q=abc,,')).not.toThrow();
    expect(pick(';;q=abc,,')).toBe('es');
    expect(pick('en;q=abc')).toBe('es');
    expect(pick('en;q=7')).toBe('es');
    expect(pick('\u0000\n,,;')).toBe('es');
  });

  it('only returns values from the supported allowlist', () => {
    const evil = '"><script>alert(1)</script>,//evil.example';
    expect(['es', 'en']).toContain(pick(evil));
    expect(pickLocale('en', ['es'], 'es')).toBe('es');
  });

  it('keeps the first item on ties and ignores unsupported higher q', () => {
    expect(pick('fr;q=1,en;q=0.1')).toBe('en');
  });
});
