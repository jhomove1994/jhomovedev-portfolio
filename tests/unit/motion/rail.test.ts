import { describe, expect, it } from 'vitest';
import { fillLength, litNodes, newlyReached } from '../../../src/lib/motion/rail';

describe('fillLength', () => {
  it('maps progress onto the rail height', () => {
    expect(fillLength(0, 400)).toBe(0);
    expect(fillLength(0.25, 400)).toBe(100);
    expect(fillLength(1, 400)).toBe(400);
  });

  it('clamps out-of-range progress', () => {
    expect(fillLength(-1, 400)).toBe(0);
    expect(fillLength(3, 400)).toBe(400);
  });
});

describe('litNodes', () => {
  const offsets = [0, 150, 300];

  it('lights the nodes the fill has reached', () => {
    expect(litNodes(offsets, 0)).toEqual([true, false, false]);
    expect(litNodes(offsets, 149)).toEqual([true, false, false]);
    expect(litNodes(offsets, 150)).toEqual([true, true, false]);
    expect(litNodes(offsets, 400)).toEqual([true, true, true]);
  });

  it('is monotonic in the fill length', () => {
    const counts = [0, 50, 160, 310].map((px) => litNodes(offsets, px).filter(Boolean).length);
    expect(counts).toEqual([1, 1, 2, 3]);
  });

  it('handles an empty rail', () => {
    expect(litNodes([], 100)).toEqual([]);
  });
});

describe('newlyReached', () => {
  it('lists the rows reached since the last update, in order', () => {
    expect(newlyReached([false, false, false], [true, true, false])).toEqual([0, 1]);
    expect(newlyReached([true, false, false], [true, true, false])).toEqual([1]);
  });

  it('never reports a row twice or a row that was left behind', () => {
    expect(newlyReached([true, true], [true, true])).toEqual([]);
    expect(newlyReached([true, true], [false, false])).toEqual([]);
  });
});
