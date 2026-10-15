import { describe, expect, it, vi } from 'vitest';
import { localizeCollection, localizeSingleton } from '../../../src/lib/content/localize';

const entry = (id: string, title: string) => ({ id, data: { title } });

const gisoft = { es: entry('es/gisoft', 'Gisoft ES'), en: entry('en/gisoft', 'Gisoft EN') };
const wepayu = { es: entry('es/wepayu4', 'WePayU4 ES'), en: entry('en/wepayu4', 'WePayU4 EN') };

describe('localizeCollection', () => {
  it('returns the requested locale without fallback when present', () => {
    const result = localizeCollection([gisoft.es, gisoft.en, wepayu.es, wepayu.en], 'en');
    expect(result.map((item) => [item.slug, item.entry.data.title, item.isFallback])).toEqual([
      ['gisoft', 'Gisoft EN', false],
      ['wepayu4', 'WePayU4 EN', false],
    ]);
  });

  it('falls back to es when the en entry is missing and reports each slug once', () => {
    const onFallback = vi.fn();
    const result = localizeCollection([gisoft.es, gisoft.en, wepayu.es], 'en', { onFallback });

    expect(result.map((item) => [item.slug, item.entry.data.title, item.isFallback])).toEqual([
      ['gisoft', 'Gisoft EN', false],
      ['wepayu4', 'WePayU4 ES', true],
    ]);
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(onFallback).toHaveBeenCalledWith('wepayu4', 'en');
  });

  it('falls back silently when onFallback is omitted', () => {
    const result = localizeCollection([wepayu.es], 'en');
    expect(result).toHaveLength(1);
    expect(result[0]?.isFallback).toBe(true);
  });

  it('keeps en-only slugs when resolving en', () => {
    const enOnly = entry('en/extra', 'Extra EN');
    const result = localizeCollection([gisoft.es, gisoft.en, enOnly], 'en');
    expect(result.map((item) => item.slug)).toEqual(['gisoft', 'extra']);
    expect(result[1]?.isFallback).toBe(false);
  });

  it('throws when resolving es for an en-only slug', () => {
    const enOnly = entry('en/extra', 'Extra EN');
    expect(() => localizeCollection([gisoft.es, enOnly], 'es')).toThrow(/extra/);
  });

  it('returns es entries when resolving es', () => {
    const result = localizeCollection([gisoft.es, gisoft.en], 'es');
    expect(result.map((item) => [item.entry.id, item.isFallback])).toEqual([['es/gisoft', false]]);
  });
});

describe('localizeSingleton', () => {
  const es = entry('es/index', 'Perfil');
  const en = entry('en/index', 'Profile');

  it('returns the requested locale when present', () => {
    expect(localizeSingleton([es, en], 'en')).toMatchObject({
      entry: { data: { title: 'Profile' } },
      isFallback: false,
    });
  });

  it('falls back to es and calls onFallback once', () => {
    const onFallback = vi.fn();
    const result = localizeSingleton([es], 'en', { onFallback });
    expect(result.entry.data.title).toBe('Perfil');
    expect(result.isFallback).toBe(true);
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(onFallback).toHaveBeenCalledWith('index', 'en');
  });

  it('throws when es is required but missing', () => {
    expect(() => localizeSingleton([en], 'es')).toThrow(/es/);
    expect(() => localizeSingleton([], 'en')).toThrow();
  });
});
