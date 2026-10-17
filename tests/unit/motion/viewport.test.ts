import { describe, expect, it } from 'vitest';
import { ENTER_LINE, hasEntered } from '../../../src/lib/motion/viewport';

describe('hasEntered', () => {
  it('is true once the section top is above the enter line', () => {
    expect(hasEntered(ENTER_LINE * 800 - 1, 800)).toBe(true);
    expect(hasEntered(-300, 800)).toBe(true);
  });

  it('is false while the top is below the enter line', () => {
    expect(hasEntered(ENTER_LINE * 800 + 1, 800)).toBe(false);
    expect(hasEntered(2000, 800)).toBe(false);
  });
});
