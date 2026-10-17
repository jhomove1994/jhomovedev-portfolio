import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCollection } from '../../helpers/load-content';
import {
  collectSourceFiles,
  findViolations,
  selectScanned,
  type ForbiddenTerm,
} from '../../helpers/scan-templates';

const ROOT = process.cwd();
const SCANNED_DIRS = ['src/components', 'src/layouts', 'src/pages', 'src/lib/terminal'];
const SCANNED_FILES = ['src/i18n/ui.ts'];
// Spelled in two pieces so the repository-wide phone scan never matches this guard itself.
const TEL_SCHEME = 'te' + 'l:';

function templateFiles(): { path: string; source: string }[] {
  const extra = SCANNED_FILES.map((file) => ({
    path: file,
    source: readFileSync(join(ROOT, file), 'utf8'),
  }));
  return [...collectSourceFiles(ROOT, SCANNED_DIRS), ...extra];
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

describe('scan targets', () => {
  const seeded = 'Seeded Employer Inc';
  const terms: ForbiddenTerm[] = [{ label: 'employer', value: seeded }];

  it('reads .tsx islands and the terminal engine, not only templates', () => {
    expect(SCANNED_DIRS).toContain('src/lib/terminal');
    const files = collectSourceFiles(ROOT, SCANNED_DIRS);
    expect(files.some((file) => file.path.startsWith('src/lib/terminal/'))).toBe(true);
    expect(files.every((file) => /\.(astro|tsx?|mjs|css)$/.test(file.path))).toBe(true);
  });

  it('flags a seeded literal in a .tsx island and in an engine file (in-memory fixtures)', () => {
    const fixtures = [
      { path: 'src/components/terminal/Fixture.tsx', source: `<p>${seeded}</p>` },
      { path: 'src/lib/terminal/fixture.ts', source: `export const x = '${seeded}';` },
    ];
    expect(selectScanned(fixtures)).toEqual(fixtures);
    expect(findViolations(selectScanned(fixtures), terms).map((v) => v.path)).toEqual([
      'src/components/terminal/Fixture.tsx',
      'src/lib/terminal/fixture.ts',
    ]);
  });

  it('ignores files that are not source code', () => {
    const fixtures = [{ path: 'src/components/x.png', source: seeded }];
    expect(selectScanned(fixtures)).toEqual([]);
  });
});
