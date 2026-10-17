import { describe, expect, it } from 'vitest';
import {
  HISTORY_LIMIT,
  createHistory,
  historyNext,
  historyPrev,
  recordEntry,
} from '../../../src/lib/terminal/history';

function withEntries(...inputs: string[]) {
  return inputs.reduce(recordEntry, createHistory());
}

describe('recordEntry', () => {
  it('stores submitted commands oldest first', () => {
    expect(withEntries('a', 'b').entries).toEqual(['a', 'b']);
  });

  it('collapses consecutive duplicates but keeps separated ones', () => {
    expect(withEntries('a', 'a', 'a').entries).toEqual(['a']);
    expect(withEntries('a', 'b', 'a').entries).toEqual(['a', 'b', 'a']);
  });

  it('never stores empty or whitespace-only input', () => {
    const history = withEntries('a');
    expect(recordEntry(history, '').entries).toEqual(['a']);
    expect(recordEntry(history, '   ').entries).toEqual(['a']);
  });

  it('stores the trimmed command', () => {
    expect(withEntries('  whoami  ').entries).toEqual(['whoami']);
  });

  it('keeps only the last 50 of 60 distinct commands', () => {
    const inputs = Array.from({ length: 60 }, (_, i) => `cmd${i}`);
    const { entries } = withEntries(...inputs);
    expect(HISTORY_LIMIT).toBe(50);
    expect(entries).toHaveLength(50);
    expect(entries[0]).toBe('cmd10');
    expect(entries[49]).toBe('cmd59');
  });

  it('leaves browsing mode and clears the saved draft', () => {
    const browsing = historyPrev(withEntries('a', 'b'), 'x').history;
    const after = recordEntry(browsing, 'c');
    expect(after.cursor).toBeNull();
    expect(after.draft).toBe('');
  });

  it('does not mutate the previous state', () => {
    const before = withEntries('a');
    recordEntry(before, 'b');
    expect(before.entries).toEqual(['a']);
  });
});

describe('browsing', () => {
  it('walks Up, Up, Down, Down as b, a, b, then the draft', () => {
    const start = withEntries('a', 'b');
    const up1 = historyPrev(start, 'x');
    const up2 = historyPrev(up1.history, 'b');
    const down1 = historyNext(up2.history);
    const down2 = historyNext(down1.history);

    expect([up1.input, up2.input, down1.input, down2.input]).toEqual(['b', 'a', 'b', 'x']);
    expect(down2.history.cursor).toBeNull();
  });

  it('stays on the oldest entry when pressing Up past the start', () => {
    let result = historyPrev(withEntries('a', 'b'), '');
    result = historyPrev(result.history, '');
    result = historyPrev(result.history, '');
    expect(result.input).toBe('a');
  });

  it('keeps the first draft while browsing instead of overwriting it with recalled text', () => {
    let result = historyPrev(withEntries('a', 'b'), 'draft');
    result = historyPrev(result.history, 'b');
    expect(result.history.draft).toBe('draft');
  });

  it('leaves the input unchanged (null) on Up with empty history', () => {
    const result = historyPrev(createHistory(), 'typing');
    expect(result.input).toBeNull();
    expect(result.history).toEqual(createHistory());
  });

  it('leaves the input unchanged (null) on Down when not browsing', () => {
    const history = withEntries('a');
    const result = historyNext(history);
    expect(result.history).toBe(history);
    expect(result.input).toBeNull();
  });
});
