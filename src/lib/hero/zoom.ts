/**
 * Projecting the monitor glass to stage pixels and turning that quad into a CSS `matrix3d`
 * (pure, three-free). The overlay renderer of the terminal uses it every frame: the camera is
 * injected as a `project` function, so the same maths works for the rest pose, parallax and the
 * scroll zoom of a later change.
 */
import type { Ndc } from './camera';
import type { Vec3 } from './screen-anchor';

export interface Point {
  x: number;
  y: number;
}

/** Top-left, top-right, bottom-right, bottom-left. */
export type Quad = readonly [Point, Point, Point, Point];

export interface StageSize {
  width: number;
  height: number;
}

type Corners = readonly [Vec3, Vec3, Vec3, Vec3];

/** Four world corners to stage pixels (origin top-left, y down). */
export function projectRect(
  corners: Corners,
  project: (point: Vec3) => Ndc,
  stage: StageSize,
): Quad {
  const toPixels = (corner: Vec3): Point => {
    const ndc = project(corner);
    return {
      x: ((ndc.x + 1) / 2) * stage.width,
      y: ((1 - ndc.y) / 2) * stage.height,
    };
  };
  return [toPixels(corners[0]), toPixels(corners[1]), toPixels(corners[2]), toPixels(corners[3])];
}

/**
 * Column-major matrix3d that maps a `width` x `height` box (origin top-left, z = 0) onto `quad`,
 * perspective included. Unit square to quad is Heckbert's closed form; the box scale is folded in.
 */
export function quadToMatrix3d(width: number, height: number, quad: Quad): number[] {
  const [p0, p1, p2, p3] = quad;
  const sx = p0.x - p1.x + p2.x - p3.x;
  const sy = p0.y - p1.y + p2.y - p3.y;
  let a: number, b: number, d: number, e: number, g: number, h: number;
  if (sx === 0 && sy === 0) {
    // A parallelogram needs no perspective term.
    a = p1.x - p0.x;
    b = p3.x - p0.x;
    d = p1.y - p0.y;
    e = p3.y - p0.y;
    g = 0;
    h = 0;
  } else {
    const dx1 = p1.x - p2.x;
    const dx2 = p3.x - p2.x;
    const dy1 = p1.y - p2.y;
    const dy2 = p3.y - p2.y;
    const det = dx1 * dy2 - dx2 * dy1;
    g = (sx * dy2 - dx2 * sy) / det;
    h = (dx1 * sy - sx * dy1) / det;
    a = p1.x - p0.x + g * p1.x;
    b = p3.x - p0.x + h * p3.x;
    d = p1.y - p0.y + g * p1.y;
    e = p3.y - p0.y + h * p3.y;
  }
  return [
    a / width,
    d / width,
    0,
    g / width,
    b / height,
    e / height,
    0,
    h / height,
    0,
    0,
    1,
    0,
    p0.x,
    p0.y,
    0,
    1,
  ];
}

/** Plain decimal text: `Number#toString` would switch to exponents for tiny perspective terms. */
const decimal = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');

export function matrix3dCss(values: readonly number[]): string {
  return `matrix3d(${values.map(decimal).join(',')})`;
}
