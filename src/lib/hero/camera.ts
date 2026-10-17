/**
 * Camera framing maths (pure, no three import): a pinhole projection and a solver that finds
 * the pose from which a subject box fits a usable part of the view. The hero uses it to keep the
 * whole desk setup on the right of the stage and the left free for the text.
 */
import type { Bounds, CameraPose } from './layout';
import type { Vec3 } from './screen-anchor';

/** Normalised device coordinates: x -1 (left) .. 1 (right), y -1 (bottom) .. 1 (top). */
export interface Ndc {
  x: number;
  y: number;
}

const WORLD_UP: Vec3 = [0, 1, 0];

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (a: Vec3): Vec3 => {
  const length = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / length, a[1] / length, a[2] / length];
};

const halfFovTan = (fovDeg: number) => Math.tan((fovDeg * Math.PI) / 360);

/** Where a world point lands in the view of `pose` (vertical field of view, given aspect). */
export function projectPoint(pose: CameraPose, aspect: number, point: Vec3): Ndc {
  const forward = normalize(sub(pose.target, pose.position));
  const right = normalize(cross(forward, WORLD_UP));
  const up = cross(right, forward);
  const offset = sub(point, pose.position);
  const depth = dot(offset, forward);
  const tan = halfFovTan(pose.fov);
  return {
    x: dot(offset, right) / (depth * tan * aspect),
    y: dot(offset, up) / (depth * tan),
  };
}

export interface FrameRequest {
  subject: Bounds;
  /** Width over height of the view. */
  aspect: number;
  /** Vertical field of view, degrees. */
  fov: number;
  /** Fraction of the view width kept clear on the left (the hero text). */
  reserveLeft: number;
  /** Fraction of the width (right) and height (top and bottom) left empty around the subject. */
  margin: number;
  /** Camera height above its aim point, metres. */
  elevation: number;
}

const MIN_DISTANCE = 0.2;
const MAX_DISTANCE = 20;
const FIT_STEPS = 40;
const PASSES = 3;
/** Fit slightly inside the region: re-centring a perspective view nudges the extents. */
const FIT_SLACK = 0.99;

function corners({ min, max }: Bounds): Vec3[] {
  const points: Vec3[] = [];
  for (const x of [min[0], max[0]]) {
    for (const y of [min[1], max[1]]) {
      for (const z of [min[2], max[2]]) points.push([x, y, z]);
    }
  }
  return points;
}

function extentsOf(pose: CameraPose, aspect: number, box: Bounds) {
  const projected = corners(box).map((p) => projectPoint(pose, aspect, p));
  const xs = projected.map((p) => p.x);
  const ys = projected.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/**
 * The pose that fits `subject` into the region left of the margins and right of the reserved
 * strip, as close as that allows. The camera looks slightly down from straight in front: it
 * never yaws, so the desk stays square to the view.
 */
export function frameSubject(request: FrameRequest): CameraPose {
  const { subject, aspect, fov, reserveLeft, margin, elevation } = request;
  const region = {
    minX: 2 * reserveLeft - 1,
    maxX: 1 - 2 * margin,
    minY: -1 + 2 * margin,
    maxY: 1 - 2 * margin,
  };
  const regionWidth = (region.maxX - region.minX) * FIT_SLACK;
  const regionHeight = (region.maxY - region.minY) * FIT_SLACK;
  const regionCentre = { x: (region.minX + region.maxX) / 2, y: (region.minY + region.maxY) / 2 };

  let aim: Vec3 = [
    (subject.min[0] + subject.max[0]) / 2,
    (subject.min[1] + subject.max[1]) / 2,
    (subject.min[2] + subject.max[2]) / 2,
  ];
  const poseAt = (distance: number): CameraPose => ({
    position: [aim[0], aim[1] + elevation, aim[2] + distance],
    target: aim,
    fov,
  });

  let distance = MIN_DISTANCE;
  for (let pass = 0; pass < PASSES; pass += 1) {
    // Smallest distance at which the subject fits: extents only shrink as the camera backs off.
    let near = MIN_DISTANCE;
    let far = MAX_DISTANCE;
    for (let step = 0; step < FIT_STEPS; step += 1) {
      const mid = (near + far) / 2;
      const e = extentsOf(poseAt(mid), aspect, subject);
      if (e.maxX - e.minX <= regionWidth && e.maxY - e.minY <= regionHeight) far = mid;
      else near = mid;
    }
    distance = far;

    // Slide the whole rig sideways and up/down so the subject sits at the region's centre.
    const e = extentsOf(poseAt(distance), aspect, subject);
    const tan = halfFovTan(fov);
    const dx = (regionCentre.x - (e.minX + e.maxX) / 2) * distance * tan * aspect;
    const dy = (regionCentre.y - (e.minY + e.maxY) / 2) * distance * tan;
    aim = [aim[0] - dx, aim[1] - dy, aim[2]];
  }
  return poseAt(distance);
}
