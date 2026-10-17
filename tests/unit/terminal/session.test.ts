import { describe, expect, it, vi } from 'vitest';
import { createTerminalSession } from '../../../src/lib/terminal/session';
import type { Line } from '../../../src/lib/terminal/types';
import { labelsFor, makeData } from './fixtures';

function setup(locale: 'en' | 'es' = 'en') {
  return { session: createTerminalSession(makeData(locale), labelsFor(locale)) };
}

const WHOAMI_LINES: Line[] = [[{ text: 'Fixture whoami text' }]];

describe('initial state', () => {
  it('starts with the finished intro: a whoami entry, whoami window, no typing', () => {
    const { session } = setup();
    expect(session.getSnapshot()).toMatchObject({
      transcript: [{ id: 0, input: 'whoami', lines: WHOAMI_LINES }],
      draft: '',
      activeWindow: 'whoami',
      typing: null,
      history: { entries: [], cursor: null },
    });
  });
});

describe('submit', () => {
  it('appends one transcript entry and one history entry, and returns the effects', () => {
    const { session } = setup();
    const effects = session.submit('cv');
    const state = session.getSnapshot();
    expect(state.transcript).toHaveLength(2);
    expect(state.transcript[1]).toMatchObject({ id: 1, input: 'cv' });
    expect(state.history.entries).toEqual(['cv']);
    expect(effects).toEqual([{ kind: 'download', href: '/uploads/cv-en.pdf' }]);
    expect(state.activeWindow).toBe('cv');
  });

  it('returns navigate effects and keeps the previous window for unknown commands', () => {
    const { session } = setup();
    expect(session.submit('lang es')).toEqual([{ kind: 'navigate', href: '/es/' }]);
    session.submit('stack');
    session.submit('zzzzzz');
    expect(session.getSnapshot().activeWindow).toBe('stack');
  });

  it('is byte-identical whether typed or run from a clickable suggestion', () => {
    const typed = setup().session;
    typed.setDraft('stack');
    typed.submit('stack');
    const clicked = setup().session;
    clicked.submit('stack');
    expect(JSON.stringify(clicked.getSnapshot())).toBe(JSON.stringify(typed.getSnapshot()));
    expect(clicked.getSnapshot().activeWindow).toBe('stack');
    expect(clicked.getSnapshot().history.entries).toEqual(['stack']);
  });

  it('clears the draft after submitting', () => {
    const { session } = setup();
    session.setDraft('help');
    session.submit('help');
    expect(session.getSnapshot().draft).toBe('');
  });

  it('ignores empty and whitespace-only input: no entry, no history, no effects', () => {
    const { session } = setup();
    expect(session.submit('   ')).toEqual([]);
    const state = session.getSnapshot();
    expect(state.transcript).toHaveLength(1);
    expect(state.history.entries).toEqual([]);
  });
});

describe('clear', () => {
  it('the clear command empties the transcript but keeps history and reports the effect', () => {
    const { session } = setup();
    session.submit('help');
    const effects = session.submit('clear');
    const state = session.getSnapshot();
    expect(effects).toEqual([{ kind: 'clear' }]);
    expect(state.transcript).toEqual([]);
    expect(state.history.entries).toEqual(['help', 'clear']);
  });

  it('clear() empties the transcript without touching history or the draft', () => {
    const { session } = setup();
    session.submit('help');
    session.setDraft('sta');
    session.clear();
    const state = session.getSnapshot();
    expect(state.transcript).toEqual([]);
    expect(state.history.entries).toEqual(['help']);
    expect(state.draft).toBe('sta');
  });
});

describe('history browsing', () => {
  it('walks Up/Up/Down/Down through entries and restores the draft', () => {
    const { session } = setup();
    session.submit('help');
    session.submit('stack');
    session.setDraft('con');
    session.historyPrev();
    expect(session.getSnapshot().draft).toBe('stack');
    session.historyPrev();
    expect(session.getSnapshot().draft).toBe('help');
    session.historyNext();
    expect(session.getSnapshot().draft).toBe('stack');
    session.historyNext();
    expect(session.getSnapshot().draft).toBe('con');
  });

  it('leaves the draft alone when there is no history', () => {
    const { session } = setup();
    session.setDraft('abc');
    session.historyPrev();
    session.historyNext();
    expect(session.getSnapshot().draft).toBe('abc');
  });
});

describe('complete', () => {
  it('completes a unique command name and reports that Tab was consumed', () => {
    const { session } = setup();
    session.setDraft('wh');
    expect(session.complete()).toBe(true);
    expect(session.getSnapshot().draft).toBe('whoami');
  });

  it('completes project ids from the published projects', () => {
    const { session } = setup();
    session.setDraft('projects vi');
    expect(session.complete()).toBe(true);
    expect(session.getSnapshot().draft).toBe('projects virtual-card');
  });

  it('lists runnable candidates when several commands match with no longer prefix', () => {
    const { session } = setup();
    session.setDraft('c');
    expect(session.complete()).toBe(true);
    const state = session.getSnapshot();
    expect(state.draft).toBe('c');
    const last = state.transcript.at(-1)!;
    expect(last.input).toBe('c');
    expect(
      last.lines
        .flat()
        .filter((segment) => segment.run !== undefined)
        .map((s) => s.run),
    ).toEqual(['certs', 'contact', 'cv', 'clear']);
    expect(state.history.entries).toEqual([]);
  });

  it('returns false so Tab moves focus: empty draft or no match', () => {
    const { session } = setup();
    expect(session.complete()).toBe(false);
    session.setDraft('zz');
    expect(session.complete()).toBe(false);
    expect(session.getSnapshot().draft).toBe('zz');
  });
});

describe('abandon', () => {
  it('prints the abandoned draft with ^C, clears it and stores nothing in history', () => {
    const { session } = setup();
    session.setDraft('hel');
    session.abandon();
    const state = session.getSnapshot();
    expect(state.transcript.at(-1)).toMatchObject({ input: 'hel^C', lines: [] });
    expect(state.draft).toBe('');
    expect(state.history.entries).toEqual([]);
  });
});

describe('store contract', () => {
  it('returns a stable snapshot reference until the state changes', () => {
    const { session } = setup();
    expect(session.getSnapshot()).toBe(session.getSnapshot());
    const before = session.getSnapshot();
    session.setDraft('a');
    expect(session.getSnapshot()).not.toBe(before);
    expect(session.getSnapshot()).toBe(session.getSnapshot());
  });

  it('notifies subscribers once per change and stops after unsubscribe', () => {
    const { session } = setup();
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);
    session.setDraft('a');
    expect(listener).toHaveBeenCalledTimes(1);
    session.setDraft('a');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    session.setDraft('ab');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
