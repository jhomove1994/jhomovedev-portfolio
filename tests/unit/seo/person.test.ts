import { describe, expect, it } from 'vitest';
import { buildPersonJsonLd, serializeJsonLd, type PersonInput } from '../../../src/lib/seo/person';

const base: PersonInput = {
  name: 'Ada Lovelace',
  headline: 'Senior Engineer · on the path to Lead',
  description: 'Builds engines.',
  url: 'https://x.dev/en/',
  image: 'https://x.dev/uploads/og.png',
  email: 'ada@x.dev',
  linkedin: 'https://linkedin.com/in/ada',
  location: 'Bogotá, Colombia',
  languages: [{ name: 'Spanish' }, { name: 'English' }],
};

describe('buildPersonJsonLd', () => {
  it('maps profile fields to a schema.org Person', () => {
    expect(buildPersonJsonLd(base)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Ada Lovelace',
      jobTitle: 'Senior Engineer',
      description: 'Builds engines.',
      url: 'https://x.dev/en/',
      image: 'https://x.dev/uploads/og.png',
      sameAs: ['https://linkedin.com/in/ada'],
      email: 'ada@x.dev',
      address: { '@type': 'PostalAddress', addressLocality: 'Bogotá', addressCountry: 'Colombia' },
      knowsLanguage: ['Spanish', 'English'],
    });
  });

  it('uses the whole headline when it has no separator', () => {
    expect(buildPersonJsonLd({ ...base, headline: 'Engineer' }).jobTitle).toBe('Engineer');
  });

  it('omits the address unless location is exactly locality and country', () => {
    expect(buildPersonJsonLd({ ...base, location: 'Remote' }).address).toBeUndefined();
    expect(buildPersonJsonLd({ ...base, location: 'A, B, C' }).address).toBeUndefined();
    expect(buildPersonJsonLd({ ...base, location: 'A, ' }).address).toBeUndefined();
  });

  it('omits unset optional fields', () => {
    const person = buildPersonJsonLd({
      ...base,
      image: undefined,
      email: undefined,
      languages: [],
    });
    expect(person).not.toHaveProperty('image');
    expect(person).not.toHaveProperty('email');
    expect(person).not.toHaveProperty('knowsLanguage');
  });
});

describe('serializeJsonLd', () => {
  it('escapes < so the payload cannot close the script element', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('<');
    expect(JSON.parse(out)).toEqual({ name: '</script><script>alert(1)</script>' });
  });
});
