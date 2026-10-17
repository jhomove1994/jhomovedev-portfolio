import { describe, expect, it } from 'vitest';
import { TYPE_MS_PER_CHAR, typedDurationMs, typedText } from '../../../src/lib/motion/typing';

describe('typedText', () => {
  it('shows nothing before the first character is due', () => {
    expect(typedText('$ cat about.md', 0)).toBe('');
  });

  it('reveals one character per step', () => {
    expect(typedText('$ cat', TYPE_MS_PER_CHAR)).toBe('$');
    expect(typedText('$ cat', TYPE_MS_PER_CHAR * 3)).toBe('$ c');
  });

  it('never exceeds the command and ignores negative time', () => {
    expect(typedText('$ cat', 10_000)).toBe('$ cat');
    expect(typedText('$ cat', -50)).toBe('');
  });

  it('counts a surrogate pair as one character', () => {
    expect(typedText('a😀b', TYPE_MS_PER_CHAR * 2)).toBe('a😀');
  });
});

describe('typedDurationMs', () => {
  it('is the time needed to type the whole command', () => {
    expect(typedDurationMs('$ cat')).toBe(5 * TYPE_MS_PER_CHAR);
    expect(typedDurationMs('')).toBe(0);
  });
});
