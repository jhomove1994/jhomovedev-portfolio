import { describe, expect, it } from 'vitest';
import { buildTerminalData, type TerminalContent } from '../../../src/lib/terminal/data';
import type { Locale } from '../../../src/i18n/locales';

/** Fictional, seed-shaped plain content: nothing here is a real name, employer or contact. */
function makeContent(
  locale: Locale = 'en',
  overrides: Partial<TerminalContent> = {},
): TerminalContent {
  return {
    locale,
    profile: {
      name: 'Demo Person',
      brand: 'DemoBrand',
      headline: 'Fixture headline',
      whoami: 'Fixture whoami',
      contact: { email: 'person@example.com', linkedin: 'https://social.example.com/in/demo' },
    },
    experience: [
      {
        data: {
          role: 'Role Oldest',
          company: 'Fixture Co Three',
          location: 'Elsewhere',
          start: '2019-04',
          end: '2023-01',
          achievements: '- Old achievement',
          order: 3,
        },
      },
      {
        data: {
          role: 'Role Newest',
          company: 'Fixture Co One',
          location: 'Nowhere City',
          start: '2024-05',
          end: 'present',
          achievements: '- Achievement one\n- Achievement two',
          order: 1,
        },
      },
    ],
    projects: [
      {
        slug: 'virtual-card',
        data: {
          title: 'Virtual Card',
          summary: 'Fixture summary',
          context: 'Fixture context',
          challenge: 'Fixture challenge',
          role: 'Fixture role',
          decisions: '- Decision A\n- Decision B',
          result: 'Fixture result',
          stack: [{ id: 'aws' }],
          published: true,
          order: 1,
        },
      },
      {
        slug: 'draft-one',
        data: {
          title: 'Draft One',
          summary: 'Never shown',
          context: 'c',
          challenge: 'c',
          role: 'r',
          decisions: '- d',
          result: 'r',
          stack: [],
          published: false,
          order: 2,
        },
      },
    ],
    stackCatalog: [
      { id: 'node', data: { name: 'Node.js', cluster: 'backend', order: 1 } },
      { id: 'aws', data: { name: 'AWS', cluster: 'aws-serverless', order: 2 } },
      { id: 'nest', data: { name: 'NestJS', cluster: 'backend', order: 3 } },
      { id: 'ts', data: { name: 'TypeScript', cluster: 'languages' } },
    ],
    certifications: [
      {
        data: {
          kind: 'certification',
          name: 'Cert One',
          issuer: 'Issuer A',
          year: 2026,
          status: 'completed',
          credentialUrl: 'https://example.com/c1',
          order: 1,
        },
      },
      {
        data: {
          kind: 'training',
          name: 'Course Two',
          issuer: 'Issuer B',
          year: 2026,
          status: 'in-progress',
          order: 2,
        },
      },
    ],
    media: { es: { cv: '/uploads/cv-es.pdf' }, en: { cv: '/uploads/cv-en.pdf' } },
    ...overrides,
  };
}

describe('buildTerminalData: profile', () => {
  it('maps the profile fields and lowercases the brand into the prompt', () => {
    const data = buildTerminalData(makeContent('en'));
    expect(data).toMatchObject({
      locale: 'en',
      prompt: 'demobrand',
      whoami: 'Fixture whoami',
      name: 'Demo Person',
      headline: 'Fixture headline',
      contact: { email: 'person@example.com', linkedin: 'https://social.example.com/in/demo' },
    });
  });

  it('keeps a whatsapp link when present and omits it when cleared or missing', () => {
    const base = makeContent('en');
    const withLink = buildTerminalData({
      ...base,
      profile: {
        ...base.profile,
        contact: { ...base.profile.contact, whatsapp: 'https://chat.example.com/x' },
      },
    });
    expect(withLink.contact.whatsapp).toBe('https://chat.example.com/x');

    const cleared = buildTerminalData({
      ...base,
      profile: { ...base.profile, contact: { ...base.profile.contact, whatsapp: '' } },
    });
    expect(cleared.contact).toEqual({
      email: 'person@example.com',
      linkedin: 'https://social.example.com/in/demo',
    });
    expect('whatsapp' in buildTerminalData(base).contact).toBe(false);
  });
});

describe('buildTerminalData: experience', () => {
  it('orders roles most-recent-first by `order`, whatever the input order', () => {
    const data = buildTerminalData(makeContent('en'));
    expect(data.experience.map((role) => role.role)).toEqual(['Role Newest', 'Role Oldest']);
  });

  it('formats the period per locale and parses achievements into bullets', () => {
    const en = buildTerminalData(makeContent('en')).experience[0];
    expect(en).toEqual({
      role: 'Role Newest',
      company: 'Fixture Co One',
      location: 'Nowhere City',
      period: 'May 2024 - Present',
      achievements: ['Achievement one', 'Achievement two'],
    });
    const es = buildTerminalData(makeContent('es')).experience[0];
    expect(es?.period).toBe('mayo 2024 - Actualidad');
  });
});

describe('buildTerminalData: projects', () => {
  it('keeps published projects only, with stack names and decision bullets', () => {
    const data = buildTerminalData(makeContent('en'));
    expect(data.projects).toEqual([
      {
        id: 'virtual-card',
        title: 'Virtual Card',
        summary: 'Fixture summary',
        stack: ['AWS'],
        context: 'Fixture context',
        challenge: 'Fixture challenge',
        role: 'Fixture role',
        decisions: ['Decision A', 'Decision B'],
        result: 'Fixture result',
      },
    ]);
  });

  it('yields an empty list when nothing is published', () => {
    const content = makeContent('en');
    const data = buildTerminalData({
      ...content,
      projects: content.projects.filter((project) => !project.data.published),
    });
    expect(data.projects).toEqual([]);
    expect(data.projects.length).toBe(0);
  });

  it('throws on a stack reference missing from the catalog', () => {
    const content = makeContent('en');
    expect(() =>
      buildTerminalData({
        ...content,
        stackCatalog: content.stackCatalog.filter((entry) => entry.id !== 'aws'),
      }),
    ).toThrow(/Unknown stack reference "aws"/);
  });
});

describe('buildTerminalData: stack', () => {
  it('groups catalog names by cluster in the fixed cluster order with localized headings', () => {
    const en = buildTerminalData(makeContent('en')).stack;
    expect(en).toEqual([
      { cluster: 'Backend', items: ['Node.js', 'NestJS'] },
      { cluster: 'AWS & serverless', items: ['AWS'] },
      { cluster: 'Languages', items: ['TypeScript'] },
    ]);
  });

  it('omits clusters without items and localizes headings to Spanish', () => {
    const es = buildTerminalData(makeContent('es')).stack;
    expect(es.map((group) => group.cluster)).toEqual(['Backend', 'AWS y serverless', 'Lenguajes']);
  });
});

describe('buildTerminalData: certifications', () => {
  it('maps kind, year, in-progress status and credential url', () => {
    const data = buildTerminalData(makeContent('en'));
    expect(data.certs).toEqual([
      {
        name: 'Cert One',
        issuer: 'Issuer A',
        kind: 'certification',
        year: 2026,
        url: 'https://example.com/c1',
        inProgress: false,
      },
      {
        name: 'Course Two',
        issuer: 'Issuer B',
        kind: 'training',
        year: 2026,
        inProgress: true,
      },
    ]);
  });
});

describe('buildTerminalData: cv, locale switch and anchors', () => {
  it('uses the own-locale CV without the fallback flag', () => {
    const data = buildTerminalData(makeContent('en'));
    expect(data.cvUrl).toBe('/uploads/cv-en.pdf');
    expect(data.cvFallback).toBe(false);
  });

  it('falls back to the Spanish CV and flags it', () => {
    const data = buildTerminalData(
      makeContent('en', { media: { es: { cv: '/uploads/cv-es.pdf' } } }),
    );
    expect(data.cvUrl).toBe('/uploads/cv-es.pdf');
    expect(data.cvFallback).toBe(true);
  });

  it('has no CV when nothing is uploaded', () => {
    const data = buildTerminalData(makeContent('en', { media: {} }));
    expect(data.cvUrl).toBeNull();
    expect(data.cvFallback).toBe(false);
  });

  it('points altLocale at the other locale home', () => {
    expect(buildTerminalData(makeContent('en')).altLocale).toEqual({ locale: 'es', path: '/es/' });
    expect(buildTerminalData(makeContent('es')).altLocale).toEqual({ locale: 'en', path: '/en/' });
  });

  it('flags the experience anchor only when there are roles; contact is always present', () => {
    expect(buildTerminalData(makeContent('en')).anchors).toEqual({
      experience: true,
      contact: true,
    });
    expect(buildTerminalData(makeContent('en', { experience: [] })).anchors).toEqual({
      experience: false,
      contact: true,
    });
  });

  it('invents nothing when the content is empty', () => {
    const data = buildTerminalData(
      makeContent('en', {
        experience: [],
        projects: [],
        stackCatalog: [],
        certifications: [],
        media: {},
      }),
    );
    expect(data.experience).toEqual([]);
    expect(data.projects).toEqual([]);
    expect(data.stack).toEqual([]);
    expect(data.certs).toEqual([]);
    expect(data.cvUrl).toBeNull();
    expect(data.whoami).toBe('Fixture whoami');
  });
});
