import { describe, expect, it } from 'vitest';
import {
  STAGGER_MAX_STEPS,
  STAGGER_STEP_MS,
  staggerDelayMs,
} from '../../../src/lib/motion/stagger';

describe('staggerDelayMs', () => {
  it('starts after the base delay and steps at a perceptible 150ms', () => {
    expect(STAGGER_STEP_MS).toBe(150);
    expect(staggerDelayMs(0, 200)).toBe(200);
    expect(staggerDelayMs(1, 200)).toBe(350);
    expect(staggerDelayMs(3)).toBe(450);
  });

  it('caps the number of steps so a long list does not trail', () => {
    expect(staggerDelayMs(STAGGER_MAX_STEPS + 20)).toBe(STAGGER_MAX_STEPS * STAGGER_STEP_MS);
  });

  it('treats a negative index as the first item', () => {
    expect(staggerDelayMs(-2, 50)).toBe(50);
  });
});
