/**
 * Projecting the monitor glass to stage pixels and turning that quad into a CSS `matrix3d`
 * (pure, three-free). The overlay renderer of the terminal uses it every frame: the camera is
 * injected as a `project` function, so the same maths works for the rest pose, parallax and the
 * scroll zoom.
 */
import type { Ndc } from './camera';
import type { CameraPose } from './layout';
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

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export interface ZoomRange {
  /** Scroll offset (px) where the zoom begins. */
  start: number;
  /** Scroll offset (px) where the camera has arrived. */
  end: number;
}

/** 0 at and before `start`, 1 at and after `end`, linear between. An empty range is a step. */
export function zoomProgress(scroll: number, { start, end }: ZoomRange): number {
  if (end <= start) return scroll >= end ? 1 : 0;
  return clamp01((scroll - start) / (end - start));
}

/** Slow in, slow out: the dolly starts and lands gently. Input is clamped to 0..1. */
export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixVec = (a: Vec3, b: Vec3, t: number): Vec3 => [
  mix(a[0], b[0], t),
  mix(a[1], b[1], t),
  mix(a[2], b[2], t),
];

/** Straight blend of two camera poses; `t` is clamped, so the endpoints are returned exactly. */
export function interpolatePose(from: CameraPose, to: CameraPose, t: number): CameraPose {
  const k = clamp01(t);
  if (k === 0) return from;
  if (k === 1) return to;
  return {
    position: mixVec(from.position, to.position, k),
    target: mixVec(from.target, to.target, k),
    fov: mix(from.fov, to.fov, k),
  };
}

export interface FillRequest {
  /** World size of the subject along the measured axis, metres. */
  extent: number;
  /** Vertical field of view, degrees. */
  fov: number;
  /** Width over height of the view for a width; 1 for a height. */
  aspect: number;
  /** Share of the view the extent should cover, 0..1. */
  fraction: number;
}

/** Distance in front of a flat subject at which `extent` covers `fraction` of the view axis. */
export function screenFillDistance({ extent, fov, aspect, fraction }: FillRequest): number {
  return extent / (2 * Math.tan((fov * Math.PI) / 360) * aspect * fraction);
}

export interface ZoomEndRequest {
  /** Glass centre, world space. */
  center: Vec3;
  /** Unit normal of the glass, pointing at the viewer. */
  normal: Vec3;
  glassWidth: number;
  glassHeight: number;
  fov: number;
  /** Canvas width over height. */
  aspect: number;
  /** The glass must cover at least this share of the canvas width (S10). */
  minWidthFraction: number;
  /** ...and is not allowed to cover more than this share of the canvas height. */
  heightFraction: number;
}

/**
 * Where the camera ends the zoom: on the glass normal, as close as the height allows but never so
 * far that the glass drops under the minimum width. When both cannot hold (a tall glass) the
 * width minimum wins, so the terminal is always at least `minWidthFraction` of the canvas wide.
 */
export function zoomEndPose(request: ZoomEndRequest): CameraPose {
  const { center, normal, glassWidth, glassHeight, fov, aspect } = request;
  const forHeight = screenFillDistance({
    extent: glassHeight,
    fov,
    aspect: 1,
    fraction: request.heightFraction,
  });
  const forWidth = screenFillDistance({
    extent: glassWidth,
    fov,
    aspect,
    fraction: request.minWidthFraction,
  });
  const distance = Math.min(forHeight, forWidth);
  return {
    position: [
      center[0] + normal[0] * distance,
      center[1] + normal[1] * distance,
      center[2] + normal[2] * distance,
    ],
    target: center,
    fov,
  };
}

/** Scroll-driven state the frame loop reads: written by the scroll trigger, never re-rendered. */
export interface ZoomStore {
  /** 0 at rest, 1 when the camera has arrived at the glass. */
  progress: number;
}

export function createZoomStore(): ZoomStore {
  return { progress: 0 };
}
