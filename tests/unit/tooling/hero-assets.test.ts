import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const STILL_DIR = 'src/assets/hero';
const IMAGE_BUDGET_BYTES = 150 * 1024;
const CAPTURE_SCRIPT = 'scripts/capture-hero.ts';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };

const stills = () =>
  existsSync(STILL_DIR)
    ? readdirSync(STILL_DIR).filter((f) => /\.(png|jpe?g|webp|avif)$/.test(f))
    : [];

describe('hero capture workflow', () => {
  it('wires capture:hero to the script that exists on disk', () => {
    expect(pkg.scripts['capture:hero']).toBe(`node ${CAPTURE_SCRIPT}`);
    expect(existsSync(CAPTURE_SCRIPT)).toBe(true);
  });

  it('is never part of the build', () => {
    expect(pkg.scripts.build).toBe('astro build');
    expect(readFileSync('astro.config.mjs', 'utf8')).not.toContain('capture-hero');
  });

  it('only talks to local origins', () => {
    const origins = readFileSync(CAPTURE_SCRIPT, 'utf8').match(/https?:\/\/[^\s'"`/]+/g) ?? [];
    expect(origins.every((o) => /^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(o))).toBe(true);
  });
});

describe('committed hero still', () => {
  it('ships exactly one still, within the image budget', () => {
    const files = stills();
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^hero-still\./);
    expect(statSync(join(STILL_DIR, files[0]!)).size).toBeLessThanOrEqual(IMAGE_BUDGET_BYTES);
  });

  it('has a monitor anchor expressed as fractions inside the stage', () => {
    const anchor = JSON.parse(readFileSync('src/lib/hero/still-anchor.json', 'utf8')) as Record<
      'x' | 'y' | 'width' | 'height',
      number
    >;
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      expect(anchor[key]).toBeGreaterThan(0);
      expect(anchor[key]).toBeLessThan(1);
    }
    expect(anchor.x + anchor.width).toBeLessThan(1);
    expect(anchor.y + anchor.height).toBeLessThan(1);
  });
});
