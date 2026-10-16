import { describe, expect, it } from 'vitest';
import { ACCENT_RGB, accentRatio } from '../../../src/lib/visual/accent-ratio';

/** Builds an RGBA buffer of `total` pixels where the first `accent` ones use the accent color. */
function buffer(total: number, accent: number, rest: [number, number, number] = [10, 10, 12]) {
  const data = new Uint8ClampedArray(total * 4);
  for (let i = 0; i < total; i++) {
    const [r, g, b] = i < accent ? ACCENT_RGB : rest;
    data.set([r, g, b, 255], i * 4);
  }
  return data;
}

describe('accentRatio', () => {
  it('is 1 when every pixel is the accent', () => {
    expect(accentRatio(buffer(100, 100))).toBe(1);
  });

  it('is 0 when no pixel is the accent', () => {
    expect(accentRatio(buffer(100, 0))).toBe(0);
  });

  it('measures the share of accent pixels', () => {
    expect(accentRatio(buffer(100, 10))).toBeCloseTo(0.1, 10);
  });

  it('counts near-accent pixels within the tolerance only', () => {
    const near = new Uint8ClampedArray([ACCENT_RGB[0] + 8, ACCENT_RGB[1] - 8, ACCENT_RGB[2], 255]);
    expect(accentRatio(near, { tolerance: 8 })).toBe(1);
    expect(accentRatio(near, { tolerance: 7 })).toBe(0);
  });

  it('ignores fully transparent pixels in the total', () => {
    const data = new Uint8ClampedArray([...ACCENT_RGB, 255, 0, 0, 0, 0]);
    expect(accentRatio(data)).toBe(1);
  });

  it('returns 0 for an empty buffer', () => {
    expect(accentRatio(new Uint8ClampedArray(0))).toBe(0);
  });

  it('rejects buffers that are not whole RGBA pixels', () => {
    expect(() => accentRatio(new Uint8ClampedArray(5))).toThrow();
  });
});
