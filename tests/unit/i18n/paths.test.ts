import { describe, expect, it } from 'vitest';
import { localizedPath, stripLocale, switchLocalePath } from '../../../src/lib/i18n/paths';

describe('localizedPath', () => {
  it('builds the locale home with a trailing slash', () => {
    expect(localizedPath('es')).toBe('/es/');
    expect(localizedPath('en', '/')).toBe('/en/');
  });

  it('prefixes nested paths and normalizes slashes', () => {
    expect(localizedPath('en', '/about/')).toBe('/en/about/');
    expect(localizedPath('es', 'about')).toBe('/es/about/');
    expect(localizedPath('es', '//a//b')).toBe('/es/a/b/');
  });
});

describe('stripLocale', () => {
  it('removes a leading locale segment', () => {
    expect(stripLocale('/en/x/')).toBe('/x/');
    expect(stripLocale('/es/')).toBe('/');
    expect(stripLocale('/es')).toBe('/');
  });

  it('leaves paths without a locale prefix untouched', () => {
    expect(stripLocale('/')).toBe('/');
    expect(stripLocale('/about/')).toBe('/about/');
    expect(stripLocale('/english/')).toBe('/english/');
    expect(stripLocale('/fr/x/')).toBe('/fr/x/');
  });
});

describe('switchLocalePath', () => {
  it('swaps the locale and keeps the rest of the path', () => {
    expect(switchLocalePath('/es/', 'en')).toBe('/en/');
    expect(switchLocalePath('/en/about/', 'es')).toBe('/es/about/');
  });

  it('adds a prefix when the path has none', () => {
    expect(switchLocalePath('/', 'en')).toBe('/en/');
  });
});
