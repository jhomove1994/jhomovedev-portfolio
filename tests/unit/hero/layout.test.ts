import { describe, expect, it } from 'vitest';
import { projectPoint } from '../../../src/lib/hero/camera';
import screenAnchor from '../../../src/lib/hero/screen-anchor.json';
import { HERO_MODEL_IDS } from '../../../src/lib/hero/screen-anchor';
import {
  DESK_FOOTPRINT,
  DESK_TOP_Y,
  DESK_PLACEMENT,
  FLOOR_PLACEMENTS,
  PROP_PLACEMENTS,
  DESKTOP_ASPECT,
  HERO_TEXT_RESERVE,
  restCameraFor,
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

describe('restCameraFor', () => {
  const allBounds = (): Bounds[] =>
    [DESK_PLACEMENT, ...PROP_PLACEMENTS, ...FLOOR_PLACEMENTS].map(worldBounds);
  const extentsOfSetup = (aspect: number) => {
    const pose = restCameraFor(aspect);
    const points = allBounds().flatMap(({ min, max }) =>
      [min[0], max[0]].flatMap((x) =>
        [min[1], max[1]].flatMap((y) =>
          [min[2], max[2]].map((z) => projectPoint(pose, aspect, [x, y, z])),
        ),
      ),
    );
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  };

  it('keeps a low-distortion lens', () => {
    expect(restCameraFor(DESKTOP_ASPECT).fov).toBe(32);
  });

  it.each([DESKTOP_ASPECT, 4 / 3, 1])(
    'shows the whole setup at aspect %s: monitor, keyboard, mouse, books, lamp, radio and plant',
    (aspect) => {
      const e = extentsOfSetup(aspect);
      expect(e.minX).toBeGreaterThanOrEqual(-1);
      expect(e.maxX).toBeLessThanOrEqual(1);
      expect(e.minY).toBeGreaterThanOrEqual(-1);
      expect(e.maxY).toBeLessThanOrEqual(1);
    },
  );

  it('keeps the left of the desktop stage free for the hero text', () => {
    const e = extentsOfSetup(DESKTOP_ASPECT);
    const leftEdge = (e.minX + 1) / 2; // 0 = left edge of the stage
    expect(leftEdge).toBeGreaterThanOrEqual(HERO_TEXT_RESERVE - 0.01);
  });

  it('centres the setup when the copy is stacked above the stage instead', () => {
    const e = extentsOfSetup(4 / 3);
    expect((e.minX + e.maxX) / 2).toBeCloseTo(0, 1);
  });

  it('makes the monitor large enough for terminal text to read at 1440 (>= 20% of the stage, about 270 px)', () => {
    const pose = restCameraFor(DESKTOP_ASPECT);
    const screen = PROP_PLACEMENTS.find((p) => p.id === 'computerScreen')!;
    const [cx, cy, cz] = screenWorldCenter();
    const half = screenAnchor.width / 2;
    const left = projectPoint(pose, DESKTOP_ASPECT, [cx - half, cy, cz]);
    const right = projectPoint(pose, DESKTOP_ASPECT, [cx + half, cy, cz]);
    expect(screen.id).toBe('computerScreen');
    expect((right.x - left.x) / 2).toBeGreaterThanOrEqual(0.2);
  });

  it('stands the plant on the floor right of the desk, so the left reads as open wall', () => {
    const plant = worldBounds(FLOOR_PLACEMENTS.find((p) => p.id === 'pottedPlant')!);
    expect(plant.min[0]).toBeGreaterThanOrEqual(DESK_FOOTPRINT.max[0] - EPS);
  });
});
