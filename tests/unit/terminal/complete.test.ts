import { describe, expect, it } from 'vitest';
import { complete, type CompletionContext } from '../../../src/lib/terminal/complete';

const ctx: CompletionContext = { projectIds: ['virtual-card', 'ledger'], locale: 'es' };

describe('command name completion', () => {
  it('completes a unique prefix', () => {
    expect(complete('wh', ctx)).toEqual({ outcome: 'completed', value: 'whoami' });
    expect(complete('ex', ctx)).toEqual({ outcome: 'completed', value: 'experience' });
  });

  it('is case-insensitive and answers in lowercase', () => {
    expect(complete('WH', ctx)).toEqual({ outcome: 'completed', value: 'whoami' });
  });

  it('lists every candidate when the prefix is ambiguous and has no longer common prefix', () => {
    expect(complete('c', ctx)).toEqual({
      outcome: 'candidates',
      value: 'c',
      candidates: ['certs', 'contact', 'cv', 'clear'],
    });
  });

  it('narrows an ambiguous prefix once it becomes unique', () => {
    expect(complete('co', ctx)).toEqual({ outcome: 'completed', value: 'contact' });
    expect(complete('ce', ctx)).toEqual({ outcome: 'completed', value: 'certs' });
  });

  it('leaves an unmatched prefix unchanged', () => {
    expect(complete('zz', ctx)).toEqual({ outcome: 'unchanged' });
  });

  it('never completes the hidden sudo easter egg', () => {
    expect(complete('su', ctx)).toEqual({ outcome: 'unchanged' });
    expect(complete('sudo h', ctx)).toEqual({ outcome: 'unchanged' });
  });

  it('lets Tab move focus on an empty or whitespace draft', () => {
    expect(complete('', ctx)).toEqual({ outcome: 'focus' });
    expect(complete('   ', ctx)).toEqual({ outcome: 'focus' });
  });

  it('does not complete an exact command with nothing more to add', () => {
    expect(complete('whoami', ctx)).toEqual({ outcome: 'completed', value: 'whoami' });
  });
});

describe('projects argument completion', () => {
  it('completes a published id', () => {
    expect(complete('projects vi', ctx)).toEqual({
      outcome: 'completed',
      value: 'projects virtual-card',
    });
    expect(complete('projects le', ctx)).toEqual({
      outcome: 'completed',
      value: 'projects ledger',
    });
  });

  it('extends to the common prefix of several ids', () => {
    const many = { ...ctx, projectIds: ['virtual-card', 'virtual-bank', 'ledger'] };
    expect(complete('projects v', many)).toEqual({
      outcome: 'completed',
      value: 'projects virtual-',
    });
  });

  it('lists the ids when they share no longer prefix', () => {
    expect(complete('projects ', ctx)).toEqual({
      outcome: 'candidates',
      value: 'projects ',
      candidates: ['projects virtual-card', 'projects ledger'],
    });
  });

  it('leaves unknown ids unchanged and offers nothing without published projects', () => {
    expect(complete('projects zz', ctx)).toEqual({ outcome: 'unchanged' });
    expect(complete('projects v', { ...ctx, projectIds: [] })).toEqual({ outcome: 'unchanged' });
  });
});

describe('lang argument completion', () => {
  it('completes to the other locale, since the current one is a no-op', () => {
    expect(complete('lang e', ctx)).toEqual({ outcome: 'completed', value: 'lang en' });
    expect(complete('lang e', { ...ctx, locale: 'en' })).toEqual({
      outcome: 'completed',
      value: 'lang es',
    });
  });

  it('leaves values outside es|en unchanged', () => {
    expect(complete('lang f', ctx)).toEqual({ outcome: 'unchanged' });
  });
});

describe('other commands', () => {
  it('does not complete arguments of commands without completable arguments', () => {
    expect(complete('stack r', ctx)).toEqual({ outcome: 'unchanged' });
    expect(complete('ask wh', ctx)).toEqual({ outcome: 'unchanged' });
  });
});
