import { describe, expect, it } from 'vitest';
import { currentStage, nodeFractions, traceTarget } from '../../../src/lib/motion/stage';

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

describe('traceTarget', () => {
  const fractions = [0.05, 0.4, 0.9];

  it('is the empty graph before any commit appears', () => {
    expect(traceTarget([false, false, false], fractions)).toBe(0);
  });

  it('grows down to the last commit that appeared', () => {
    expect(traceTarget([true, false, false], fractions)).toBe(0.05);
    expect(traceTarget([true, true, false], fractions)).toBe(0.4);
  });

  it('closes the whole graph once every commit appeared', () => {
    expect(traceTarget([true, true, true], fractions)).toBe(1);
  });

  it('is the whole graph when there are no commits to wait for', () => {
    expect(traceTarget([], [])).toBe(1);
  });
});
