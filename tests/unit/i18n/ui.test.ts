import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ui, t, type UiKey } from '../../../src/i18n/ui';
import { CERTIFICATION_KINDS, CLUSTERS } from '../../../src/lib/content/schemas';
import { loadCollection } from '../../helpers/load-content';

function flatten(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('ui dictionary', () => {
  it('has the same key set in es and en', () => {
    expect(flatten(ui.en).sort()).toEqual(flatten(ui.es).sort());
  });

  it('has no empty strings', () => {
    for (const locale of ['es', 'en'] as const) {
      for (const key of flatten(ui[locale])) {
        expect(t(locale, key as UiKey).trim(), `${locale}:${key}`).not.toBe('');
      }
    }
  });

  it('covers the groups the layout needs', () => {
    const keys = flatten(ui.es);
    for (const prefix of ['nav.', 'buttons.', 'aria.']) {
      expect(
        keys.some((key) => key.startsWith(prefix)),
        prefix,
      ).toBe(true);
    }
    for (const cluster of [...CLUSTERS, 'languages', 'tools']) {
      expect(keys, cluster).toContain(`clusters.${cluster}`);
    }
    for (const kind of CERTIFICATION_KINDS) {
      expect(keys, kind).toContain(`certificationKinds.${kind}`);
    }
    for (const key of ['labels.spanishSuffix', 'labels.present', 'labels.inProgress']) {
      expect(keys, key).toContain(key);
    }
    expect(keys).toContain('buttons.copy');
    expect(keys).toContain('buttons.copied');
  });

  it('labels the training kind as "Course" in English', () => {
    expect(t('en', 'certificationKinds.training')).toBe('Course');
    expect(t('en', 'labels.spanishSuffix')).toBe('(Spanish)');
  });

  it('falls back to the Spanish value when an English key is missing', () => {
    const en = ui.en as unknown as { nav: Record<string, string | undefined> };
    const original = en.nav.about;
    try {
      delete en.nav.about;
      expect(t('en', 'nav.about')).toBe(ui.es.nav.about);
    } finally {
      en.nav.about = original;
    }
    expect(t('en', 'nav.about')).toBe(original);
  });

  it('returns the requested locale value when present', () => {
    expect(t('es', 'buttons.copy')).not.toBe(t('en', 'buttons.copy'));
  });

  it('contains no portfolio facts (email, linkedin, employers)', () => {
    const source = readFileSync(join(process.cwd(), 'src/i18n/ui.ts'), 'utf8');
    expect(source).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(source).not.toMatch(/linkedin/i);
    const employers = loadCollection('experience').map((entry) => String(entry.data.company));
    expect(employers.length).toBeGreaterThan(0);
    for (const employer of employers) {
      expect(source.toLowerCase(), employer).not.toContain(employer.toLowerCase());
    }
  });
});

describe('404 copy', () => {
  it.each(['es', 'en'] as const)('has a title, a hint and the language name for %s', (locale) => {
    expect(t(locale, 'notFound.title')).not.toBe('');
    expect(t(locale, 'notFound.hint')).not.toBe('');
    expect(t(locale, `localeNames.${locale}`)).not.toBe('');
  });

  it('names each language in its own language', () => {
    expect(t('en', 'localeNames.es')).toBe('Español');
    expect(t('es', 'localeNames.en')).toBe('English');
  });
});

describe('section copy', () => {
  it.each(['es', 'en'] as const)('has the remote and fallback labels for %s', (locale) => {
    expect(t(locale, 'labels.remote')).not.toBe('');
    expect(t(locale, 'labels.fallbackBadge')).not.toBe('');
  });

  it('translates the remote label', () => {
    expect(t('en', 'labels.remote')).not.toBe(t('es', 'labels.remote'));
  });
});
