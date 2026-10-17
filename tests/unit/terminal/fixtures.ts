import { terminalLabels } from '../../../src/i18n/ui';
import type { Locale } from '../../../src/i18n/locales';
import type { CommandResult, Segment, TerminalData } from '../../../src/lib/terminal/types';

/** Fictional, seed-shaped data: nothing here is a real name, employer or contact. */
export function makeData(
  locale: Locale = 'en',
  overrides: Partial<TerminalData> = {},
): TerminalData {
  const other: Locale = locale === 'en' ? 'es' : 'en';
  return {
    locale,
    prompt: 'demo',
    whoami: 'Fixture whoami text',
    name: 'Demo Person',
    headline: 'Fixture headline',
    experience: [
      {
        role: 'Role Newest',
        company: 'Fixture Co One',
        location: 'Nowhere City',
        period: '2022 - Present',
        achievements: ['Achievement one', 'Achievement two'],
      },
      {
        role: 'Role Middle',
        company: 'Fixture Co Two',
        period: '2019 - 2022',
        achievements: [],
      },
      {
        role: 'Role Oldest',
        company: 'Fixture Co Three',
        location: 'Elsewhere',
        period: '2016 - 2019',
        achievements: ['Old achievement'],
      },
    ],
    projects: [
      {
        id: 'virtual-card',
        title: 'Virtual Card',
        summary: 'Fixture summary one',
        stack: ['TypeScript', 'Node.js'],
        context: 'Fixture context',
        challenge: 'Fixture challenge',
        role: 'Fixture role',
        decisions: ['Decision A', 'Decision B'],
        result: 'Fixture result',
      },
      { id: 'ledger', title: 'Ledger', summary: 'Fixture summary two', stack: ['Go'] },
    ],
    stack: [
      { cluster: 'Backend', items: ['Node.js', 'NestJS'] },
      { cluster: 'Cloud', items: ['AWS'] },
    ],
    certs: [
      {
        name: 'Cert One',
        issuer: 'Issuer A',
        kind: 'certification',
        year: 2023,
        url: 'https://example.com/c1',
        inProgress: false,
      },
      { name: 'Course Two', issuer: 'Issuer B', kind: 'training', inProgress: true },
      {
        name: 'Degree Three',
        issuer: 'Issuer C',
        kind: 'education',
        year: 2015,
        inProgress: false,
      },
      {
        name: 'Cert Four',
        issuer: 'Issuer D',
        kind: 'certification',
        year: 2021,
        url: 'javascript:alert(1)',
        inProgress: false,
      },
    ],
    contact: { email: 'person@example.com', linkedin: 'https://social.example.com/in/demo' },
    cvUrl: '/uploads/cv-en.pdf',
    cvFallback: false,
    altLocale: { locale: other, path: `/${other}/` },
    anchors: { experience: true, contact: true },
    ...overrides,
  };
}

export const labelsFor = terminalLabels;

export function text(result: CommandResult): string {
  return result.lines.map((line) => line.map((segment) => segment.text).join('')).join('\n');
}

export function segments(result: CommandResult): Segment[] {
  return result.lines.flat();
}
