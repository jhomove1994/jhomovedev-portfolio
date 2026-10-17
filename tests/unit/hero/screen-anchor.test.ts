import { describe, expect, it } from 'vitest';
import {
  HERO_MODEL_IDS,
  computeScreenAnchor,
  isScreenQuad,
  type Vec3,
} from '../../../src/lib/hero/screen-anchor';

// Kenney computerScreen: vertex positions the pipeline read for the 'metal' face
// (6 indices, 2 triangles, 4 unique vertices; the primitive keeps all 114 vertices).
const QUAD_VERTICES: Record<number, Vec3> = {
  110: [0.3859, 0.0556, -0.0358],
  111: [0.0068, 0.0556, -0.0358],
  112: [0.3859, 0.287, -0.0683],
  113: [0.0068, 0.287, -0.0683],
};
const QUAD_INDICES = [112, 111, 110, 111, 112, 113];

const positions = (indices: readonly number[]): Vec3[] => {
  const table: Vec3[] = [];
  for (const [index, vertex] of Object.entries(QUAD_VERTICES)) table[Number(index)] = vertex;
  return indices.map((i) => table[i]!);
};

describe('computeScreenAnchor', () => {
  const anchor = computeScreenAnchor(positions(QUAD_INDICES));

  it('centres on the mean of the four unique vertices', () => {
    expect(anchor.center[0]).toBeCloseTo(0.19635, 4);
    expect(anchor.center[1]).toBeCloseTo(0.1713, 4);
    expect(anchor.center[2]).toBeCloseTo(-0.05205, 4);
  });

  it('measures width and height along the screen plane (tilted face)', () => {
    expect(anchor.width).toBeCloseTo(0.3791, 4);
    expect(anchor.height).toBeCloseTo(0.2337, 3);
    expect(anchor.aspect).toBeCloseTo(anchor.width / anchor.height, 6);
  });

  it('faces +Z, tilted back (up) by about 8 degrees', () => {
    expect(anchor.normal[0]).toBeCloseTo(0, 6);
    expect(anchor.normal[1]).toBeCloseTo(0.1387, 3);
    expect(anchor.normal[2]).toBeCloseTo(0.9903, 3);
    expect(Math.hypot(...anchor.normal)).toBeCloseTo(1, 6);
    // Euler X rotation that lays a +Z-facing plane onto the quad.
    expect(anchor.rotation[0]).toBeCloseTo(-0.1392, 3);
    expect(anchor.rotation[1]).toBeCloseTo(0, 6);
  });

  it('flips with the winding order (reversed triangles face -Z)', () => {
    const reversed = computeScreenAnchor(positions([110, 111, 112, 113, 112, 111]));
    expect(reversed.normal[2]).toBeLessThan(0);
    expect(reversed.normal[1]).toBeCloseTo(-0.1387, 3);
  });

  it('handles an axis-aligned quad (no tilt, yaw-free)', () => {
    const flat = computeScreenAnchor([
      [1, 0, 0],
      [3, 0, 0],
      [3, 1, 0],
      [1, 0, 0],
      [3, 1, 0],
      [1, 1, 0],
    ]);
    expect(flat.center).toEqual([2, 0.5, 0]);
    expect(flat.width).toBe(2);
    expect(flat.height).toBe(1);
    expect(flat.normal).toEqual([0, 0, 1]);
    expect(flat.rotation).toEqual([0, 0, 0]);
  });

  it('rejects anything that is not a 2-triangle quad', () => {
    expect(() => computeScreenAnchor(positions(QUAD_INDICES.slice(0, 3)))).toThrow(/quad/);
  });
});

describe('isScreenQuad', () => {
  it('accepts only the 6-index primitive', () => {
    expect(isScreenQuad(6)).toBe(true);
    expect(isScreenQuad(210)).toBe(false);
  });
});

describe('HERO_MODEL_IDS', () => {
  it('lists the 8 Kenney models once each, desk and screen included', () => {
    expect(HERO_MODEL_IDS).toHaveLength(8);
    expect(new Set(HERO_MODEL_IDS).size).toBe(8);
    expect(HERO_MODEL_IDS).toEqual(
      expect.arrayContaining(['desk', 'computerScreen', 'computerKeyboard']),
    );
  });
});
