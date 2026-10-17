import { describe, expect, it } from 'vitest';
import { editDistance, suggestCommand } from '../../../src/lib/terminal/suggest';

describe('editDistance', () => {
  it.each([
    ['projects', 'projects', 0],
    ['proyects', 'projects', 1],
    ['kitten', 'sitting', 3],
    ['', 'abc', 3],
    ['abc', '', 3],
  ])('%j vs %j = %i', (a, b, expected) => {
    expect(editDistance(a, b)).toBe(expected);
  });
});

describe('suggestCommand', () => {
  it('suggests the closest command within distance 2', () => {
    expect(suggestCommand('proyects')).toBe('projects');
    expect(suggestCommand('hlep')).toBe('help');
    expect(suggestCommand('whoam')).toBe('whoami');
  });

  it('is case-insensitive', () => {
    expect(suggestCommand('PROYECTS')).toBe('projects');
  });

  it('returns null when nothing is close enough', () => {
    expect(suggestCommand('zzzzzz')).toBeNull();
    expect(suggestCommand('foo')).toBeNull();
  });

  it('never suggests the hidden sudo easter egg', () => {
    expect(suggestCommand('sudo')).toBeNull();
    expect(suggestCommand('sudo hire-me')).toBeNull();
  });

  it('prefers the nearest candidate when several are in range', () => {
    expect(suggestCommand('stak')).toBe('stack');
  });
});
