import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import { entryIdFromPath } from '../../src/lib/content/entry-id';

const CONTENT_ROOT = join(process.cwd(), 'src/content');

export interface ContentFile {
  /** Path relative to the collection folder, e.g. `es/av-villas.md`. */
  path: string;
  /** Content Layer id, e.g. `es/av-villas` (or the bare filename without extension for stack). */
  id: string;
  data: Record<string, unknown>;
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((dirent) => {
    const full = join(dir, dirent.name);
    return dirent.isDirectory() ? listFiles(full) : [full];
  });
}

/** Front matter of a `---` delimited Markdown file; the body is ignored (content lives in YAML). */
function parseFrontmatter(source: string, file: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  if (!match) throw new Error(`Missing front matter in ${file}`);
  return parse(match[1] ?? '') as Record<string, unknown>;
}

/**
 * Reads every `.json` and `.md` file of one collection under `src/content/<collection>`. Parsing
 * errors name the offending file. `.gitkeep` and other extensions are skipped.
 */
export function loadCollection(collection: string): ContentFile[] {
  const base = join(CONTENT_ROOT, collection);
  return listFiles(base)
    .filter((file) => file.endsWith('.json') || file.endsWith('.md'))
    .sort()
    .map((file) => {
      const path = relative(base, file);
      const source = readFileSync(file, 'utf8');
      const data = file.endsWith('.json')
        ? (JSON.parse(source) as Record<string, unknown>)
        : parseFrontmatter(source, file);
      const id = path.includes('/') ? entryIdFromPath(path) : path.replace(/\.[^.]+$/, '');
      return { path, id, data };
    });
}
