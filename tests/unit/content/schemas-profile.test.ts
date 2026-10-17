import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { leadershipSchema, mediaSchema, profileSchema } from '../../../src/lib/content/schemas';

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
      whoami: 'Short whoami used only by tests.',
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

  it('requires whoami naming the field when missing', () => {
    const withoutWhoami = validProfile();
    delete withoutWhoami.whoami;
    const result = profileSchema.safeParse(withoutWhoami);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['whoami']);
  });

  it('rejects an empty whoami naming the field', () => {
    const result = profileSchema.safeParse(withProfile({ whoami: '' }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['whoami']);
  });

  it('accepts whoami of exactly 280 characters and rejects 281', () => {
    expect(profileSchema.safeParse(withProfile({ whoami: 'a'.repeat(280) })).success).toBe(true);
    const tooLong = profileSchema.safeParse(withProfile({ whoami: 'a'.repeat(281) }));
    expect(tooLong.success).toBe(false);
    expect(tooLong.error?.issues[0].path).toEqual(['whoami']);
  });

  it('accepts a TODO(autor) whoami placeholder', () => {
    const whoami = 'TODO(autor): one-line self introduction';
    expect(profileSchema.parse(withProfile({ whoami })).whoami).toBe(whoami);
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

const validLeadership = (): Json => fixture('leadership', 'valid') as Json;
const withLeadership = (overrides: Json): Json => ({ ...validLeadership(), ...overrides });

describe('leadershipSchema', () => {
  it('accepts a complete milestone', () => {
    const result = leadershipSchema.safeParse(validLeadership());
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      title: 'Project leadership',
      evidence: 'Led a small team through a delivery, used only by tests.',
      date: '2023-01',
      link: 'https://example.com/evidence',
      order: 1,
    });
  });

  it('rejects empty evidence naming the field', () => {
    const result = leadershipSchema.safeParse(withLeadership({ evidence: '' }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['evidence']);
  });

  it('rejects whitespace-only evidence', () => {
    expect(leadershipSchema.safeParse(withLeadership({ evidence: '   ' })).success).toBe(false);
  });

  it('accepts a TODO(autor) evidence placeholder', () => {
    const evidence = 'TODO(autor): mentoring example';
    expect(leadershipSchema.parse(withLeadership({ evidence })).evidence).toBe(evidence);
  });

  it.each(['2023-01', '2023'])('accepts the date %s', (date) => {
    expect(leadershipSchema.parse(withLeadership({ date })).date).toBe(date);
  });

  it.each(['2023-13', '23', 'May 2023', '2023-1'])('rejects the date %s', (date) => {
    const result = leadershipSchema.safeParse(withLeadership({ date }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['date']);
  });

  it('turns cleared optionals ("") into undefined', () => {
    const result = leadershipSchema.parse(withLeadership({ date: '', link: '' }));
    expect(result.date).toBeUndefined();
    expect(result.link).toBeUndefined();
  });

  it('rejects a link that is not a URL naming the field', () => {
    const result = leadershipSchema.safeParse(withLeadership({ link: 'not a url' }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['link']);
  });

  it('requires an integer order', () => {
    expect(leadershipSchema.safeParse(withLeadership({ order: 1.5 })).success).toBe(false);
    const withoutOrder = validLeadership();
    delete withoutOrder.order;
    expect(leadershipSchema.safeParse(withoutOrder).success).toBe(false);
  });
});
