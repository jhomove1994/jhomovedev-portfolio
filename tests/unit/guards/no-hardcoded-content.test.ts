import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCollection } from '../../helpers/load-content';
import { findViolations, type ForbiddenTerm } from '../../helpers/scan-templates';

const ROOT = process.cwd();
const SCANNED_DIRS = ['src/components', 'src/layouts', 'src/pages'];
const SCANNED_FILES = ['src/i18n/ui.ts'];
// Spelled in two pieces so the repository-wide phone scan never matches this guard itself.
const TEL_SCHEME = 'te' + 'l:';

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((dirent) => {
    const full = join(dir, dirent.name);
    return dirent.isDirectory() ? listFiles(full) : [full];
  });
}

function templateFiles(): { path: string; source: string }[] {
  const files = [
    ...SCANNED_DIRS.flatMap((dir) => listFiles(join(ROOT, dir))),
    ...SCANNED_FILES.map((file) => join(ROOT, file)),
  ];
  return files.map((file) => ({
    path: relative(ROOT, file),
    source: readFileSync(file, 'utf8'),
  }));
}

/** Facts that must come from `src/content/`, derived from the seeded files at test time. */
function seededFacts(): ForbiddenTerm[] {
  const profiles = loadCollection('profile');
  const contacts = profiles.map((p) => p.data.contact as { email: string; linkedin: string });
  const companies = loadCollection('experience').map((e) => String(e.data.company));
  return [
    ...contacts.map(({ email }) => ({ label: 'email', value: email })),
    ...contacts.map(({ linkedin }) => ({ label: 'linkedin url', value: linkedin })),
    ...companies.map((value) => ({ label: 'employer', value })),
  ];
}

describe('scan helper', () => {
  const terms: ForbiddenTerm[] = [
    { label: 'email', value: 'someone@example.com' },
    { label: 'employer', value: 'Acme Corp' },
  ];

  it('reports each forbidden term with its file', () => {
    const files = [
      { path: 'a.astro', source: '<p>Write to someone@example.com</p>' },
      { path: 'b.astro', source: '<h1>Worked at acme corp</h1>' },
      { path: 'c.astro', source: '<p>clean</p>' },
    ];
    expect(findViolations(files, terms)).toEqual([
      { path: 'a.astro', label: 'email', value: 'someone@example.com' },
      { path: 'b.astro', label: 'employer', value: 'Acme Corp' },
    ]);
  });

  it('finds nothing in clean files and ignores empty terms', () => {
    const files = [{ path: 'c.astro', source: '<p>clean</p>' }];
    expect(findViolations(files, [...terms, { label: 'blank', value: '  ' }])).toEqual([]);
  });

  it('flags the phone scheme and form markup given as plain terms', () => {
    const files = [{ path: 'd.astro', source: `<a href="${TEL_SCHEME}1">x</a><form></form>` }];
    expect(
      findViolations(files, [
        { label: 'phone link', value: TEL_SCHEME },
        { label: 'form', value: '<form' },
      ]).map((v) => v.label),
    ).toEqual(['phone link', 'form']);
  });
});

describe('templates carry no portfolio content', () => {
  const files = templateFiles();

  it('scans real files (the guard is not vacuous)', () => {
    expect(files.length).toBeGreaterThan(3);
    expect(files.map((f) => f.path)).toContain('src/i18n/ui.ts');
    expect(seededFacts().length).toBeGreaterThanOrEqual(8);
  });

  it('contains no seeded email, LinkedIn url or employer name', () => {
    expect(findViolations(files, seededFacts())).toEqual([]);
  });

  it('has no phone link and no form', () => {
    const forbidden: ForbiddenTerm[] = [
      { label: 'phone link', value: TEL_SCHEME },
      { label: 'form', value: '<form' },
    ];
    expect(findViolations(files, forbidden)).toEqual([]);
  });
});
