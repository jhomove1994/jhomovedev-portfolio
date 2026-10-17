import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export interface ForbiddenTerm {
  label: string;
  value: string;
}

export interface Violation {
  path: string;
  label: string;
  value: string;
}

/** Case-insensitive search of every term in every file; blank terms are ignored. */
export function findViolations(
  files: readonly { path: string; source: string }[],
  terms: readonly ForbiddenTerm[],
): Violation[] {
  const active = terms.filter(({ value }) => value.trim() !== '');
  return files.flatMap(({ path, source }) => {
    const haystack = source.toLowerCase();
    return active
      .filter(({ value }) => haystack.includes(value.toLowerCase()))
      .map(({ label, value }) => ({ path, label, value }));
  });
}

/** Source languages that can carry literal portfolio content. Binary and data files are skipped. */
const SCANNED_EXTENSIONS = /\.(astro|tsx?|mjs|css)$/;

/** Keeps only the files whose extension can carry literal content (templates, islands, engine). */
export function selectScanned<T extends { path: string }>(files: readonly T[]): T[] {
  return files.filter(({ path }) => SCANNED_EXTENSIONS.test(path));
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((dirent) => {
    const full = join(dir, dirent.name);
    return dirent.isDirectory() ? listFiles(full) : [full];
  });
}

/** Reads every scannable source file under `dirs` (relative to `root`), with posix-style paths. */
export function collectSourceFiles(
  root: string,
  dirs: readonly string[],
): { path: string; source: string }[] {
  const files = dirs.flatMap((dir) => listFiles(join(root, dir)));
  return selectScanned(
    files.map((file) => ({
      path: relative(root, file).split(sep).join('/'),
      source: readFileSync(file, 'utf8'),
    })),
  );
}
