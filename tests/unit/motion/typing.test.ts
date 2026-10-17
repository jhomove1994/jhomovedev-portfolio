import { describe, expect, it } from 'vitest';
import {
  COMMAND_MS_PER_CHAR,
  COMMIT_MS_PER_CHAR,
  splitCommand,
  typedCount,
  typedSegments,
  typingTimes,
} from '../../../src/lib/motion/typing';

describe('typingTimes', () => {
  it('gives one cumulative time per character, strictly increasing', () => {
    const times = typingTimes('cat about.md', 50, 15);
    expect(times).toHaveLength(12);
    times.forEach((time, index) => {
      if (index > 0) expect(time).toBeGreaterThan(times[index - 1]!);
    });
  });

  it('is deterministic and keeps every step within the jitter of the base pace', () => {
    expect(typingTimes('git log --graph', 50, 15)).toEqual(typingTimes('git log --graph', 50, 15));
    const times = typingTimes('abcdefghij', 50, 15);
    times.forEach((time, index) => {
      const step = time - (times[index - 1] ?? 0);
      expect(step).toBeGreaterThanOrEqual(35);
      expect(step).toBeLessThanOrEqual(65);
    });
  });

  it('is exactly regular without jitter and empty for an empty text', () => {
    expect(typingTimes('abc', 20, 0)).toEqual([20, 40, 60]);
    expect(typingTimes('', 50, 15)).toEqual([]);
  });

  it('counts a surrogate pair as one character', () => {
    expect(typingTimes('a😀b', 10, 0)).toEqual([10, 20, 30]);
  });

  it('pins the readable paces: commands ~50ms per char, commit lines ~20ms', () => {
    expect(COMMAND_MS_PER_CHAR).toBeGreaterThanOrEqual(40);
    expect(COMMAND_MS_PER_CHAR).toBeLessThanOrEqual(60);
    expect(COMMIT_MS_PER_CHAR).toBeGreaterThanOrEqual(15);
    expect(COMMIT_MS_PER_CHAR).toBeLessThanOrEqual(25);
  });
});

describe('typedCount', () => {
  const times = [20, 40, 60];

  it('is the number of characters already due', () => {
    expect(typedCount(times, 0)).toBe(0);
    expect(typedCount(times, 19)).toBe(0);
    expect(typedCount(times, 20)).toBe(1);
    expect(typedCount(times, 59)).toBe(2);
  });

  it('never exceeds the text and ignores negative time', () => {
    expect(typedCount(times, 10_000)).toBe(3);
    expect(typedCount(times, -5)).toBe(0);
  });
});

describe('typedSegments', () => {
  it('spreads the typed characters over the segments in order', () => {
    expect(typedSegments(['ab', 'cd', 'e'], 0)).toEqual(['', '', '']);
    expect(typedSegments(['ab', 'cd', 'e'], 3)).toEqual(['ab', 'c', '']);
    expect(typedSegments(['ab', 'cd', 'e'], 99)).toEqual(['ab', 'cd', 'e']);
  });

  it('keeps a surrogate pair whole', () => {
    expect(typedSegments(['a😀', 'b'], 2)).toEqual(['a😀', '']);
  });
});

describe('splitCommand', () => {
  it('separates the shell prompt from the command', () => {
    expect(splitCommand('$ cat about.md')).toEqual({ prompt: '$', body: 'cat about.md' });
  });

  it('leaves a text without a prompt whole', () => {
    expect(splitCommand('cat about.md')).toEqual({ prompt: '', body: 'cat about.md' });
  });
});
