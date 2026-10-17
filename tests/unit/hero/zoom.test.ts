import { describe, expect, it } from 'vitest';
import { projectPoint } from '../../../src/lib/hero/camera';
import { DESKTOP_ASPECT, restCameraFor } from '../../../src/lib/hero/layout';
import { screenCorners } from '../../../src/lib/hero/monitor';
import {
  createZoomStore,
  easeInOutCubic,
  interpolatePose,
  matrix3dCss,
  projectRect,
  quadToMatrix3d,
  screenFillDistance,
  zoomEndPose,
  zoomProgress,
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

describe('zoomProgress', () => {
  const range = { start: 0, end: 1000 };

  it('is 0 before and at the start, 1 at and past the end', () => {
    expect(zoomProgress(-50, range)).toBe(0);
    expect(zoomProgress(0, range)).toBe(0);
    expect(zoomProgress(1000, range)).toBe(1);
    expect(zoomProgress(1500, range)).toBe(1);
  });

  it('is strictly between 0 and 1 inside the range and never goes back as scroll grows', () => {
    expect(zoomProgress(250, range)).toBeCloseTo(0.25, 12);
    const samples = [-100, 0, 100, 400, 999, 1000, 2000].map((y) => zoomProgress(y, range));
    samples.slice(1).forEach((value, i) => expect(value).toBeGreaterThanOrEqual(samples[i]!));
  });

  it('honours an offset start and survives an empty range', () => {
    expect(zoomProgress(300, { start: 200, end: 400 })).toBeCloseTo(0.5, 12);
    expect(zoomProgress(10, { start: 100, end: 100 })).toBe(0);
    expect(zoomProgress(100, { start: 100, end: 100 })).toBe(1);
  });
});

describe('easeInOutCubic', () => {
  it('keeps the endpoints, is 0.5 at the middle and is monotonic', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 12);
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25);
    expect(easeInOutCubic(0.75)).toBeGreaterThan(0.75);
    expect(easeInOutCubic(-1)).toBe(0);
    expect(easeInOutCubic(2)).toBe(1);
  });
});

describe('interpolatePose', () => {
  const from = { position: [0, 1, 4], target: [0, 0, 0], fov: 32 } as const;
  const to = { position: [2, 3, 1], target: [1, 1, -1], fov: 20 } as const;

  it('returns the endpoints at 0 and 1 and clamps outside', () => {
    expect(interpolatePose(from, to, 0)).toEqual(from);
    expect(interpolatePose(from, to, 1)).toEqual(to);
    expect(interpolatePose(from, to, -3)).toEqual(from);
    expect(interpolatePose(from, to, 7)).toEqual(to);
  });

  it('blends position, target and fov linearly at the middle', () => {
    const mid = interpolatePose(from, to, 0.5);
    expect(mid.position).toEqual([1, 2, 2.5]);
    expect(mid.target).toEqual([0.5, 0.5, -0.5]);
    expect(mid.fov).toBe(26);
  });
});

describe('screenFillDistance', () => {
  it('is the distance at which an extent fills the given fraction of the view', () => {
    const fov = 40;
    const tan = Math.tan((fov * Math.PI) / 360);
    expect(screenFillDistance({ extent: 1, fov, aspect: 1, fraction: 1 })).toBeCloseTo(
      1 / (2 * tan),
      12,
    );
    // Half the fraction needs twice the distance; a wider view needs less for a width.
    expect(screenFillDistance({ extent: 1, fov, aspect: 1, fraction: 0.5 })).toBeCloseTo(
      1 / tan,
      12,
    );
    expect(screenFillDistance({ extent: 1, fov, aspect: 2, fraction: 1 })).toBeCloseTo(
      1 / (4 * tan),
      12,
    );
  });
});

describe('zoomEndPose', () => {
  const base = {
    center: [0.2, 0.4, -0.1],
    normal: [0, 0.6, 0.8],
    fov: 32,
    aspect: 1.6,
    minWidthFraction: 0.6,
    heightFraction: 0.85,
  } as const;
  const widthShare = (glassWidth: number, glassHeight: number, aspect: number = base.aspect) => {
    const pose = zoomEndPose({ ...base, aspect, glassWidth, glassHeight });
    const distance = Math.hypot(...pose.position.map((v, i) => v - base.center[i]!));
    const tan = Math.tan((base.fov * Math.PI) / 360);
    return {
      width: glassWidth / (2 * distance * tan * aspect),
      height: glassHeight / (2 * distance * tan),
      pose,
    };
  };

  it('looks straight at the glass along its normal', () => {
    const { pose } = widthShare(0.38, 0.234);
    expect(pose.target).toEqual([0.2, 0.4, -0.1]);
    const offset = pose.position.map((v, i) => v - base.center[i]!);
    const length = Math.hypot(...offset);
    offset.forEach((v, i) => expect(v / length).toBeCloseTo(base.normal[i]!, 9));
    expect(pose.fov).toBe(32);
  });

  it('fills the height up to the fraction when that keeps the width above the minimum', () => {
    const { width, height } = widthShare(0.38, 0.234);
    expect(height).toBeCloseTo(0.85, 9);
    expect(width).toBeGreaterThanOrEqual(0.6);
  });

  it('lets the width minimum win for a tall glass (S10)', () => {
    const { width, height } = widthShare(0.2, 0.4);
    expect(width).toBeGreaterThanOrEqual(0.6 - 1e-9);
    expect(width).toBeCloseTo(0.6, 9);
    expect(height).toBeGreaterThan(0.85);
  });

  it('gives a terminal at least 60% of the width on any stage aspect', () => {
    for (const aspect of [1.2, 1.6, 2.4]) {
      expect(widthShare(0.38, 0.234, aspect).width).toBeGreaterThanOrEqual(0.6 - 1e-9);
    }
  });
});

describe('createZoomStore', () => {
  it('starts at rest and is a plain mutable record the frame loop can read', () => {
    const store = createZoomStore();
    expect(store.progress).toBe(0);
    store.progress = 0.4;
    expect(store.progress).toBe(0.4);
    expect(createZoomStore().progress).toBe(0);
  });
});
