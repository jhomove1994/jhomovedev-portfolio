import type { APIRoute } from 'astro';
import { SITE_URL } from '../lib/site';
import { buildRobots } from '../lib/seo/robots';

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(buildRobots(SITE_URL), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
