import { describe, expect, it } from 'vitest';
import { projectPoint } from '../../../src/lib/hero/camera';
import { frameCoversGlass, stillAnchorFromQuad } from '../../../src/lib/hero/capture';
import { DESKTOP_ASPECT, restCameraFor } from '../../../src/lib/hero/layout';
import { screenCorners } from '../../../src/lib/hero/monitor';
import { projectRect, type Quad } from '../../../src/lib/hero/zoom';

const STAGE = { width: 1600, height: 1000 };

describe('stillAnchorFromQuad', () => {
  it('turns an axis-aligned quad into fractions of the stage', () => {
    const quad: Quad = [
      { x: 400, y: 100 },
      { x: 1200, y: 100 },
      { x: 1200, y: 600 },
      { x: 400, y: 600 },
    ];
    expect(stillAnchorFromQuad(quad, STAGE)).toEqual({
      x: 0.25,
      y: 0.1,
      width: 0.5,
      height: 0.5,
    });
  });

  it('takes the bounding box of a perspective (non-rectangular) quad', () => {
    const quad: Quad = [
      { x: 500, y: 150 },
      { x: 1100, y: 130 },
      { x: 1150, y: 700 },
      { x: 450, y: 690 },
    ];
    expect(stillAnchorFromQuad(quad, STAGE)).toEqual({
      x: 0.281,
      y: 0.13,
      width: 0.438,
      height: 0.57,
    });
  });

  it('rounds to three decimals so the committed json stays stable', () => {
    const quad: Quad = [
      { x: 333.3333, y: 100 },
      { x: 999.9999, y: 100 },
      { x: 999.9999, y: 500 },
      { x: 333.3333, y: 500 },
    ];
    const anchor = stillAnchorFromQuad(quad, STAGE);
    expect(anchor.x).toBe(0.208);
    expect(anchor.width).toBe(0.417);
  });

  it('places the real monitor glass inside the stage at the rest pose', () => {
    const pose = restCameraFor(DESKTOP_ASPECT);
    const quad = projectRect(
      screenCorners(),
      (point) => projectPoint(pose, DESKTOP_ASPECT, point),
      STAGE,
    );
    const anchor = stillAnchorFromQuad(quad, STAGE);
    expect(anchor.x).toBeGreaterThan(0);
    expect(anchor.y).toBeGreaterThan(0);
    expect(anchor.x + anchor.width).toBeLessThan(1);
    expect(anchor.y + anchor.height).toBeLessThan(1);
    expect(anchor.width).toBeGreaterThan(0.1);
  });
});

describe('frameCoversGlass', () => {
  const glass = { x: 0.484, y: 0.204, width: 0.203, height: 0.199 };

  it('accepts a frame that contains the glass, edges included', () => {
    expect(frameCoversGlass({ x: 0.372, y: 0.13, width: 0.48, height: 0.54 }, glass)).toBe(true);
    expect(frameCoversGlass(glass, glass)).toBe(true);
  });

  it('rejects a frame that leaves any side of the glass uncovered', () => {
    expect(frameCoversGlass({ x: 0.5, y: 0.13, width: 0.48, height: 0.54 }, glass)).toBe(false);
    expect(frameCoversGlass({ x: 0.372, y: 0.25, width: 0.48, height: 0.54 }, glass)).toBe(false);
    expect(frameCoversGlass({ x: 0.372, y: 0.13, width: 0.2, height: 0.54 }, glass)).toBe(false);
    expect(frameCoversGlass({ x: 0.372, y: 0.13, width: 0.48, height: 0.2 }, glass)).toBe(false);
  });
});
