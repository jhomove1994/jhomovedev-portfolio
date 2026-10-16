// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

import { SITE_URL } from './src/lib/site.ts';

// https://astro.build/config
export default defineConfig({
  // Single source of truth for canonical and hreflang URLs (decision G3 lives in src/lib/site.ts).
  site: SITE_URL,
  // Pre-optimize images at build time and avoid provisioning the IMAGES binding.
  adapter: cloudflare({ imageService: 'compile' }),
  // Sessions are unused; disabling avoids the implicit SESSION KV binding.
  session: false,
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  vite: { plugins: [tailwindcss()] },
});
