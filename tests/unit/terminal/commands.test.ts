import { describe, expect, it } from 'vitest';
import { runCommand } from '../../../src/lib/terminal/commands';
import { COMMAND_NAMES } from '../../../src/lib/terminal/types';
import { labelsFor, makeData, segments, text } from './fixtures';

const run = (input: string, locale: 'es' | 'en' = 'en', data = makeData(locale)) =>
  runCommand(input, { data, labels: labelsFor(locale) });

describe('empty input', () => {
  it.each(['', '   '])('prints nothing for %j', (input) => {
    expect(run(input)).toEqual({ lines: [], effects: [] });
  });
});

describe('help', () => {
  it('lists every command as a run segment with its localized description', () => {
    const result = run('help');
    const names = segments(result)
      .filter((segment) => segment.run !== undefined)
      .map((segment) => segment.run);
    expect(names).toEqual([...COMMAND_NAMES]);
    expect(text(result)).toContain(labelsFor('en').commands.projects);
    expect(text(run('help', 'es'))).toContain(labelsFor('es').commands.projects);
  });

  it('ends with a muted, non-clickable hint about the sudo easter egg', () => {
    for (const locale of ['es', 'en'] as const) {
      const result = run('help', locale);
      const last = result.lines.at(-1) ?? [];
      const hint = last.map((segment) => segment.text).join('');
      expect(hint).toContain(labelsFor(locale).helpHint);
      expect(hint).toContain('sudo hire-me');
      expect(last.every((segment) => segment.tone === 'muted')).toBe(true);
      expect(last.some((segment) => segment.run !== undefined)).toBe(false);
    }
  });
});

describe('whoami', () => {
  it('prints the profile text from data', () => {
    expect(text(run('whoami'))).toBe('Fixture whoami text');
    expect(text(run('  WhoAmI  ', 'en', makeData('en', { whoami: 'abc' })))).toBe('abc');
  });
});

describe('experience', () => {
  it('prints entries in data order with location, range and achievements', () => {
    const output = text(run('experience'));
    expect(output.indexOf('Role Newest')).toBeLessThan(output.indexOf('Role Middle'));
    expect(output.indexOf('Role Middle')).toBeLessThan(output.indexOf('Role Oldest'));
    for (const part of ['Fixture Co One', 'Nowhere City', '2022 - Present', 'Achievement two']) {
      expect(output).toContain(part);
    }
  });

  it('emits exactly one scroll effect to the experience section', () => {
    expect(run('experience').effects).toEqual([{ kind: 'scroll', section: 'experience' }]);
  });

  it('skips the scroll when the page has no experience section', () => {
    const data = makeData('en', { anchors: { experience: false, contact: true } });
    expect(run('experience', 'en', data).effects).toEqual([]);
  });

  it('shows a message and no effect when there is no experience', () => {
    const result = run('experience', 'en', makeData('en', { experience: [] }));
    expect(text(result)).toBe(labelsFor('en').experienceEmpty);
    expect(result.effects).toEqual([]);
  });
});

describe('projects', () => {
  it('lists published projects with clickable ids', () => {
    const result = run('projects');
    const runs = segments(result).filter((segment) => segment.run !== undefined);
    expect(runs.map((segment) => segment.run)).toEqual([
      'projects virtual-card',
      'projects ledger',
    ]);
    expect(text(result)).toContain('Fixture summary two');
  });

  it('shows the detail of one project, case-insensitively', () => {
    const output = text(run('projects Virtual-Card'));
    for (const part of [
      'Virtual Card',
      'Fixture context',
      'Fixture challenge',
      'Fixture role',
      'Decision B',
      'Fixture result',
      'TypeScript',
      'Node.js',
    ]) {
      expect(output).toContain(part);
    }
  });

  it('shows a detail with only the fields the project has', () => {
    const output = text(run('projects ledger'));
    expect(output).toContain('Ledger');
    expect(output).not.toContain(labelsFor('en').projectChallenge);
  });

  it('reports an unknown id and lists the projects', () => {
    const result = run('projects nope');
    expect(text(result)).toContain('project not found: nope');
    expect(segments(result).some((segment) => segment.run === 'projects ledger')).toBe(true);
  });

  it('never reveals a project that is not in the published data', () => {
    const data = makeData('en', { projects: [makeData().projects[1]!] });
    expect(text(run('projects virtual-card', 'en', data))).toContain('project not found');
    expect(text(run('projects', 'en', data))).not.toContain('Virtual Card');
  });

  it.each(['projects', 'projects x'])(
    'points to contact when nothing is published (%s)',
    (input) => {
      const result = run(input, 'en', makeData('en', { projects: [] }));
      expect(text(result)).toContain(labelsFor('en').projectsEmpty);
      expect(segments(result).some((segment) => segment.run === 'contact')).toBe(true);
      expect(result.effects).toEqual([]);
    },
  );
});

describe('lang', () => {
  it('navigates to the other locale path', () => {
    expect(run('lang en', 'es').effects).toEqual([{ kind: 'navigate', href: '/en/' }]);
    expect(run('lang es', 'en').effects).toEqual([{ kind: 'navigate', href: '/es/' }]);
  });

  it('answers with an informational line for the current locale', () => {
    const result = run('lang es', 'es');
    expect(text(result)).toBe(labelsFor('es').langSame);
    expect(result.effects).toEqual([]);
  });

  it.each(['lang fr', 'lang', 'lang es en'])('shows usage for %j', (input) => {
    const result = run(input);
    expect(text(result)).toContain('usage: lang es|en');
    expect(result.effects).toEqual([]);
  });
});

describe('clear and ask', () => {
  it('clear emits a clear effect and prints nothing', () => {
    expect(run('clear')).toEqual({ lines: [], effects: [{ kind: 'clear' }], window: undefined });
  });

  it('ask prints the stub, no effects and never touches the network', () => {
    const result = run('ask what do you do');
    expect(text(result)).toBe(labelsFor('en').askStub);
    expect(result.effects).toEqual([]);
  });
});

describe('unknown input', () => {
  it('reports the input, suggests help and offers a near match', () => {
    const result = run('proyects');
    const output = text(result);
    expect(output).toContain('command not found: proyects');
    const runs = segments(result).filter((segment) => segment.run !== undefined);
    expect(runs.map((segment) => segment.run)).toEqual(['projects', 'help']);
  });

  it('offers only help when nothing is close', () => {
    const runs = segments(run('zzzzzz')).filter((segment) => segment.run !== undefined);
    expect(runs.map((segment) => segment.run)).toEqual(['help']);
  });

  it('treats any other sudo command as unknown', () => {
    const result = run('sudo rm -rf');
    expect(text(result)).toContain('command not found: sudo rm -rf');
    expect(result.effects).toEqual([]);
  });

  it('localizes the error', () => {
    expect(text(run('zzzzzz', 'es'))).toContain('comando no encontrado: zzzzzz');
  });
});

describe('serialization', () => {
  it.each([
    'help',
    'whoami',
    'experience',
    'projects',
    'projects virtual-card',
    'projects nope',
    'lang en',
    'lang xx',
    'clear',
    'ask hi',
    'proyects',
    'zzzzzz',
    '',
  ])('round-trips %j through JSON unchanged', (input) => {
    const result = run(input);
    expect(JSON.parse(JSON.stringify(result))).toStrictEqual(result);
  });
});
