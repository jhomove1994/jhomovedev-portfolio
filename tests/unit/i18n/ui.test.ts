import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ui, t, terminalLabels, type UiKey } from '../../../src/i18n/ui';
import { COMMAND_NAMES } from '../../../src/lib/terminal/types';
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

  it('uses a short, natural English remote label', () => {
    expect(t('en', 'labels.remote')).toBe('Remote');
  });

  it('translates the remote label', () => {
    expect(t('en', 'labels.remote')).not.toBe(t('es', 'labels.remote'));
  });
});

describe('terminal chrome strings', () => {
  const terminalKeys = (locale: 'es' | 'en') =>
    flatten(ui[locale]).filter((key) => key.startsWith('terminal.') || key.startsWith('hero.'));

  it('exists in both locales with identical key sets', () => {
    expect(terminalKeys('es').length).toBeGreaterThan(30);
    expect(terminalKeys('en').sort()).toEqual(terminalKeys('es').sort());
  });

  it.each(['es', 'en'] as const)('has no empty terminal or hero value in %s', (locale) => {
    for (const key of terminalKeys(locale)) {
      expect(t(locale, key as UiKey).trim(), `${locale}:${key}`).not.toBe('');
    }
  });

  it.each(['es', 'en'] as const)('describes every advertised command in %s', (locale) => {
    for (const name of COMMAND_NAMES) {
      expect(terminalLabels(locale).commands[name].trim(), `${locale}:${name}`).not.toBe('');
    }
  });

  it('reads natively in English and differs from Spanish', () => {
    expect(t('en', 'hero.toggleEnable3d')).toBe('Enable 3D');
    expect(t('en', 'hero.toggleDisable3d')).toBe('Disable 3D');
    expect(t('es', 'hero.toggleEnable3d')).toBe('Activar 3D');
    expect(t('es', 'hero.toggleDisable3d')).toBe('Desactivar 3D');
    expect(terminalLabels('en').commandNotFound).toBe('command not found: {input}');
    expect(terminalLabels('en').commandNotFound).not.toBe(terminalLabels('es').commandNotFound);
  });

  it('keeps every template placeholder in both locales', () => {
    const placeholders = (text: string) => text.match(/\{\w+\}/g)?.sort() ?? [];
    const en = flatten(ui.en).filter((key) => key.startsWith('terminal.'));
    for (const key of en) {
      expect(placeholders(t('es', key as UiKey)), key).toEqual(placeholders(t('en', key as UiKey)));
    }
  });

  it('falls back to the Spanish value when an English terminal key is missing', () => {
    const en = ui.en.terminal as unknown as Record<string, string | undefined>;
    const original = en.askStub;
    try {
      delete en.askStub;
      expect(t('en', 'terminal.askStub')).toBe(ui.es.terminal.askStub);
      expect(terminalLabels('en').askStub).toBe(ui.es.terminal.askStub);
    } finally {
      en.askStub = original;
    }
    expect(terminalLabels('en').askStub).toBe(original);
  });

  it('returns the requested locale labels', () => {
    expect(terminalLabels('es').inputLabel).toBe(ui.es.terminal.inputLabel);
    expect(terminalLabels('en').inputLabel).toBe(ui.en.terminal.inputLabel);
  });
});
