import { describe, expect, it } from 'vitest';
import { buildTerminalSections, type TerminalContent } from '../../../src/lib/terminal/data';
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

describe('buildTerminalSections: experience', () => {
  it('orders roles most-recent-first by `order`, whatever the input order', () => {
    const data = buildTerminalSections(makeContent('en'));
    expect(data.experience.map((role) => role.role)).toEqual(['Role Newest', 'Role Oldest']);
  });

  it('formats the period per locale and parses achievements into bullets', () => {
    const en = buildTerminalSections(makeContent('en')).experience[0];
    expect(en).toEqual({
      role: 'Role Newest',
      company: 'Fixture Co One',
      location: 'Nowhere City',
      period: 'May 2024 - Present',
      achievements: ['Achievement one', 'Achievement two'],
    });
    const es = buildTerminalSections(makeContent('es')).experience[0];
    expect(es?.period).toBe('mayo 2024 - Actualidad');
  });
});

describe('buildTerminalSections: projects', () => {
  it('keeps published projects only, with stack names and decision bullets', () => {
    const data = buildTerminalSections(makeContent('en'));
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
    const data = buildTerminalSections({
      ...content,
      projects: content.projects.filter((project) => !project.data.published),
    });
    expect(data.projects).toEqual([]);
    expect(data.projects.length).toBe(0);
  });

  it('throws on a stack reference missing from the catalog', () => {
    const content = makeContent('en');
    expect(() =>
      buildTerminalSections({
        ...content,
        stackCatalog: content.stackCatalog.filter((entry) => entry.id !== 'aws'),
      }),
    ).toThrow(/Unknown stack reference "aws"/);
  });
});

describe('buildTerminalSections: stack', () => {
  it('groups catalog names by cluster in the fixed cluster order with localized headings', () => {
    const en = buildTerminalSections(makeContent('en')).stack;
    expect(en).toEqual([
      { cluster: 'Backend', items: ['Node.js', 'NestJS'] },
      { cluster: 'AWS & serverless', items: ['AWS'] },
      { cluster: 'Languages', items: ['TypeScript'] },
    ]);
  });

  it('omits clusters without items and localizes headings to Spanish', () => {
    const es = buildTerminalSections(makeContent('es')).stack;
    expect(es.map((group) => group.cluster)).toEqual(['Backend', 'AWS y serverless', 'Lenguajes']);
  });
});

describe('buildTerminalSections: certifications', () => {
  it('maps kind, year, in-progress status and credential url', () => {
    const data = buildTerminalSections(makeContent('en'));
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
