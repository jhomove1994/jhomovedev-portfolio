import { describe, expect, it } from 'vitest';
import { YEARS_TOKEN, fillYears, withYears } from '../../../src/lib/content/years';

describe('fillYears', () => {
  it('replaces every {years} token with the number', () => {
    expect(fillYears('más de {years} años, {years}+', 7)).toBe('más de 7 años, 7+');
  });

  it('leaves text without the token untouched', () => {
    expect(fillYears('Senior Full Stack Developer', 7)).toBe('Senior Full Stack Developer');
  });

  it('exposes the token authors type in the CMS', () => {
    expect(YEARS_TOKEN).toBe('{years}');
  });
});

describe('withYears', () => {
  const profile = {
    yearsExperience: 8,
    headline: 'Senior · {years}',
    bio: 'con más de {years} años',
    whoami: 'with {years}+ years',
    seo: { title: 'Title', description: '{years}+ years of experience' },
  };

  it('fills bio, whoami and the SEO description from yearsExperience', () => {
    const filled = withYears(profile);
    expect(filled.bio).toBe('con más de 8 años');
    expect(filled.whoami).toBe('with 8+ years');
    expect(filled.seo.description).toBe('8+ years of experience');
  });

  it('keeps every other field as it was and does not mutate the input', () => {
    const filled = withYears(profile);
    expect(filled.headline).toBe('Senior · {years}');
    expect(filled.seo.title).toBe('Title');
    expect(profile.bio).toBe('con más de {years} años');
  });
});
