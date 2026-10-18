import { origin } from './alternates';

/** robots.txt: crawl everything except the CMS, and advertise the sitemap. */
export function buildRobots(site: string | undefined): string {
  return `User-agent: *\nDisallow: /admin\n\nSitemap: ${origin(site)}/sitemap.xml\n`;
}
