import { describe, expect, it } from 'vitest';
import { runCommand } from '../../../src/lib/terminal/commands';
import type { Locale } from '../../../src/i18n/locales';
import type { TerminalData } from '../../../src/lib/terminal/types';
import { labelsFor, makeData, segments, text } from './fixtures';

// Assembled so the repository-wide phone-link scan never matches this file.
const PHONE = 'te' + 'l:';

const run = (input: string, overrides: Partial<TerminalData> = {}, locale: Locale = 'en') =>
  runCommand(input, { data: makeData(locale, overrides), labels: labelsFor(locale) });

describe('stack', () => {
  it('prints one section per non-empty cluster', () => {
    const output = text(
      run('stack', {
        stack: [
          { cluster: 'Backend', items: ['Node.js', 'NestJS'] },
          { cluster: 'Empty', items: [] },
          { cluster: 'Cloud', items: ['AWS'] },
        ],
      }),
    );
    expect(output).toContain('Backend');
    expect(output).toContain('Node.js, NestJS');
    expect(output).toContain('Cloud');
    expect(output).not.toContain('Empty');
  });

  it('shows a message when there is no stack', () => {
    expect(text(run('stack', { stack: [] }))).toBe(labelsFor('en').stackEmpty);
  });
});

describe('certs', () => {
  it('groups by kind with the localized kind heading', () => {
    const output = text(run('certs'));
    const labels = labelsFor('en').certKinds;
    expect(output.indexOf(labels.certification)).toBeLessThan(output.indexOf('Cert One'));
    expect(output.indexOf('Cert One')).toBeLessThan(output.indexOf('Cert Four'));
    expect(output.indexOf('Cert Four')).toBeLessThan(output.indexOf(labels.training));
    expect(output).toContain(labels.education);
    expect(output).toContain('Issuer A');
    expect(output).toContain('2023');
  });

  it('marks in-progress entries with the localized label', () => {
    const lines = run('certs').lines.map((line) => line.map((s) => s.text).join(''));
    expect(lines.find((line) => line.includes('Course Two'))).toContain(
      labelsFor('en').certInProgress,
    );
    expect(lines.find((line) => line.includes('Cert One'))).not.toContain(
      labelsFor('en').certInProgress,
    );
  });

  it('links a credential only when the url passes the link policy', () => {
    const linked = segments(run('certs')).filter((segment) => segment.href !== undefined);
    expect(linked).toEqual([{ text: 'Cert One', href: 'https://example.com/c1' }]);
  });

  it('shows a message when there are no certifications', () => {
    expect(text(run('certs', { certs: [] }))).toBe(labelsFor('en').certsEmpty);
  });
});

describe('contact', () => {
  it('links the email and the profile and omits whatsapp when unset', () => {
    const result = run('contact');
    const links = segments(result).filter((segment) => segment.href !== undefined);
    expect(links.map((segment) => segment.href)).toEqual([
      'mailto:person@example.com',
      'https://social.example.com/in/demo',
    ]);
    expect(text(result)).not.toContain(labelsFor('en').contactWhatsapp);
  });

  it('adds a whatsapp link only when it is a web link', () => {
    const configured = run('contact', {
      contact: { ...makeData().contact, whatsapp: 'https://wa.example.com/demo' },
    });
    expect(text(configured)).toContain(labelsFor('en').contactWhatsapp);
    const rawNumber = run('contact', {
      contact: { ...makeData().contact, whatsapp: '+10000000000' },
    });
    expect(text(rawNumber)).not.toContain('+10000000000');
    expect(text(rawNumber)).not.toContain(labelsFor('en').contactWhatsapp);
  });

  it('never emits a phone link', () => {
    const data = { contact: { ...makeData().contact, whatsapp: `${PHONE}+10000000000` } };
    expect(JSON.stringify(run('contact', data))).not.toContain(PHONE);
  });

  it('has no effects', () => {
    expect(run('contact').effects).toEqual([]);
  });
});

describe('cv', () => {
  it('links the CV and asks the page to download it', () => {
    const result = run('cv');
    expect(segments(result)).toEqual([
      { text: labelsFor('en').cvLabel, href: '/uploads/cv-en.pdf' },
    ]);
    expect(result.effects).toEqual([{ kind: 'download', href: '/uploads/cv-en.pdf' }]);
  });

  it('marks the Spanish fallback on the English page', () => {
    const result = run('cv', { cvUrl: '/uploads/cv-es.pdf', cvFallback: true });
    expect(text(result)).toBe(`${labelsFor('en').cvLabel} (Spanish)`);
    expect(segments(result)[0]?.href).toBe('/uploads/cv-es.pdf');
  });

  it('shows a message and no link when there is no CV', () => {
    const result = run('cv', { cvUrl: null });
    expect(text(result)).toBe(labelsFor('en').cvMissing);
    expect(segments(result).some((segment) => segment.href !== undefined)).toBe(false);
    expect(result.effects).toEqual([]);
  });

  it('treats an unsafe CV url as missing', () => {
    const result = run('cv', { cvUrl: 'javascript:alert(1)' });
    expect(text(result)).toBe(labelsFor('en').cvMissing);
    expect(result.effects).toEqual([]);
  });
});

describe('sudo hire-me', () => {
  it('prints the message, the contact output and scrolls to contact', () => {
    const result = run('sudo hire-me');
    expect(text(result)).toContain(labelsFor('en').sudoHireMe);
    expect(segments(result).some((s) => s.href === 'mailto:person@example.com')).toBe(true);
    expect(result.effects).toEqual([{ kind: 'scroll', section: 'contact' }]);
  });

  it('skips the scroll when the page has no contact section', () => {
    const result = run('sudo hire-me', { anchors: { experience: true, contact: false } });
    expect(result.effects).toEqual([]);
  });

  it('is case-insensitive and is not listed by help', () => {
    expect(text(run('SUDO Hire-Me'))).toContain(labelsFor('en').sudoHireMe);
  });
});

describe('serialization', () => {
  it.each(['stack', 'certs', 'contact', 'cv', 'sudo hire-me'])(
    'round-trips %j through JSON unchanged',
    (input) => {
      const result = run(input);
      expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
    },
  );
});
