import { defineConfig } from 'vitest/config';

// Plain Vitest config: unit tests import only pure code from src/lib, so the
// Astro/Cloudflare Vite pipeline is intentionally not loaded (getViteConfig
// fails with Vitest 5 + Vite 8: "There is already a server associated with the config").
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
