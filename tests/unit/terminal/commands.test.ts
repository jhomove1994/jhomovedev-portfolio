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

  it('hides the sudo easter egg', () => {
    expect(text(run('help')).toLowerCase()).not.toContain('sudo');
    expect(text(run('help')).toLowerCase()).not.toContain('hire-me');
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
