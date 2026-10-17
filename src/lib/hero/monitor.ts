/**
 * Where and how big the terminal sits on the 3D monitor (design AD11), pure and three-free.
 * drei's `<Html transform>` lays a CSS box in the scene: the box is `cssWidth` px wide, one world
 * unit spans `1 / pxToUnit` px at scale 1, and `scale` stretches it to the glass.
 */
import { screenWorldCenter, type CameraPose } from './layout';
import screenAnchor from './screen-anchor.json';
import type { Vec3 } from './screen-anchor';
import { zoomEndPose } from './zoom';

/**
 * How the terminal reaches the screen. `html` renders it through drei `<Html transform occlude>`;
 * `overlay` is the documented fallback (a DOM box aligned to the projected glass) for the case
 * the CSS3D text is too blurry or too slow. Flip this one constant to switch.
 */
export type TerminalOnScreen = 'html' | 'overlay';
export const TERMINAL_ON_SCREEN: TerminalOnScreen = 'overlay';

/**
 * Width of the terminal's CSS box. Small on purpose: the glass is ~270 px wide on a 1440 stage,
 * so a 440 px box shrinks to ~0.6 and keeps 14 px text near 9 px on screen. The box is wider than
 * the glass in CSS pixels only; the scene scales it down.
 */
export const TERMINAL_CSS_WIDTH = 440;

/**
 * World units per CSS pixel of drei's Html transform at scale 1. drei maps
 * `1 / (distanceFactor / 400)` px to one unit and `distanceFactor` defaults to 10, so 40 px = 1
 * unit. Verified against the rendered box by the `@3d terminal` e2e (terminal width vs the
 * projected glass), not just assumed.
 */
export const HTML_PX_TO_UNIT = 1 / 40;

/** How far in front of the glass the box floats, metres: enough to avoid z-fighting. */
export const SCREEN_LIFT = 0.001;

export interface MonitorMount {
  position: Vec3;
  /** Euler angles (XYZ order is enough: the glass only tilts about X). */
  rotation: Vec3;
  /** Value for drei Html's `scale`. */
  scale: number;
  cssWidth: number;
  cssHeight: number;
}

export interface MonitorMountOptions {
  cssWidth?: number;
  pxToUnit?: number;
  lift?: number;
}

export function monitorMount({
  cssWidth = TERMINAL_CSS_WIDTH,
  pxToUnit = HTML_PX_TO_UNIT,
  lift = SCREEN_LIFT,
}: MonitorMountOptions = {}): MonitorMount {
  const [cx, cy, cz] = screenWorldCenter();
  const [nx, ny, nz] = screenAnchor.normal;
  return {
    position: [cx + nx * lift, cy + ny * lift, cz + nz * lift],
    rotation: [...screenAnchor.rotation] as unknown as Vec3,
    scale: screenAnchor.width / (cssWidth * pxToUnit),
    cssWidth,
    cssHeight: Math.round(cssWidth / screenAnchor.aspect),
  };
}

type Corners = readonly [Vec3, Vec3, Vec3, Vec3];

/**
 * World-space corners of the glass (top-left, top-right, bottom-right, bottom-left), lifted like
 * the mount. The glass only tilts about X, so its right edge is world X and its up edge is the
 * normal turned a quarter about X.
 */
export function screenCorners({ lift = SCREEN_LIFT }: { lift?: number } = {}): Corners {
  const { position } = monitorMount({ lift });
  const [, ny, nz] = screenAnchor.normal;
  const right: Vec3 = [1, 0, 0];
  const upLength = Math.hypot(ny, nz);
  const up: Vec3 = [0, nz / upLength, -ny / upLength];
  const halfW = screenAnchor.width / 2;
  const halfH = screenAnchor.height / 2;
  const at = (sx: number, sy: number): Vec3 => [
    position[0] + right[0] * halfW * sx + up[0] * halfH * sy,
    position[1] + right[1] * halfW * sx + up[1] * halfH * sy,
    position[2] + right[2] * halfW * sx + up[2] * halfH * sy,
  ];
  return [at(-1, 1), at(1, 1), at(1, -1), at(-1, -1)];
}

/** Share of the canvas height the glass may fill at the end of the zoom. */
const ZOOM_HEIGHT_FRACTION = 0.85;

/**
 * Camera pose that ends the scroll zoom: head-on to the glass, the terminal covering at least
 * `minWidthFraction` of the canvas width (S10).
 */
export function monitorZoomPose(aspect: number, fov: number, minWidthFraction: number): CameraPose {
  return zoomEndPose({
    center: monitorMount().position,
    normal: screenAnchor.normal as unknown as Vec3,
    glassWidth: screenAnchor.width,
    glassHeight: screenAnchor.height,
    fov,
    aspect,
    minWidthFraction,
    heightFraction: ZOOM_HEIGHT_FRACTION,
  });
}
