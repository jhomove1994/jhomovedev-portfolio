import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseEntryId } from '../../../src/lib/content/entry-id';
import { isTodo } from '../../../src/lib/text';
import { loadCollection } from '../../helpers/load-content';

const ROOT = process.cwd();

/** Every file under `dir` (absolute); an absent directory yields no files. */
function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((dirent) => {
    const full = join(dir, dirent.name);
    return dirent.isDirectory() ? listFiles(full) : [full];
  });
}

/** Text of every file under the given repo-relative folders, keyed by its repo-relative path. */
function readTextFiles(folders: string[], extensions?: string[]): Map<string, string> {
  const files = new Map<string, string>();
  for (const folder of folders) {
    for (const file of listFiles(join(ROOT, folder))) {
      if (extensions && !extensions.some((extension) => file.endsWith(extension))) continue;
      files.set(file.slice(ROOT.length + 1), readFileSync(file, 'utf8'));
    }
  }
  return files;
}

/** Repo-relative paths of files whose text matches the pattern. */
function filesMatching(files: Map<string, string>, pattern: RegExp): string[] {
  return [...files].filter(([, text]) => pattern.test(text)).map(([path]) => path);
}

/** Every string leaf of a parsed content value. */
function stringLeaves(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringLeaves);
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringLeaves);
  return [];
}

const COLLECTIONS = [
  'stack',
  'profile',
  'media',
  'leadership',
  'experience',
  'certifications',
  'projects',
];

// (a) Legacy platform mentions are never part of the positioning (CLAUDE.md rule 5).
const LEGACY = /mainframe|cobol/i;

// (b) Numbers presented as a metric: percentages, multipliers, users, milliseconds, millions.
const METRIC = /\d(?:[.,]\d+)?\s?(?:%|x\b|users\b|usuarios\b|ms\b|M\b)/;

// (c) A generic phone shape (10 digits, optional country prefix, optional separators) and the
// telephone URI scheme. The scheme is written with a character class so this file never matches itself.
const PHONE = /(?<![\d.])(?:\+?\d{1,3}[\s.-])?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/;
const TEL_SCHEME = /t[e]l:/i;

describe('audit: legacy mentions', () => {
  it('finds neither mainframe nor COBOL in content or the UI dictionary', () => {
    const files = readTextFiles(['src/content', 'src/i18n']);
    expect(files.size).toBeGreaterThan(0);
    expect(filesMatching(files, LEGACY)).toEqual([]);
  });

  it('detects the legacy mentions it guards against', () => {
    expect(LEGACY.test('Maintained a Mainframe batch')).toBe(true);
    expect(LEGACY.test('migrated COBOL jobs')).toBe(true);
    expect(LEGACY.test('NestJS microservices')).toBe(false);
  });
});

describe('audit: invented metrics', () => {
  const values = COLLECTIONS.flatMap((collection) =>
    loadCollection(collection).flatMap((file) =>
      stringLeaves(file.data)
        // Links, e-mail addresses and upload paths carry digits that are identifiers, not figures.
        .filter((text) => !/^(https?:\/\/|\/uploads\/)/.test(text) && !text.includes('@'))
        .map((text) => ({ source: `${collection}/${file.path}`, text })),
    ),
  );

  it('scans a non-empty seed', () => {
    expect(values.length).toBeGreaterThan(0);
  });

  it('has no number followed by a metric unit in any seeded text', () => {
    const offenders = values.filter(({ text }) => METRIC.test(text)).map(({ source }) => source);
    expect(offenders).toEqual([]);
  });

  it('flags metric-looking text but not dates, years or certification codes', () => {
    for (const metric of ['cut latency by 40%', '3x faster', '2000 users', '120 ms', '1.5M rows']) {
      expect(METRIC.test(metric), metric).toBe(true);
    }
    for (const plain of ['2024-05', '6+ years', 'AIF-C01', 'CLF-C02', 'Angular 17', 'Node.js']) {
      expect(METRIC.test(plain), plain).toBe(false);
    }
  });
});

describe('audit: phone numbers', () => {
  // Synthetic number from the reserved 555-01xx range; never a real one.
  const FAKE = ['+1 555 010 0199', '555-010-0199', '(555) 010 0199', '5550100199'];

  it('detects phone shapes and the tel scheme', () => {
    for (const fake of FAKE) expect(PHONE.test(fake), fake).toBe(true);
    expect(TEL_SCHEME.test('tel' + ':5550100199')).toBe(true);
  });

  it('ignores dates, years and certification codes', () => {
    for (const plain of ['2024-05', '2019-04 to 2023-01', 'AIF-C01', 'order 12']) {
      expect(PHONE.test(plain), plain).toBe(false);
    }
  });

  it('keeps phone numbers and the tel scheme out of content and the admin config', () => {
    const files = readTextFiles(['src/content', 'public/admin']);
    expect(files.size).toBeGreaterThan(0);
    expect(filesMatching(files, PHONE)).toEqual([]);
    expect(filesMatching(files, TEL_SCHEME)).toEqual([]);
  });

  it('keeps them out of the built pages when dist exists', () => {
    const files = readTextFiles(['dist'], ['.html', '.txt']);
    expect(filesMatching(files, PHONE)).toEqual([]);
    expect(filesMatching(files, TEL_SCHEME)).toEqual([]);
  });
});

describe('audit: project drafts', () => {
  const projects = loadCollection('projects');
  const NARRATIVE = ['summary', 'context', 'challenge', 'role', 'result'] as const;

  it('seeds at least one project per locale', () => {
    const locales = new Set(projects.map((file) => parseEntryId(file.id).locale));
    expect([...locales].sort()).toEqual(['en', 'es']);
  });

  it.each(projects.map((file) => [file.id, file] as const))(
    '%s is an unpublished draft with TODO(autor) narrative',
    (_id, file) => {
      expect(file.data.published).toBe(false);
      for (const field of NARRATIVE) {
        expect(isTodo(file.data[field]), `${field} must start with TODO(autor)`).toBe(true);
      }
      const bullets = String(file.data.decisions)
        .split('\n')
        .filter((line) => line.trim() !== '');
      expect(bullets.length).toBeGreaterThan(0);
      for (const bullet of bullets) {
        expect(bullet.startsWith('- TODO(autor):'), bullet).toBe(true);
      }
    },
  );
});

describe('audit: locale parity', () => {
  const slugsByLocale = (collection: string, locale: string) =>
    loadCollection(collection)
      .map((file) => parseEntryId(file.id))
      .filter((parsed) => parsed.locale === locale)
      .map((parsed) => parsed.slug)
      .sort();

  it.each(['leadership', 'experience', 'certifications', 'projects'])(
    '%s has the same slugs in es and en',
    (collection) => {
      const es = slugsByLocale(collection, 'es');
      expect(es.length).toBeGreaterThan(0);
      expect(slugsByLocale(collection, 'en')).toEqual(es);
    },
  );

  it.each(['profile', 'media'])('%s singleton has an es file and an en file', (collection) => {
    const names = readdirSync(join(ROOT, 'src/content', collection)).filter((name) =>
      name.endsWith('.json'),
    );
    expect(names).toContain('es.json');
    expect(names).toContain('en.json');
  });
});
