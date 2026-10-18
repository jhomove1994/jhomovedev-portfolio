import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { SITE_URL } from '../../../src/lib/site';
import { buildRobots } from '../../../src/lib/seo/robots';

const read = (path: string): string => readFileSync(path, 'utf8');

/** Directives of the `User-agent: *` group, ignoring comments and blank lines. */
function wildcardDisallows(robots: string): string[] {
  const disallows: string[] = [];
  let inWildcardGroup = false;
  for (const raw of robots.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    const [field, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (/^user-agent$/i.test(field)) inWildcardGroup = value === '*';
    else if (inWildcardGroup && /^disallow$/i.test(field)) disallows.push(value);
  }
  return disallows;
}

describe('public/admin/index.html', () => {
  const html = read('public/admin/index.html');

  it('asks crawlers not to index or follow the admin page', () => {
    expect(html).toMatch(/<meta\s+name="robots"\s+content="noindex,\s*nofollow"\s*\/?>/);
  });

  it('loads Sveltia CMS from a version-pinned CDN script', () => {
    expect(html).toMatch(
      /<script\s+src="https:\/\/unpkg\.com\/@sveltia\/cms@\d+\.\d+\.\d+\/dist\/sveltia-cms\.js"/,
    );
  });

  it('declares the document language and viewport', () => {
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('name="viewport"');
  });
});

describe('robots.txt (built from SITE_URL)', () => {
  it('disallows /admin for every crawler', () => {
    expect(wildcardDisallows(buildRobots(SITE_URL))).toContain('/admin');
  });

  it('does not disallow the whole site', () => {
    expect(wildcardDisallows(buildRobots(SITE_URL))).not.toContain('/');
  });
});

describe('public/uploads', () => {
  it('exists in git so the CMS media folder resolves on a fresh checkout', () => {
    expect(existsSync('public/uploads/.gitkeep')).toBe(true);
  });
});
