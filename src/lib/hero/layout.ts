/**
 * Where each hero model stands (design AD9). Pure tuples in metres, Y up, no three import.
 *
 * Every Kenney model has its origin on its bottom face and extends toward -Z from it
 * (front faces +Z), so a prop sits on the desk when its origin y equals the desk-top height.
 * The boxes below are the raw model bounds measured by `scripts/models/build-hero.ts`'s
 * source files; the layout test keeps placements, footprint and collisions honest.
 */
import { frameSubject } from './camera';
import screenAnchor from './screen-anchor.json';
import type { HeroModelId, Vec3 } from './screen-anchor';

export interface Bounds {
  min: Vec3;
  max: Vec3;
}

export interface Placement {
  id: HeroModelId;
  /** Model origin in world space. */
  position: Vec3;
  /** Rotation about Y, radians. */
  rotationY: number;
}

/** Local axis-aligned bounds of each model, metres (rounded outward to 0.1 mm). */
export const MODEL_BOUNDS: Record<HeroModelId, Bounds> = {
  desk: { min: [-0.01, 0, -0.38], max: [0.7245, 0.3844, 0.0123] },
  computerScreen: { min: [0, 0, -0.104], max: [0.3927, 0.2943, 0] },
  computerKeyboard: { min: [0, 0, -0.1182], max: [0.2822, 0.0276, 0] },
  computerMouse: { min: [-0.0248, 0, -0.0851], max: [0.0248, 0.0236, 0] },
  lampRoundTable: { min: [-0.016, 0, -0.1478], max: [0.136, 0.3142, 0.0278] },
  books: { min: [0, 0, -0.0945], max: [0.1504, 0.1039, 0] },
  radio: { min: [0, 0, -0.0975], max: [0.315, 0.2282, 0] },
  pottedPlant: { min: [-0.106, 0, -0.1207], max: [0.106, 0.654, 0.1207] },
};

const at = (id: HeroModelId, x: number, y: number, z: number, rotationY = 0): Placement => ({
  id,
  position: [x, y, z],
  rotationY,
});

export const DESK_PLACEMENT: Placement = at('desk', 0, 0, 0);
export const DESK_FOOTPRINT: Bounds = MODEL_BOUNDS.desk;
/** Height of the desk surface: the y every desk prop stands on. */
export const DESK_TOP_Y = DESK_FOOTPRINT.max[1];

/**
 * Left to right on a 0.73 m desk: lamp (back) + books (front), monitor with keyboard and mouse
 * in front of it, radio turned 90 degrees to face the monitor. The lamp is the warm key light.
 */
export const PROP_PLACEMENTS: readonly Placement[] = [
  at('computerScreen', 0.175, DESK_TOP_Y, -0.2),
  at('computerKeyboard', 0.2, DESK_TOP_Y, -0.02),
  at('computerMouse', 0.51, DESK_TOP_Y, -0.04),
  at('lampRoundTable', 0.01, DESK_TOP_Y, -0.2),
  at('books', 0, DESK_TOP_Y, 0),
  at('radio', 0.62, DESK_TOP_Y, -0.35, -Math.PI / 2),
];

/**
 * The plant is 0.65 m tall with a 0.24 m footprint: it stands on the floor right of the desk. That
 * closes the composition on the right edge and leaves the left of the frame to the hero text.
 */
export const FLOOR_PLACEMENTS: readonly Placement[] = [at('pottedPlant', 0.86, 0, -0.2)];

/** World-space bounds of a placed model (rotation about Y applied to the local box). */
export function worldBounds({ id, position, rotationY }: Placement): Bounds {
  const { min, max } = MODEL_BOUNDS[id];
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const xs: number[] = [];
  const zs: number[] = [];
  for (const x of [min[0], max[0]]) {
    for (const z of [min[2], max[2]]) {
      xs.push(position[0] + x * cos + z * sin);
      zs.push(position[2] - x * sin + z * cos);
    }
  }
  return {
    min: [Math.min(...xs), position[1] + min[1], Math.min(...zs)],
    max: [Math.max(...xs), position[1] + max[1], Math.max(...zs)],
  };
}

/** Centre of the monitor face in world space (the screen anchor lives in `computerScreen` space). */
export function screenWorldCenter(): Vec3 {
  const screen = PROP_PLACEMENTS.find((p) => p.id === 'computerScreen')!;
  const [cx, cy, cz] = screenAnchor.center;
  return [screen.position[0] + cx, screen.position[1] + cy, screen.position[2] + cz];
}

/** Bulb centre inside the lamp model (the shade glows from here): lamp-local offset, metres. */
const LAMP_BULB_LOCAL: Vec3 = [0.06, 0.24, -0.06];

/** World position of the lamp's warm point light. */
export function lampBulbWorld(): Vec3 {
  const lamp = PROP_PLACEMENTS.find((p) => p.id === 'lampRoundTable')!;
  return [
    lamp.position[0] + LAMP_BULB_LOCAL[0],
    lamp.position[1] + LAMP_BULB_LOCAL[1],
    lamp.position[2] + LAMP_BULB_LOCAL[2],
  ];
}

export interface CameraPose {
  position: Vec3;
  target: Vec3;
  fov: number;
}

/** The 16:10 stage used from 1024px; narrower screens stack the copy above a 4:3 stage. */
export const DESKTOP_ASPECT = 1.6;
/** From this aspect the hero copy overlays the left of the stage; below it the copy is above. */
const COPY_OVERLAY_MIN_ASPECT = 1.5;
/** Share of the stage width the overlaid copy owns (it spans 3% to 33% of the stage). */
export const HERO_TEXT_RESERVE = 0.36;
const REST_FOV = 32;
const REST_MARGIN = 0.03;
const REST_ELEVATION = 0.25;

/** Box around everything that stands in the scene: desk, props and the floor plant. */
export function sceneSubject(): Bounds {
  const boxes = [DESK_PLACEMENT, ...PROP_PLACEMENTS, ...FLOOR_PLACEMENTS].map(worldBounds);
  return {
    min: [0, 1, 2].map((i) => Math.min(...boxes.map((b) => b.min[i]!))) as unknown as Vec3,
    max: [0, 1, 2].map((i) => Math.max(...boxes.map((b) => b.max[i]!))) as unknown as Vec3,
  };
}

/**
 * Rest pose for a stage of the given aspect: the whole setup in view, a little above it. On the
 * desktop stage the setup sits right of the hero copy; on the stacked mobile stage it is centred.
 * The scroll zoom (later change) interpolates away from this.
 */
export function restCameraFor(aspect: number): CameraPose {
  return frameSubject({
    subject: sceneSubject(),
    aspect,
    fov: REST_FOV,
    reserveLeft: aspect >= COPY_OVERLAY_MIN_ASPECT ? HERO_TEXT_RESERVE : 0,
    margin: REST_MARGIN,
    elevation: REST_ELEVATION,
  });
}
