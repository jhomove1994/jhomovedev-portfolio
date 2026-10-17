import { describe, expect, it } from 'vitest';
import { parseInput } from '../../../src/lib/terminal/parser';

describe('parseInput', () => {
  it('trims, collapses whitespace and lowercases the command name', () => {
    expect(parseInput('  WhoAmI  ')).toEqual({ name: 'whoami', args: [], known: true });
    expect(parseInput('Projects    virtual-card')).toEqual({
      name: 'projects',
      args: ['virtual-card'],
      known: true,
    });
  });

  it('returns null for empty or whitespace-only input', () => {
    expect(parseInput('')).toBeNull();
    expect(parseInput('   \t ')).toBeNull();
  });

  it('recognises every advertised command', () => {
    for (const name of [
      'help',
      'whoami',
      'experience',
      'projects',
      'stack',
      'certs',
      'contact',
      'cv',
      'lang',
      'ask',
      'clear',
    ]) {
      expect(parseInput(name)).toEqual({ name, args: [], known: true });
    }
  });

  it('flags unknown commands and keeps their lowercased name', () => {
    expect(parseInput('Foo bar')).toEqual({ name: 'foo', args: ['bar'], known: false });
  });

  it('recognises the hidden `sudo hire-me` easter egg in any casing', () => {
    expect(parseInput('sudo hire-me')).toEqual({ name: 'sudo hire-me', args: [], known: true });
    expect(parseInput('  SUDO   Hire-Me ')).toEqual({
      name: 'sudo hire-me',
      args: [],
      known: true,
    });
  });

  it('treats any other sudo invocation as unknown', () => {
    expect(parseInput('sudo rm -rf')).toEqual({ name: 'sudo', args: ['rm', '-rf'], known: false });
    expect(parseInput('sudo')).toEqual({ name: 'sudo', args: [], known: false });
    expect(parseInput('sudo hire-me now')).toEqual({
      name: 'sudo',
      args: ['hire-me', 'now'],
      known: false,
    });
  });

  it('preserves the case of `ask` arguments', () => {
    expect(parseInput('ask What do   you DO')).toEqual({
      name: 'ask',
      args: ['What', 'do', 'you', 'DO'],
      known: true,
    });
  });

  it('lowercases `lang` and `projects` arguments', () => {
    expect(parseInput('lang EN')).toEqual({ name: 'lang', args: ['en'], known: true });
    expect(parseInput('PROJECTS Virtual-Card')).toEqual({
      name: 'projects',
      args: ['virtual-card'],
      known: true,
    });
  });
});
