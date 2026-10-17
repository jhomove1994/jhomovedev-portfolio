import { describe, expect, it } from 'vitest';
import { frameSubject, projectPoint, type FrameRequest } from '../../../src/lib/hero/camera';
import type { CameraPose } from '../../../src/lib/hero/layout';
import type { Bounds } from '../../../src/lib/hero/layout';

const subject: Bounds = { min: [-0.2, 0, -0.5], max: [0.9, 0.7, 0.2] };
const base: FrameRequest = {
  subject,
  aspect: 1.6,
  fov: 32,
  reserveLeft: 0.36,
  margin: 0.04,
  elevation: 0.25,
};

const corners = ({ min, max }: Bounds) =>
  [min[0], max[0]].flatMap((x) =>
    [min[1], max[1]].flatMap((y) => [min[2], max[2]].map((z) => [x, y, z] as const)),
  );

const extents = (pose: CameraPose, aspect: number, box: Bounds) => {
  const points = corners(box).map((p) => projectPoint(pose, aspect, p));
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
};

describe('projectPoint', () => {
  const pose: CameraPose = { position: [0, 0, 2], target: [0, 0, 0], fov: 32 };

  it('puts the aim point at the centre of the view', () => {
    const p = projectPoint(pose, 1.6, [0, 0, 0]);
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.y).toBeCloseTo(0, 9);
  });

  it('puts the right and the top of the world on the right and top of the view', () => {
    expect(projectPoint(pose, 1.6, [0.3, 0, 0]).x).toBeGreaterThan(0);
    expect(projectPoint(pose, 1.6, [-0.3, 0, 0]).x).toBeLessThan(0);
    expect(projectPoint(pose, 1.6, [0, 0.3, 0]).y).toBeGreaterThan(0);
  });

  it('matches the pinhole formula and scales x by the aspect ratio', () => {
    const tan = Math.tan((32 * Math.PI) / 360);
    // 0.5 m to the right at 2 m: x = 0.5 / (2 * tan * aspect), y = 0.5 / (2 * tan)
    expect(projectPoint(pose, 1.6, [0.5, 0, 0]).x).toBeCloseTo(0.5 / (2 * tan * 1.6), 9);
    expect(projectPoint(pose, 1, [0, 0.5, 0]).y).toBeCloseTo(0.5 / (2 * tan), 9);
  });

  it('shrinks with distance', () => {
    const near = projectPoint(pose, 1.6, [0.4, 0, 1]).x;
    const far = projectPoint(pose, 1.6, [0.4, 0, -1]).x;
    expect(near).toBeGreaterThan(far);
  });

  it('follows a tilted camera: a point above the aim of a downward camera sits high in view', () => {
    const down: CameraPose = { position: [0, 1, 2], target: [0, 0, 0], fov: 32 };
    expect(projectPoint(down, 1.6, [0, 0.3, 0]).y).toBeGreaterThan(0);
    expect(projectPoint(down, 1.6, [0, 0, 0]).y).toBeCloseTo(0, 9);
  });
});

describe('frameSubject', () => {
  it('keeps every corner of the subject inside the usable region', () => {
    const pose = frameSubject(base);
    const e = extents(pose, base.aspect, subject);
    expect(e.minX).toBeGreaterThanOrEqual(2 * base.reserveLeft - 1 - 1e-3);
    expect(e.maxX).toBeLessThanOrEqual(1 - 2 * base.margin + 1e-3);
    expect(e.minY).toBeGreaterThanOrEqual(-1 + 2 * base.margin - 1e-3);
    expect(e.maxY).toBeLessThanOrEqual(1 - 2 * base.margin + 1e-3);
  });

  it('fills the region tightly on its limiting axis instead of sitting far away', () => {
    const e = extents(frameSubject(base), base.aspect, subject);
    const fillX = (e.maxX - e.minX) / (2 * (1 - base.reserveLeft - base.margin));
    const fillY = (e.maxY - e.minY) / (2 * (1 - 2 * base.margin));
    expect(Math.max(fillX, fillY)).toBeGreaterThan(0.97);
  });

  it('reserves the left of the view for the hero text', () => {
    const e = extents(frameSubject(base), base.aspect, subject);
    const leftEdge = (e.minX + 1) / 2; // 0 = left of the frame
    expect(leftEdge).toBeGreaterThanOrEqual(base.reserveLeft - 1e-3);
  });

  it('uses the whole width when nothing is reserved (stacked layout)', () => {
    const request: FrameRequest = { ...base, aspect: 4 / 3, reserveLeft: 0 };
    const e = extents(frameSubject(request), request.aspect, subject);
    expect(e.minX).toBeGreaterThanOrEqual(-1 + 2 * 0 - 1e-3);
    expect(e.maxX).toBeLessThanOrEqual(1 - 2 * request.margin + 1e-3);
    const centre = (e.minX + e.maxX) / 2;
    expect(centre).toBeCloseTo((-1 + 1 - 2 * request.margin) / 2, 2);
  });

  it('moves further back for a narrower view and a bigger reserve', () => {
    const distance = (request: FrameRequest) => {
      const pose = frameSubject(request);
      return Math.hypot(...pose.position.map((v, i) => v - pose.target[i]!));
    };
    expect(distance({ ...base, aspect: 1.2, reserveLeft: 0 })).toBeGreaterThan(
      distance({ ...base, aspect: 2, reserveLeft: 0 }),
    );
    expect(distance({ ...base, reserveLeft: 0.5 })).toBeGreaterThan(
      distance({ ...base, reserveLeft: 0.1 }),
    );
  });

  it('stands the requested height above the aim and keeps the lens', () => {
    const pose = frameSubject(base);
    expect(pose.position[1] - pose.target[1]).toBeCloseTo(base.elevation, 6);
    expect(pose.position[0]).toBeCloseTo(pose.target[0], 6);
    expect(pose.fov).toBe(32);
  });
});
