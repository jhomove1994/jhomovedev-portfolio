import { defineConfig, devices } from '@playwright/test';

// Override when another dev server already holds 4321 (reuseExistingServer would hit it instead).
const PORT = Number(process.env.E2E_PORT ?? 4321);
const ORIGIN = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: ORIGIN,
  },
  webServer: {
    // --ignore-lock keeps the server in the foreground (Astro 7 auto-backgrounds the preview when it
    // detects an agent/CI shell, which makes Playwright think the process exited early).
    command: `pnpm build && pnpm astro preview --ignore-lock --port ${PORT}`,
    url: `${ORIGIN}/`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
  ],
});
