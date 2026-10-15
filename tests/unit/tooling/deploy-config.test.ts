import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('deploy configuration', () => {
  it('declares no paid or stateful bindings in wrangler.jsonc', () => {
    const wrangler = readFileSync('wrangler.jsonc', 'utf8');
    for (const key of ['kv_namespaces', 'images', 'ai', 'd1_databases', 'd1', 'r2_buckets', 'r2']) {
      expect(wrangler, `unexpected "${key}" key`).not.toMatch(new RegExp(`"${key}"\\s*:`));
    }
  });

  it('configures the adapter without implicit image or session bindings', () => {
    const astroConfig = readFileSync('astro.config.mjs', 'utf8');
    expect(astroConfig).toContain("imageService: 'compile'");
    expect(astroConfig).toMatch(/session:\s*false/);
  });

  it('does not track anything that looks like a GitHub token', () => {
    const patterns = [/github_pat_[A-Za-z0-9_]{20,}/, /ghp_[A-Za-z0-9]{20,}/];
    const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
    const offenders = files.filter((file) => {
      let text: string;
      try {
        text = readFileSync(file, 'utf8');
      } catch {
        return false;
      }
      return patterns.some((p) => p.test(text));
    });
    expect(offenders).toEqual([]);
  });
});
