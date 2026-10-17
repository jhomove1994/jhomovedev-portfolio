import { describe, expect, it } from 'vitest';
import { screenWorldCenter } from '../../../src/lib/hero/layout';
import {
  HTML_PX_TO_UNIT,
  SCREEN_LIFT,
  TERMINAL_CSS_WIDTH,
  TERMINAL_ON_SCREEN,
  ZOOM_FRACTION,
  monitorMount,
  monitorZoomPose,
  screenCorners,
} from '../../../src/lib/hero/monitor';
import screenAnchor from '../../../src/lib/hero/screen-anchor.json';

const dot = (a: readonly number[], b: readonly number[]) =>
  a.reduce((sum, v, i) => sum + v * b[i]!, 0);

describe('monitorMount', () => {
  it('sits just in front of the glass along the screen normal', () => {
    const mount = monitorMount();
    const center = screenWorldCenter();
    const lift = dot(
      mount.position.map((v, i) => v - center[i]!),
      screenAnchor.normal,
    );
    expect(lift).toBeCloseTo(SCREEN_LIFT, 7);
    // No sideways drift: the offset from the glass centre is parallel to the normal.
    const offset = mount.position.map((v, i) => v - center[i]!);
    expect(offset[0]).toBeCloseTo(screenAnchor.normal[0] * SCREEN_LIFT, 9);
    expect(offset[1]).toBeCloseTo(screenAnchor.normal[1] * SCREEN_LIFT, 9);
    expect(offset[2]).toBeCloseTo(screenAnchor.normal[2] * SCREEN_LIFT, 9);
  });

  it('honours a custom lift', () => {
    const lifted = monitorMount({ lift: 0.01 });
    const center = screenWorldCenter();
    expect(lifted.position[2] - center[2]).toBeCloseTo(screenAnchor.normal[2] * 0.01, 9);
  });

  it('tilts with the glass', () => {
    expect(monitorMount().rotation).toEqual(screenAnchor.rotation);
  });

  it('uses a CSS box with the screen aspect so the terminal fills the glass', () => {
    const mount = monitorMount();
    expect(mount.cssWidth).toBe(TERMINAL_CSS_WIDTH);
    expect(mount.cssHeight).toBe(Math.round(TERMINAL_CSS_WIDTH / screenAnchor.aspect));
    expect(mount.cssWidth / mount.cssHeight).toBeCloseTo(screenAnchor.aspect, 2);
  });

  it('scales the box to the glass width: world width = css width * px-to-unit * scale', () => {
    const mount = monitorMount();
    expect(mount.cssWidth * HTML_PX_TO_UNIT * mount.scale).toBeCloseTo(screenAnchor.width, 9);
    expect(mount.cssHeight * HTML_PX_TO_UNIT * mount.scale).toBeCloseTo(screenAnchor.height, 2);
  });

  it('adapts the scale to another CSS width or px-to-unit ratio', () => {
    const wide = monitorMount({ cssWidth: 880 });
    expect(wide.scale).toBeCloseTo(monitorMount().scale / 2, 9);
    expect(wide.cssHeight).toBe(Math.round(880 / screenAnchor.aspect));
    const finer = monitorMount({ pxToUnit: HTML_PX_TO_UNIT * 2 });
    expect(finer.scale).toBeCloseTo(monitorMount().scale / 2, 9);
    expect(finer.cssWidth * finer.scale * HTML_PX_TO_UNIT * 2).toBeCloseTo(screenAnchor.width, 9);
  });
});

describe('terminal on screen mode', () => {
  it('is one of the two supported renderers', () => {
    expect(['html', 'overlay']).toContain(TERMINAL_ON_SCREEN);
  });
});

describe('screenCorners', () => {
  const corners = screenCorners();
  const sub = (a: readonly number[], b: readonly number[]) => a.map((v, i) => v - b[i]!);
  const length = (v: readonly number[]) => Math.hypot(...v);

  it('returns top-left, top-right, bottom-right, bottom-left', () => {
    const [tl, tr, br, bl] = corners;
    expect(tr[0]).toBeGreaterThan(tl[0]);
    expect(br[0]).toBeGreaterThan(bl[0]);
    expect(tl[1]).toBeGreaterThan(bl[1]);
    expect(tr[1]).toBeGreaterThan(br[1]);
  });

  it('spans the glass: its width and height, centred on the anchor', () => {
    const [tl, tr, br, bl] = corners;
    expect(length(sub(tr, tl))).toBeCloseTo(screenAnchor.width, 9);
    expect(length(sub(tl, bl))).toBeCloseTo(screenAnchor.height, 9);
    const centre = [0, 1, 2].map((i) => (tl[i]! + tr[i]! + br[i]! + bl[i]!) / 4);
    const expected = screenWorldCenter();
    centre.forEach((v, i) =>
      expect(v).toBeCloseTo(expected[i]! + screenAnchor.normal[i]! * SCREEN_LIFT, 7),
    );
  });

  it('lies in the tilted glass plane: the top edge leans back with the normal', () => {
    const [tl, , , bl] = corners;
    const up = sub(tl, bl);
    expect(up[0]).toBeCloseTo(0, 9);
    const dotNormal = up.reduce((sum, v, i) => sum + v * screenAnchor.normal[i]!, 0);
    expect(dotNormal).toBeCloseTo(0, 6); // the edge is perpendicular to the normal
    expect(up[2]).toBeLessThan(0); // the top is further from the viewer than the bottom
  });
});

describe('monitorZoomPose', () => {
  const tan = Math.tan((32 * Math.PI) / 360);
  const frame = (aspect: number) => {
    const pose = monitorZoomPose(aspect, 32);
    const { position } = monitorMount();
    const toCamera = pose.position.map((v, i) => v - position[i]!);
    const distance = Math.hypot(...toCamera);
    const glassWidth = screenAnchor.width / (2 * distance * tan * aspect);
    const glassHeight = screenAnchor.height / (2 * distance * tan);
    return { toCamera, distance, glassWidth, glassHeight };
  };

  it('ends facing the glass head-on', () => {
    for (const aspect of [1.6, 2.2]) {
      const { toCamera, distance } = frame(aspect);
      toCamera.forEach((v, i) => expect(v / distance).toBeCloseTo(screenAnchor.normal[i]!, 4));
    }
  });

  it('keeps the whole bezel and some desk in view on every side', () => {
    for (const aspect of [1.6, 2, 2.2, 2.6]) {
      const { glassWidth, glassHeight } = frame(aspect);
      // The bezel is wider than the glass by BEZEL_MARGIN on each side; the glass itself stays
      // well inside the view so the bezel and the desk around it show.
      expect(glassHeight).toBeLessThanOrEqual(ZOOM_FRACTION - 1e-9);
      expect(glassWidth).toBeLessThanOrEqual(ZOOM_FRACTION - 1e-9);
    }
  });

  it('keeps the terminal readable: the glass is at least a third of the canvas width', () => {
    for (const aspect of [1.6, 2, 2.2, 2.6]) {
      expect(frame(aspect).glassWidth).toBeGreaterThanOrEqual(1 / 3);
    }
  });
});
