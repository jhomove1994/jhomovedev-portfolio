import { describe, expect, it } from 'vitest';
import { projectPoint } from '../../../src/lib/hero/camera';
import {
  DESKTOP_ASPECT,
  HERO_TEXT_RESERVE,
  PROP_PLACEMENTS,
  restCameraFor,
  stillCameraFor,
  worldBounds,
  type Bounds,
  type CameraPose,
} from '../../../src/lib/hero/layout';
import { screenCorners } from '../../../src/lib/hero/monitor';

const corners = ({ min, max }: Bounds): [number, number, number][] =>
  [min[0], max[0]].flatMap((x) =>
    [min[1], max[1]].flatMap((y) =>
      [min[2], max[2]].map((z): [number, number, number] => [x, y, z]),
    ),
  );

/** The glass as fractions of the stage (origin top-left), measured through the pinhole model. */
function glassFractions(pose: CameraPose, aspect: number) {
  const points = screenCorners().map((p) => projectPoint(pose, aspect, p));
  const xs = points.map((p) => (p.x + 1) / 2);
  const ys = points.map((p) => (1 - p.y) / 2);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
    topEdge: Math.abs(points[1]!.x - points[0]!.x),
    bottomEdge: Math.abs(points[2]!.x - points[3]!.x),
  };
}

const prop = (id: string) => PROP_PLACEMENTS.find((p) => p.id === id)!;

describe('stillCameraFor', () => {
  const pose = stillCameraFor(DESKTOP_ASPECT);

  it('makes the monitor glass a large part of the stage (at least 45% of its width)', () => {
    const g = glassFractions(pose, DESKTOP_ASPECT);
    expect(g.right - g.left).toBeGreaterThanOrEqual(0.45);
    expect(g.right - g.left).toBeLessThanOrEqual(0.6);
  });

  it('is much closer to the monitor than the rest pose, so the glass is bigger than the rest one', () => {
    const rest = restCameraFor(DESKTOP_ASPECT);
    const still = glassFractions(pose, DESKTOP_ASPECT);
    const far = glassFractions(rest, DESKTOP_ASPECT);
    expect(still.right - still.left).toBeGreaterThan(1.5 * (far.right - far.left));
  });

  it('keeps the glass right of the hero copy and inside the frame', () => {
    const g = glassFractions(pose, DESKTOP_ASPECT);
    expect(g.left).toBeGreaterThanOrEqual(HERO_TEXT_RESERVE - 0.03);
    expect(g.right).toBeLessThanOrEqual(0.97);
    expect(g.top).toBeGreaterThanOrEqual(0.03);
    expect(g.bottom).toBeLessThanOrEqual(0.8);
  });

  it('looks at the glass nearly head-on: top and bottom edges differ by under 3%', () => {
    const g = glassFractions(pose, DESKTOP_ASPECT);
    expect(Math.abs(g.topEdge - g.bottomEdge) / g.topEdge).toBeLessThan(0.03);
  });

  it.each(['computerScreen', 'computerKeyboard', 'computerMouse'])(
    'keeps the %s in view around the monitor',
    (id) => {
      const placement = prop(id);
      for (const point of corners(worldBounds(placement))) {
        const { x, y } = projectPoint(pose, DESKTOP_ASPECT, point);
        expect(Math.abs(x)).toBeLessThanOrEqual(1);
        expect(Math.abs(y)).toBeLessThanOrEqual(1);
      }
    },
  );

  it('keeps the lamp in the frame, at least its inner edge, so the desk still reads as a desk', () => {
    const bounds = worldBounds(prop('lampRoundTable'));
    const inner = projectPoint(pose, DESKTOP_ASPECT, [bounds.max[0], bounds.max[1], bounds.max[2]]);
    expect(inner.x).toBeGreaterThan(-0.8);
    expect(inner.x).toBeLessThan(0);
  });

  it('re-frames for another aspect (the glass stays large and inside)', () => {
    const wide = stillCameraFor(2);
    const g = glassFractions(wide, 2);
    expect(g.right - g.left).toBeGreaterThanOrEqual(0.3);
    expect(g.left).toBeGreaterThan(0);
    expect(g.right).toBeLessThan(1);
  });
});
