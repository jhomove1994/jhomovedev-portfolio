import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mediaSchema, profileSchema } from '../../../src/lib/content/schemas';

/** Files shaped like Sveltia output, including `""` for cleared optional fields. */
function sveltiaFixture(name: string): unknown {
  const url = new URL(`../../fixtures/content/sveltia/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8'));
}

describe('Sveltia output round-trip', () => {
  it('parses a profile whose cleared whatsapp is ""', () => {
    const result = profileSchema.safeParse(sveltiaFixture('profile'));
    expect(result.success).toBe(true);
    expect(result.data?.contact.whatsapp).toBeUndefined();
    expect(result.data?.contact.email).toBe('ada@example.com');
  });

  it('parses media whose cleared cv and ogImage are ""', () => {
    expect(mediaSchema.parse(sveltiaFixture('media'))).toEqual({});
  });
});
