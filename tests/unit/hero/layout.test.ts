import { describe, expect, it } from 'vitest';
import { HERO_MODEL_IDS } from '../../../src/lib/hero/screen-anchor';
import {
  DESK_FOOTPRINT,
  DESK_TOP_Y,
  DESK_PLACEMENT,
  FLOOR_PLACEMENTS,
  PROP_PLACEMENTS,
  REST_CAMERA,
  lampBulbWorld,
  screenWorldCenter,
  worldBounds,
  type Bounds,
  type Placement,
} from '../../../src/lib/hero/layout';

const EPS = 1e-6;
const overlaps = (a: Bounds, b: Bounds): boolean =>
  a.min[0] < b.max[0] - EPS &&
  a.max[0] > b.min[0] + EPS &&
  a.min[2] < b.max[2] - EPS &&
  a.max[2] > b.min[2] + EPS;

describe('worldBounds', () => {
  it('offsets the local box by the position when unrotated', () => {
    const placement: Placement = { id: 'books', position: [1, 2, 3], rotationY: 0 };
    const b = worldBounds(placement);
    expect(b.min[0]).toBeCloseTo(1, 6);
    expect(b.min[1]).toBeCloseTo(2, 6);
    expect(b.min[2]).toBeCloseTo(2.9055, 6);
    expect(b.max[0]).toBeCloseTo(1.1504, 6);
    expect(b.max[1]).toBeCloseTo(2.1039, 6);
    expect(b.max[2]).toBeCloseTo(3, 6);
  });

  it('swaps the footprint axes for a quarter turn (radio is 0.315 wide, 0.0975 deep)', () => {
    const b = worldBounds({ id: 'radio', position: [0, 0, 0], rotationY: -Math.PI / 2 });
    expect(b.max[0] - b.min[0]).toBeCloseTo(0.0975, 6);
    expect(b.max[2] - b.min[2]).toBeCloseTo(0.315, 6);
    expect(b.min[0]).toBeCloseTo(0, 6);
    expect(b.min[2]).toBeCloseTo(0, 6);
  });
});

describe('desk layout', () => {
  it('measures the desk top from the desk model', () => {
    expect(DESK_TOP_Y).toBeCloseTo(0.3844, 4);
    expect(DESK_FOOTPRINT.min[1]).toBe(0);
  });

  it.each(PROP_PLACEMENTS.map((p) => [p.id, p] as const))(
    '%s rests on the desk top and stays inside the desk footprint',
    (_id, placement) => {
      const b = worldBounds(placement);
      expect(b.min[1]).toBeCloseTo(DESK_TOP_Y, 6);
      expect(b.min[0]).toBeGreaterThanOrEqual(DESK_FOOTPRINT.min[0] - EPS);
      expect(b.max[0]).toBeLessThanOrEqual(DESK_FOOTPRINT.max[0] + EPS);
      expect(b.min[2]).toBeGreaterThanOrEqual(DESK_FOOTPRINT.min[2] - EPS);
      expect(b.max[2]).toBeLessThanOrEqual(DESK_FOOTPRINT.max[2] + EPS);
    },
  );

  it('keeps every desk prop clear of every other', () => {
    const boxes = PROP_PLACEMENTS.map((p) => ({ id: p.id, box: worldBounds(p) }));
    const collisions: string[] = [];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        if (overlaps(boxes[i]!.box, boxes[j]!.box))
          collisions.push(`${boxes[i]!.id}/${boxes[j]!.id}`);
      }
    }
    expect(boxes.length).toBeGreaterThanOrEqual(5);
    expect(collisions).toEqual([]);
  });

  it('places the keyboard in front of the screen (toward +Z) and the lamp behind-left of it', () => {
    const find = (id: string) => worldBounds(PROP_PLACEMENTS.find((p) => p.id === id)!);
    const screen = find('computerScreen');
    const keyboard = find('computerKeyboard');
    const lamp = find('lampRoundTable');
    expect(keyboard.min[2]).toBeGreaterThanOrEqual(screen.max[2]);
    expect(lamp.max[0]).toBeLessThanOrEqual(screen.min[0] + EPS);
    expect(lamp.min[2]).toBeLessThan(screen.max[2]);
  });

  it('accounts for every model exactly once across desk, props and floor', () => {
    const ids = [DESK_PLACEMENT, ...PROP_PLACEMENTS, ...FLOOR_PLACEMENTS].map((p) => p.id);
    expect([...ids].sort()).toEqual([...HERO_MODEL_IDS].sort());
  });
});

describe('floor props', () => {
  it.each(FLOOR_PLACEMENTS.map((p) => [p.id, p] as const))(
    '%s stands on the floor beside the desk, not on it',
    (_id, placement) => {
      const b = worldBounds(placement);
      expect(b.min[1]).toBeCloseTo(0, 6);
      const clearOfDesk =
        b.max[0] <= DESK_FOOTPRINT.min[0] + EPS || b.min[0] >= DESK_FOOTPRINT.max[0] - EPS;
      expect(clearOfDesk).toBe(true);
    },
  );
});

describe('screenWorldCenter', () => {
  it('is the anchor centre shifted by the screen placement', () => {
    const screen = PROP_PLACEMENTS.find((p) => p.id === 'computerScreen')!;
    const center = screenWorldCenter();
    expect(center[0]).toBeCloseTo(screen.position[0] + 0.19634, 5);
    expect(center[1]).toBeCloseTo(screen.position[1] + 0.17128, 5);
    expect(center[2]).toBeCloseTo(screen.position[2] - 0.05207, 5);
    expect(center[1]).toBeGreaterThan(DESK_TOP_Y);
  });
});

describe('lampBulbWorld', () => {
  it('sits inside the lamp footprint, above the desk top and below the lamp height', () => {
    const lamp = worldBounds(PROP_PLACEMENTS.find((p) => p.id === 'lampRoundTable')!);
    const bulb = lampBulbWorld();
    expect(bulb[0]).toBeGreaterThan(lamp.min[0]);
    expect(bulb[0]).toBeLessThan(lamp.max[0]);
    expect(bulb[2]).toBeGreaterThan(lamp.min[2]);
    expect(bulb[2]).toBeLessThan(lamp.max[2]);
    expect(bulb[1]).toBeGreaterThan(DESK_TOP_Y + 0.1);
    expect(bulb[1]).toBeLessThan(lamp.max[1]);
  });
});

describe('REST_CAMERA', () => {
  const center = screenWorldCenter();

  it('aims 0.22 m left of the monitor so the left of the frame stays free for the hero text', () => {
    expect(REST_CAMERA.target[0]).toBeCloseTo(center[0] - 0.22, 6);
    expect(REST_CAMERA.target[1]).toBeCloseTo(center[1], 6);
    expect(REST_CAMERA.target[2]).toBeCloseTo(center[2], 6);
  });

  it('stands about 1.1 m back and 0.22 m above the target with a low-distortion lens', () => {
    const offset = REST_CAMERA.position.map((v, i) => v - REST_CAMERA.target[i]!);
    expect(offset[0]).toBeCloseTo(0, 6);
    expect(offset[1]).toBeCloseTo(0.22, 6);
    expect(offset[2]).toBeCloseTo(1.1, 6);
    expect(REST_CAMERA.fov).toBe(32);
  });
});
