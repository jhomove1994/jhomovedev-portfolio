// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // Pre-optimize images at build time and avoid provisioning the IMAGES binding.
  adapter: cloudflare({ imageService: 'compile' }),
  // Sessions are unused; disabling avoids the implicit SESSION KV binding.
  session: false,
});
