import { describe, expect, it } from 'vitest';
import { currentStage, nodeFractions } from '../../../src/lib/motion/stage';

describe('currentStage', () => {
  it('is the most recent stage, the last one of the list', () => {
    expect(currentStage([false, false, false])).toBe(2);
  });

  it('skips placeholder stages that are only shown in development', () => {
    expect(currentStage([false, false, true])).toBe(1);
    expect(currentStage([false, true, true])).toBe(0);
  });

  it('is -1 when there is no real stage', () => {
    expect(currentStage([])).toBe(-1);
    expect(currentStage([true, true])).toBe(-1);
  });
});

describe('nodeFractions', () => {
  it('turns node positions into fractions of the path length', () => {
    expect(nodeFractions([0, 50, 200], 200)).toEqual([0, 0.25, 1]);
  });

  it('clamps nodes outside the path and survives an empty path', () => {
    expect(nodeFractions([-10, 250], 200)).toEqual([0, 1]);
    expect(nodeFractions([0, 10], 0)).toEqual([0, 0]);
  });
});
