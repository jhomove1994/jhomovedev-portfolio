import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SITE_URL } from '../../../src/lib/site';

const config = readFileSync('astro.config.mjs', 'utf8');

describe('astro.config.mjs', () => {
  it('derives `site` from the single SITE_URL constant instead of repeating the origin', () => {
    expect(config).toMatch(/import\s*\{\s*SITE_URL\s*\}\s*from\s*'\.\/src\/lib\/site(\.ts)?'/);
    expect(config).toMatch(/site:\s*SITE_URL/);
    expect(config).not.toContain(SITE_URL);
  });

  it('declares the es/en i18n routing with a prefixed default locale', () => {
    expect(config).toMatch(/defaultLocale:\s*'es'/);
    expect(config).toMatch(/locales:\s*\[\s*'es'\s*,\s*'en'\s*\]/);
    expect(config).toMatch(/prefixDefaultLocale:\s*true/);
    expect(config).toMatch(/redirectToDefaultLocale:\s*false/);
  });

  it('emits directory-style output with tolerant trailing slashes', () => {
    expect(config).toMatch(/trailingSlash:\s*'ignore'/);
    expect(config).toMatch(/format:\s*'directory'/);
  });

  it('registers the Tailwind v4 Vite plugin', () => {
    expect(config).toMatch(/from\s*'@tailwindcss\/vite'/);
    expect(config).toMatch(/plugins:\s*\[\s*tailwindcss\(\)\s*\]/);
  });

  it('registers the React integration for the hero island', () => {
    expect(config).toMatch(/import\s+react\s+from\s*'@astrojs\/react'/);
    expect(config).toMatch(/integrations:\s*\[\s*react\(\)\s*\]/);
  });

  it('keeps the existing no-binding adapter settings', () => {
    expect(config).toContain("imageService: 'compile'");
    expect(config).toMatch(/session:\s*false/);
  });
});
