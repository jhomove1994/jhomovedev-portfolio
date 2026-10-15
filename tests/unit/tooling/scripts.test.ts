import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };

describe('package scripts', () => {
  it.each([
    'test',
    'test:watch',
    'check',
    'lint',
    'format',
    'format:check',
    'test:e2e',
    'verify',
    'preview',
  ])('defines the "%s" script', (name) => {
    expect(pkg.scripts[name]).toBeTypeOf('string');
  });

  it('keeps build as a plain astro build without type checking', () => {
    expect(pkg.scripts.build).toBe('astro build');
    expect(pkg.scripts.build).not.toContain('astro check');
  });

  it('ignores local secret files in .gitignore', () => {
    const lines = readFileSync('.gitignore', 'utf8')
      .split('\n')
      .map((l) => l.trim());
    expect(lines.some((l) => l === '.dev.vars' || l === '.dev.vars*')).toBe(true);
  });
});
