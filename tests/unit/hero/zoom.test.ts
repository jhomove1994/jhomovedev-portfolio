import { describe, expect, it } from 'vitest';
import { projectPoint } from '../../../src/lib/hero/camera';
import { DESKTOP_ASPECT, restCameraFor } from '../../../src/lib/hero/layout';
import { screenCorners } from '../../../src/lib/hero/monitor';
import {
  matrix3dCss,
  projectRect,
  quadToMatrix3d,
  type Point,
  type Quad,
} from '../../../src/lib/hero/zoom';

const STAGE = { width: 1361, height: 851 };

/** Applies a column-major matrix3d to a point in the z = 0 plane, with the perspective divide. */
function apply(m: readonly number[], x: number, y: number): Point {
  const w = m[3]! * x + m[7]! * y + m[15]!;
  return {
    x: (m[0]! * x + m[4]! * y + m[12]!) / w,
    y: (m[1]! * x + m[5]! * y + m[13]!) / w,
  };
}

const expectQuad = (matrix: readonly number[], width: number, height: number, quad: Quad) => {
  const box = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ] as const;
  box.forEach(([x, y], i) => {
    const mapped = apply(matrix, x, y);
    expect(mapped.x).toBeCloseTo(quad[i]!.x, 6);
    expect(mapped.y).toBeCloseTo(quad[i]!.y, 6);
  });
};

describe('quadToMatrix3d', () => {
  it('is a plain translation when the quad is the box moved', () => {
    const quad: Quad = [
      { x: 100, y: 50 },
      { x: 540, y: 50 },
      { x: 540, y: 322 },
      { x: 100, y: 322 },
    ];
    const m = quadToMatrix3d(440, 272, quad);
    expect(m[0]).toBeCloseTo(1, 9);
    expect(m[5]).toBeCloseTo(1, 9);
    expect(m[12]).toBeCloseTo(100, 9);
    expect(m[13]).toBeCloseTo(50, 9);
    expect(m[3]).toBeCloseTo(0, 12);
    expect(m[7]).toBeCloseTo(0, 12);
    expectQuad(m, 440, 272, quad);
  });

  it('scales a box down onto a smaller quad (the terminal on a distant screen)', () => {
    const quad: Quad = [
      { x: 699, y: 223 },
      { x: 975, y: 223 },
      { x: 975, y: 392 },
      { x: 699, y: 392 },
    ];
    expectQuad(quadToMatrix3d(440, 271, quad), 440, 271, quad);
  });

  it('maps all four corners of a perspective quad (top edge narrower than the bottom)', () => {
    const quad: Quad = [
      { x: 710, y: 230 },
      { x: 960, y: 232 },
      { x: 990, y: 410 },
      { x: 690, y: 405 },
    ];
    const m = quadToMatrix3d(440, 271, quad);
    expectQuad(m, 440, 271, quad);
    expect(Math.abs(m[3]!) + Math.abs(m[7]!)).toBeGreaterThan(0); // a real perspective term
  });

  it('keeps the box centre inside the quad', () => {
    const quad: Quad = [
      { x: 10, y: 0 },
      { x: 90, y: 0 },
      { x: 100, y: 60 },
      { x: 0, y: 60 },
    ];
    const centre = apply(quadToMatrix3d(200, 100, quad), 100, 50);
    expect(centre.x).toBeGreaterThan(10);
    expect(centre.x).toBeLessThan(90);
    expect(centre.y).toBeGreaterThan(0);
    expect(centre.y).toBeLessThan(60);
  });
});

describe('matrix3dCss', () => {
  it('writes the 16 numbers as a CSS matrix3d()', () => {
    const css = matrix3dCss([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 12.5, -3, 0, 1]);
    expect(css).toBe('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,12.5,-3,0,1)');
  });

  it('never prints exponent notation, which CSS accepts but tiny perspective terms would trigger', () => {
    const css = matrix3dCss([1, 0, 0, 0.0000004, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    expect(css).not.toMatch(/e-/);
    expect(css).toContain('0.0000004');
  });
});

describe('projectRect', () => {
  const aspect = DESKTOP_ASPECT;
  const pose = restCameraFor(aspect);
  const project = (p: readonly [number, number, number]) => projectPoint(pose, aspect, p);

  it('puts the screen corners in stage pixels, top-left first, y down', () => {
    const quad = projectRect(screenCorners(), project, STAGE);
    const [tl, tr, br, bl] = quad;
    expect(tr.x).toBeGreaterThan(tl.x);
    expect(br.x).toBeGreaterThan(bl.x);
    expect(bl.y).toBeGreaterThan(tl.y);
    expect(br.y).toBeGreaterThan(tr.y);
  });

  it('is about a fifth of the stage wide, on the right of the hero text', () => {
    const [tl, tr] = projectRect(screenCorners(), project, STAGE);
    const share = (tr.x - tl.x) / STAGE.width;
    expect(share).toBeGreaterThan(0.19);
    expect(share).toBeLessThan(0.3);
    expect(tl.x / STAGE.width).toBeGreaterThan(0.36);
  });

  it('keeps the glass aspect roughly: wider than tall', () => {
    const [tl, tr, , bl] = projectRect(screenCorners(), project, STAGE);
    expect(tr.x - tl.x).toBeGreaterThan(1.4 * (bl.y - tl.y));
  });

  it('maps ndc 0,0 to the stage centre and ndc 1,1 to the top right', () => {
    const corners = screenCorners();
    const fake = (p: readonly [number, number, number]) => ({
      x: p === corners[0] ? 1 : 0,
      y: p === corners[0] ? 1 : 0,
    });
    const [first, second] = projectRect(corners, fake, STAGE);
    expect(first).toEqual({ x: STAGE.width, y: 0 });
    expect(second).toEqual({ x: STAGE.width / 2, y: STAGE.height / 2 });
  });
});
