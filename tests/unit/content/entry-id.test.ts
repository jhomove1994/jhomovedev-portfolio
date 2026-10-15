import { describe, expect, it } from 'vitest';
import { entryIdFromPath, parseEntryId } from '../../../src/lib/content/entry-id';
import { DEFAULT_LOCALE, LOCALES, isLocale } from '../../../src/i18n/locales';

describe('locales', () => {
  it('exposes es and en with es as default', () => {
    expect(LOCALES).toEqual(['es', 'en']);
    expect(DEFAULT_LOCALE).toBe('es');
  });

  it('isLocale accepts only supported locales', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe('entryIdFromPath', () => {
  it('strips the extension from locale-folder entries', () => {
    expect(entryIdFromPath('es/av-villas.md')).toBe('es/av-villas');
    expect(entryIdFromPath('en/gisoft.json')).toBe('en/gisoft');
  });

  it('keeps nested slugs', () => {
    expect(entryIdFromPath('en/group/deep-slug.md')).toBe('en/group/deep-slug');
  });

  it('maps singleton files named by locale to <locale>/index', () => {
    expect(entryIdFromPath('es.json')).toBe('es/index');
    expect(entryIdFromPath('en.json')).toBe('en/index');
  });

  it('maps <name>.<locale>.json singleton files to <locale>/index', () => {
    expect(entryIdFromPath('profile.es.json')).toBe('es/index');
    expect(entryIdFromPath('media.en.json')).toBe('en/index');
  });

  it('throws on an unknown locale instead of accepting it silently', () => {
    expect(() => entryIdFromPath('fr/gisoft.md')).toThrow(/fr/);
    expect(() => entryIdFromPath('fr.json')).toThrow(/fr/);
    expect(() => entryIdFromPath('profile.fr.json')).toThrow(/fr/);
  });
});

describe('parseEntryId', () => {
  it('splits locale and slug', () => {
    expect(parseEntryId('es/gisoft')).toEqual({ locale: 'es', slug: 'gisoft' });
    expect(parseEntryId('en/group/deep')).toEqual({ locale: 'en', slug: 'group/deep' });
  });

  it('parses singleton ids', () => {
    expect(parseEntryId('es/index')).toEqual({ locale: 'es', slug: 'index' });
  });

  it('throws on an unknown locale', () => {
    expect(() => parseEntryId('fr/gisoft')).toThrow(/fr/);
  });

  it('throws on an id without a slug', () => {
    expect(() => parseEntryId('es')).toThrow();
  });
});
