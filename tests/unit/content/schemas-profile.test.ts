import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mediaSchema, profileSchema } from '../../../src/lib/content/schemas';

function fixture(dir: string, name: string): unknown {
  const url = new URL(`../../fixtures/content/${dir}/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8'));
}

type Json = Record<string, unknown>;

const validProfile = (): Json => fixture('profile', 'valid') as Json;

/** The valid fixture with top-level overrides, so each case shows its single differing field. */
const withProfile = (overrides: Json): Json => ({ ...validProfile(), ...overrides });

const withContact = (overrides: Json): Json =>
  withProfile({ contact: { ...(validProfile().contact as Json), ...overrides } });

describe('profileSchema', () => {
  it('accepts a complete profile', () => {
    const result = profileSchema.safeParse(validProfile());
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      name: 'Ada Example',
      yearsExperience: 6,
      availability: 'open-to-offers',
      contact: { email: 'ada@example.com' },
      seo: { title: 'Ada Example' },
    });
    expect(result.data?.languages).toEqual([
      { name: 'Spanish', level: 'Native' },
      { name: 'English', level: 'Intermediate' },
    ]);
  });

  it('rejects an invalid email naming contact.email', () => {
    const result = profileSchema.safeParse(withContact({ email: 'not-an-email' }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['contact', 'email']);
  });

  it('accepts a profile without whatsapp', () => {
    const contact = { ...(validProfile().contact as Json) };
    delete contact.whatsapp;
    const result = profileSchema.safeParse(withProfile({ contact }));
    expect(result.success).toBe(true);
    expect(result.data?.contact.whatsapp).toBeUndefined();
  });

  it('turns a cleared whatsapp ("") into undefined', () => {
    const result = profileSchema.safeParse(withContact({ whatsapp: '' }));
    expect(result.success).toBe(true);
    expect(result.data?.contact.whatsapp).toBeUndefined();
  });

  it('rejects an availability outside the enum naming the field', () => {
    const result = profileSchema.safeParse(withProfile({ availability: 'maybe' }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['availability']);
  });

  it.each(['open-to-offers', 'freelance', 'not-available'])('accepts availability %s', (value) => {
    expect(profileSchema.safeParse(withProfile({ availability: value })).success).toBe(true);
  });

  it('requires seo title and description', () => {
    const withoutSeo = validProfile();
    delete withoutSeo.seo;
    const result = profileSchema.safeParse(withoutSeo);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['seo']);
  });

  it('requires a positive integer for yearsExperience', () => {
    const zero = profileSchema.safeParse(withProfile({ yearsExperience: 0 }));
    expect(zero.success).toBe(false);
    expect(zero.error?.issues[0].path).toEqual(['yearsExperience']);

    expect(profileSchema.safeParse(withProfile({ yearsExperience: 2.5 })).success).toBe(false);
  });

  it('requires language entries to carry name and level', () => {
    const result = profileSchema.safeParse(withProfile({ languages: [{ name: 'Spanish' }] }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['languages', 0, 'level']);
  });
});

describe('mediaSchema', () => {
  it('accepts uploaded cv and og image paths', () => {
    expect(mediaSchema.parse({ cv: '/uploads/cv-es.pdf', ogImage: '/uploads/og.png' })).toEqual({
      cv: '/uploads/cv-es.pdf',
      ogImage: '/uploads/og.png',
    });
  });

  it('accepts an empty object: both fields are optional', () => {
    expect(mediaSchema.parse({})).toEqual({});
  });

  it('turns cleared ("") fields into undefined', () => {
    const result = mediaSchema.parse({ cv: '', ogImage: '/uploads/og.png' });
    expect(result.cv).toBeUndefined();
    expect(result.ogImage).toBe('/uploads/og.png');
  });

  it('rejects a path outside /uploads/ naming the field', () => {
    const result = mediaSchema.safeParse({ cv: '/tmp/x.pdf' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['cv']);
  });
});
