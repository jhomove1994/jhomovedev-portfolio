import { describe, expect, it } from 'vitest';
import { screenWorldCenter } from '../../../src/lib/hero/layout';
import {
  HTML_PX_TO_UNIT,
  SCREEN_LIFT,
  TERMINAL_CSS_WIDTH,
  TERMINAL_ON_SCREEN,
  monitorMount,
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
