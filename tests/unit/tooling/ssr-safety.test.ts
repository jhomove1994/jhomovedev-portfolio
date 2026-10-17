import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const HEAVY =
  /(?:from|import)\s*\(?\s*['"](?:three|@react-three\/[\w-]+|postprocessing|gsap|lenis)(?:\/[^'"]*)?['"]/;
const SCENE_IMPORT = /['"][^'"]*components\/three\/|['"]\.\.?\/(?:\.\.\/)?three\//;
const MARKER = /WebGLRenderer/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(astro|tsx?|mjs)$/.test(entry.name) ? [path] : [];
  });
}

/** Pages, layouts and always-loaded components: everything that is not the lazy scene chunk. */
const ALWAYS_LOADED = ['src/pages', 'src/layouts', 'src/components', 'src/lib'].flatMap((dir) =>
  sourceFiles(dir).filter((file) => !file.startsWith('src/components/three/')),
);

describe('the 3D scene is only reachable through a dynamic import', () => {
  it('scans a meaningful set of always-loaded files', () => {
    expect(ALWAYS_LOADED.length).toBeGreaterThan(40);
    expect(ALWAYS_LOADED).toContain('src/components/hero/HeroIsland.tsx');
  });

  it('keeps three, R3F, postprocessing, gsap and lenis out of every always-loaded file', () => {
    const offenders = ALWAYS_LOADED.filter((file) => HEAVY.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('never statically imports src/components/three', () => {
    const offenders = ALWAYS_LOADED.filter((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .some(
          (line) =>
            /^\s*import\b(?!\s*\()/.test(line) &&
            !/^\s*import type\b/.test(line) &&
            SCENE_IMPORT.test(line),
        ),
    );
    expect(offenders).toEqual([]);
  });

  it('has exactly one dynamic import of the scene, in HeroIsland', () => {
    const importers = ALWAYS_LOADED.filter((file) =>
      /import\(\s*['"][^'"]*three\/DeskExperience['"]\s*\)/.test(readFileSync(file, 'utf8')),
    );
    expect(importers).toEqual(['src/components/hero/HeroIsland.tsx']);
  });
});

// Needs `pnpm build` first (pnpm verify builds last, so this runs in the e2e/CI order and locally
// after a build); the check is skipped, visibly, when there is no dist yet.
const hasDist = existsSync('dist/client/_astro') && existsSync('dist/server');
describe.skipIf(!hasDist)('built output (dist/ exists)', () => {
  const clientChunks = hasDist
    ? readdirSync('dist/client/_astro').filter((name) => name.endsWith('.js'))
    : [];

  it('ships the renderer in the scene chunk only', () => {
    const withRenderer = clientChunks.filter((name) =>
      MARKER.test(readFileSync(join('dist/client/_astro', name), 'utf8')),
    );
    expect(clientChunks.length).toBeGreaterThan(1);
    expect(withRenderer).toHaveLength(1);
    expect(withRenderer[0]).toMatch(/^DeskExperience\./);
  });

  it('keeps the renderer out of the server and prerender output', () => {
    const files = sourceFiles('dist/server').filter((file) =>
      MARKER.test(readFileSync(file, 'utf8')),
    );
    expect(files).toEqual([]);
  });
});
