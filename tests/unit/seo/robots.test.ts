import { describe, expect, it } from 'vitest';
import { buildRobots } from '../../../src/lib/seo/robots';

describe('buildRobots', () => {
  it('allows crawling except /admin and points at the sitemap', () => {
    expect(buildRobots('https://x.dev')).toBe(
      'User-agent: *\nDisallow: /admin\n\nSitemap: https://x.dev/sitemap.xml\n',
    );
  });

  it('tolerates a trailing slash on site', () => {
    expect(buildRobots('https://x.dev/')).toContain('Sitemap: https://x.dev/sitemap.xml\n');
  });
});
