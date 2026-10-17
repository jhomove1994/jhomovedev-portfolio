import { describe, expect, it } from 'vitest';
import { ui } from '../../../src/i18n/ui';
import type { Locale } from '../../../src/i18n/locales';
import { runCommand } from '../../../src/lib/terminal/commands';
import { COMMAND_NAMES, type TerminalData } from '../../../src/lib/terminal/types';
import { loadCollection } from '../../helpers/load-content';
import {
  collectSourceFiles,
  findViolations,
  type ForbiddenTerm,
} from '../../helpers/scan-templates';
import { labelsFor, makeData } from './fixtures';

// Assembled so the repository-wide phone-link scan never matches this file.
const PHONE_SCHEME = 'te' + 'l:';
const BANNED_TOPICS = ['main' + 'frame', 'cob' + 'ol'];
/** A phone-like digit run: optional country code, then 2-4 / 3-4 / 3-4 digit groups. */
const PHONE_NUMBER = /(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/;

/** Every reason `output` may not be shown to a visitor, empty when it is clean. */
function problems(output: string): string[] {
  const lower = output.toLowerCase();
  return [
    ...BANNED_TOPICS.filter((topic) => lower.includes(topic)).map((topic) => `topic: ${topic}`),
    ...(lower.includes(PHONE_SCHEME) ? ['phone link'] : []),
    ...(PHONE_NUMBER.test(output) ? ['phone number'] : []),
  ];
}

const INPUTS = [
  ...COMMAND_NAMES,
  'sudo hire-me',
  'projects virtual-card',
  'projects nope',
  'lang fr',
  'lang',
  'ask what do you do',
  'proyects',
  'zzzzzz',
];

function outputsFor(locale: Locale, data: TerminalData): string[] {
  return INPUTS.map((input) =>
    JSON.stringify(runCommand(input, { data, labels: labelsFor(locale) })),
  );
}

describe('the guard itself', () => {
  it('flags banned topics, phone links and phone numbers', () => {
    expect(problems('We ran Main' + 'frame jobs')).toEqual(['topic: main' + 'frame']);
    expect(problems('legacy CO' + 'BOL')).toEqual(['topic: cob' + 'ol']);
    expect(problems(`href ${PHONE_SCHEME}1`)).toContain('phone link');
    expect(problems('call +1 555 010 0199')).toContain('phone number');
    expect(problems('5550100199')).toContain('phone number');
  });

  it('does not flag years, ranges or ordinary text', () => {
    expect(problems('2019 - 2022 · Remote · 6+ years · Node.js 22')).toEqual([]);
  });
});

describe.each(['es', 'en'] as const)('terminal output (%s)', (locale) => {
  it('contains no banned topic and no phone number for fixture data', () => {
    for (const output of outputsFor(locale, makeData(locale))) {
      expect(problems(output), output).toEqual([]);
    }
  });

  it('contains none for empty content or a web-link whatsapp', () => {
    const empty = makeData(locale, {
      experience: [],
      projects: [],
      stack: [],
      certs: [],
      cvUrl: null,
    });
    const whatsapp = makeData(locale, {
      contact: { ...makeData().contact, whatsapp: 'https://wa.example.com/demo' },
    });
    for (const output of [...outputsFor(locale, empty), ...outputsFor(locale, whatsapp)]) {
      expect(problems(output), output).toEqual([]);
    }
  });

  it('has clean chrome strings', () => {
    expect(problems(JSON.stringify(ui[locale].terminal))).toEqual([]);
    expect(problems(JSON.stringify(ui[locale].hero))).toEqual([]);
  });
});

describe('terminal engine sources', () => {
  const files = collectSourceFiles(process.cwd(), ['src/lib/terminal']);

  const seededFacts = (): ForbiddenTerm[] => {
    const profiles = loadCollection('profile');
    const contacts = profiles.map((p) => p.data.contact as { email: string; linkedin: string });
    return [
      ...profiles.map((p) => ({ label: 'name', value: String(p.data.name) })),
      ...contacts.map(({ email }) => ({ label: 'email', value: email })),
      ...contacts.map(({ linkedin }) => ({ label: 'linkedin url', value: linkedin })),
      ...loadCollection('experience').map((e) => ({
        label: 'employer',
        value: String(e.data.company),
      })),
      ...BANNED_TOPICS.map((value) => ({ label: 'banned topic', value })),
      { label: 'phone link', value: PHONE_SCHEME },
    ];
  };

  it('scans the real engine files (the guard is not vacuous)', () => {
    expect(files.map((f) => f.path)).toEqual(
      expect.arrayContaining(['src/lib/terminal/commands.ts', 'src/lib/terminal/href.ts']),
    );
    expect(seededFacts().length).toBeGreaterThanOrEqual(6);
  });

  it('hardcodes no seeded name, employer, email, profile url, banned topic or phone link', () => {
    expect(findViolations(files, seededFacts())).toEqual([]);
  });
});
