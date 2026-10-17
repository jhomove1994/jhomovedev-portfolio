import { describe, expect, it } from 'vitest';
import { dampValue, normalizePointer, parallaxOffset } from '../../../src/lib/hero/parallax';

const limits = { x: 0.04, y: 0.02 };

describe('parallaxOffset', () => {
  it('is zero at the centre of the viewport', () => {
    expect(parallaxOffset({ x: 0, y: 0 }, { limits })).toEqual({ x: 0, y: 0 });
  });

  it('maps the pointer proportionally inside the limits', () => {
    const offset = parallaxOffset({ x: 0.5, y: -0.25 }, { limits });
    expect(offset.x).toBeCloseTo(0.02, 10);
    expect(offset.y).toBeCloseTo(-0.005, 10);
  });

  it('clamps extreme coordinates to the configured maximum', () => {
    expect(parallaxOffset({ x: 12, y: -9 }, { limits })).toEqual({ x: 0.04, y: -0.02 });
    expect(parallaxOffset({ x: -3, y: 40 }, { limits })).toEqual({ x: -0.04, y: 0.02 });
  });

  it('scales the offset by the weight argument', () => {
    const half = parallaxOffset({ x: 1, y: 1 }, { limits, weight: 0.5 });
    expect(half.x).toBeCloseTo(0.02, 10);
    expect(half.y).toBeCloseTo(0.01, 10);
    expect(parallaxOffset({ x: 1, y: 1 }, { limits, weight: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('keeps the weight inside 0..1 so it can never push past the limits', () => {
    expect(parallaxOffset({ x: 1, y: 1 }, { limits, weight: 4 })).toEqual({ x: 0.04, y: 0.02 });
    expect(parallaxOffset({ x: 1, y: 1 }, { limits, weight: -1 })).toEqual({ x: 0, y: 0 });
  });

  it('does nothing for a coarse pointer, whatever the coordinates', () => {
    expect(parallaxOffset({ x: 1, y: 1 }, { limits, coarse: true })).toEqual({ x: 0, y: 0 });
    expect(parallaxOffset({ x: -0.3, y: 0.8 }, { limits, coarse: true })).toEqual({ x: 0, y: 0 });
  });
});

describe('normalizePointer', () => {
  it('puts the viewport centre at 0,0 and the corners at +-1 with y up', () => {
    expect(normalizePointer(720, 450, 1440, 900)).toEqual({ x: 0, y: 0 });
    expect(normalizePointer(0, 0, 1440, 900)).toEqual({ x: -1, y: 1 });
    expect(normalizePointer(1440, 900, 1440, 900)).toEqual({ x: 1, y: -1 });
  });

  it('clamps a pointer that left the viewport', () => {
    expect(normalizePointer(-200, 2000, 1440, 900)).toEqual({ x: -1, y: -1 });
  });

  it('survives a zero-sized viewport', () => {
    expect(normalizePointer(10, 10, 0, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe('dampValue', () => {
  it('does not move when no time has passed', () => {
    expect(dampValue(1, 5, 6, 0)).toBe(1);
  });

  it('moves toward the target without overshooting', () => {
    const next = dampValue(0, 10, 6, 1 / 60);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(10);
  });

  it('settles on the target after a long step', () => {
    expect(dampValue(0, 10, 6, 5)).toBeCloseTo(10, 5);
  });

  it('is frame-rate independent: two half steps equal one full step', () => {
    const full = dampValue(0, 10, 6, 1 / 30);
    const half = dampValue(dampValue(0, 10, 6, 1 / 60), 10, 6, 1 / 60);
    expect(half).toBeCloseTo(full, 10);
  });
});
