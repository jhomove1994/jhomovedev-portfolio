import type { APIRoute } from 'astro';
import { SITE_URL } from '../lib/site';
import { buildSitemap } from '../lib/seo/sitemap';

export const prerender = true;

// No <lastmod>: content changes through Git commits and there is no per-page date to vouch for.
export const GET: APIRoute = () =>
  new Response(buildSitemap(SITE_URL), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
