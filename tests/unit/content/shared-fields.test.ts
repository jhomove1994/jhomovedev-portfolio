import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { SHARED_FIELDS, findSharedMismatches } from '../../../src/lib/content/shared-fields';

const entry = (id: string, data: Record<string, unknown>) => ({ id, data });

describe('findSharedMismatches', () => {
  it('reports an order that differs between locales', () => {
    const result = findSharedMismatches(
      [entry('es/gisoft', { order: 3 }), entry('en/gisoft', { order: 2 })],
      ['order'],
    );
    expect(result.mismatches).toEqual([{ slug: 'gisoft', field: 'order', es: 3, en: 2 }]);
    expect(result.unpaired).toEqual([]);
  });

  it('passes when shared fields are equal', () => {
    const data = { order: 1, start: '2024-05', stack: ['typescript', 'nestjs'] };
    const result = findSharedMismatches(
      [entry('es/a', data), entry('en/a', { ...data })],
      ['order', 'start', 'stack'],
    );
    expect(result).toEqual({ mismatches: [], unpaired: [] });
  });

  it('ignores fields that are not shared', () => {
    const result = findSharedMismatches(
      [
        entry('es/a', { order: 1, role: 'Desarrollador' }),
        entry('en/a', { order: 1, role: 'Dev' }),
      ],
      ['order'],
    );
    expect(result.mismatches).toEqual([]);
  });

  it('compares lists by value and order', () => {
    const result = findSharedMismatches(
      [entry('es/a', { stack: ['a', 'b'] }), entry('en/a', { stack: ['b', 'a'] })],
      ['stack'],
    );
    expect(result.mismatches).toHaveLength(1);
  });

  it('compares nested objects by value', () => {
    const same = findSharedMismatches(
      [
        entry('es/index', { contact: { email: 'a@b.c' } }),
        entry('en/index', { contact: { email: 'a@b.c' } }),
      ],
      ['contact'],
    );
    const different = findSharedMismatches(
      [
        entry('es/index', { contact: { email: 'a@b.c' } }),
        entry('en/index', { contact: { email: 'x@y.z' } }),
      ],
      ['contact'],
    );
    expect(same.mismatches).toEqual([]);
    expect(different.mismatches).toHaveLength(1);
  });

  it('treats a field present in one locale only as a mismatch', () => {
    const result = findSharedMismatches(
      [entry('es/a', { repoUrl: 'https://example.com' }), entry('en/a', {})],
      ['repoUrl'],
    );
    expect(result.mismatches).toEqual([
      { slug: 'a', field: 'repoUrl', es: 'https://example.com', en: undefined },
    ]);
  });

  it('treats a field absent in both locales as equal', () => {
    const result = findSharedMismatches([entry('es/a', {}), entry('en/a', {})], ['repoUrl']);
    expect(result.mismatches).toEqual([]);
  });

  it('lists entries present in one locale only as unpaired, not as a mismatch', () => {
    const result = findSharedMismatches(
      [
        entry('es/only-es', { order: 1 }),
        entry('en/only-en', { order: 9 }),
        entry('es/both', { order: 1 }),
        entry('en/both', { order: 1 }),
      ],
      ['order'],
    );
    expect(result.mismatches).toEqual([]);
    expect(result.unpaired).toEqual([
      { slug: 'only-es', locale: 'es' },
      { slug: 'only-en', locale: 'en' },
    ]);
  });

  it('returns nothing for an empty collection', () => {
    expect(findSharedMismatches([], ['order'])).toEqual({ mismatches: [], unpaired: [] });
  });
});

describe('SHARED_FIELDS', () => {
  type ConfigField = { name: string; i18n?: unknown };
  type ConfigCollection = {
    name: string;
    fields?: ConfigField[];
    files?: { name: string; fields: ConfigField[] }[];
  };

  const config = parse(readFileSync('public/admin/config.yml', 'utf8')) as {
    collections: ConfigCollection[];
  };

  /** Fields the admin copies to every locale file, keyed by schema registry name. */
  const duplicated = (): Record<string, string[]> => {
    const result: Record<string, string[]> = {};
    for (const collection of config.collections) {
      const groups = collection.files
        ? collection.files.map((file) => ({ name: file.name, fields: file.fields }))
        : [{ name: collection.name, fields: collection.fields ?? [] }];
      for (const group of groups) {
        result[group.name] = group.fields
          .filter((field) => field.i18n === 'duplicate')
          .map((field) => field.name);
      }
    }
    return result;
  };

  it('lists exactly the fields config.yml marks i18n: duplicate, per i18n collection', () => {
    const fromConfig = duplicated();
    for (const [collection, fields] of Object.entries(SHARED_FIELDS)) {
      expect([...fields].sort(), collection).toEqual([...(fromConfig[collection] ?? [])].sort());
    }
  });

  it('covers every i18n collection and no neutral one (stack has no locale files)', () => {
    expect(Object.keys(SHARED_FIELDS).sort()).toEqual([
      'certifications',
      'experience',
      'leadership',
      'media',
      'profile',
      'projects',
    ]);
  });
});
