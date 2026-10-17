/**
 * Screen anchor maths for the hero monitor (design AD7/AD11), pure and build-time.
 * The Kenney `computerScreen` mesh keeps every vertex in each primitive, so the screen
 * face cannot be read from a bounding box: the pipeline reads the 2-triangle `metal`
 * primitive (6 indices) and this module turns its vertex positions into a rect + normal.
 */

export type Vec3 = readonly [number, number, number];

/** The 8 Kenney models merged into hero-desk.glb; each becomes a root node of this name. */
export const HERO_MODEL_IDS = [
  'desk',
  'computerScreen',
  'computerKeyboard',
  'computerMouse',
  'lampRoundTable',
  'books',
  'radio',
  'pottedPlant',
] as const;

export type HeroModelId = (typeof HERO_MODEL_IDS)[number];

export interface ScreenAnchor {
  /** Quad centre in the `computerScreen` node's local space (metres). */
  center: [number, number, number];
  width: number;
  height: number;
  aspect: number;
  /** Unit normal of the face, from the triangle winding. */
  normal: [number, number, number];
  /** Euler angles, order YXZ, that lay a +Z-facing plane onto the quad. */
  rotation: [number, number, number];
}

const QUAD_INDEX_COUNT = 6;
const WORLD_UP: Vec3 = [0, 1, 0];

/** The screen face is the only primitive of the model with exactly two triangles. */
export const isScreenQuad = (indexCount: number): boolean => indexCount === QUAD_INDEX_COUNT;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (v: Vec3): Vec3 => {
  const length = Math.hypot(...v);
  return [v[0] / length, v[1] / length, v[2] / length];
};
// `+ 0` turns -0 into 0 so serialized JSON never contains "-0".
const clean = (v: Vec3): [number, number, number] => [v[0] + 0, v[1] + 0, v[2] + 0];

function extentAlong(points: readonly Vec3[], axis: Vec3): number {
  const projected = points.map((p) => dot(p, axis));
  return Math.max(...projected) - Math.min(...projected);
}

/**
 * @param trianglePositions the vertex position of each of the 6 quad indices, in order.
 */
export function computeScreenAnchor(trianglePositions: readonly Vec3[]): ScreenAnchor {
  if (trianglePositions.length !== QUAD_INDEX_COUNT) {
    throw new Error(
      `screen face must be a 2-triangle quad (6 indices), got ${trianglePositions.length}`,
    );
  }
  const unique = new Map<string, Vec3>();
  for (const p of trianglePositions) unique.set(p.join(','), p);
  const points = [...unique.values()];
  if (points.length !== 4) {
    throw new Error(`screen quad must have 4 unique vertices, got ${points.length}`);
  }

  const [a, b, c] = trianglePositions as readonly [Vec3, Vec3, Vec3, ...Vec3[]];
  const normal = normalize(cross(sub(b, a), sub(c, a)));

  const sideways = cross(WORLD_UP, normal);
  const right = Math.hypot(...sideways) < 1e-9 ? ([1, 0, 0] as Vec3) : normalize(sideways);
  const up = cross(normal, right);
  const width = extentAlong(points, right);
  const height = extentAlong(points, up);

  const center = points
    .reduce<Vec3>((sum, p) => [sum[0] + p[0], sum[1] + p[1], sum[2] + p[2]], [0, 0, 0])
    .map((v) => v / points.length) as unknown as Vec3;

  return {
    center: clean(center),
    width,
    height,
    aspect: width / height,
    normal: clean(normal),
    rotation: clean([-Math.asin(normal[1]), Math.atan2(normal[0], normal[2]), 0]),
  };
}
