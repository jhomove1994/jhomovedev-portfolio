import { describe, expect, it } from 'vitest';
import { HERO_MODE_STORAGE_KEY } from '../../../src/lib/capabilities';
import type { CanvasLike, EnvDeps, StorageLike } from '../../../src/lib/capabilities-env';
import {
  createModeController,
  type ModeControllerDeps,
} from '../../../src/lib/hero/mode-controller';

const REDUCED = '(prefers-reduced-motion: reduce)';
const NARROW = '(max-width: 1023px)';

function canvas(contexts: { strict: boolean; loose: boolean }): CanvasLike {
  const gl = { getExtension: () => null };
  return {
    getContext: (_id, attrs) =>
      (attrs?.failIfMajorPerformanceCaveat ? contexts.strict : contexts.loose) ? gl : null,
  };
}

function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k]! : null),
    setItem: (k, v) => void (data[k] = v),
  };
}

interface Harness {
  deps: ModeControllerDeps;
  media: Set<string>;
  storage: ReturnType<typeof memoryStorage>;
  fireReducedMotion(): void;
  watchers(): number;
}

function harness(
  options: {
    search?: string;
    stored?: Record<string, string>;
    media?: string[];
    gl?: { strict: boolean; loose: boolean };
  } = {},
): Harness {
  const media = new Set(options.media ?? []);
  const storage = memoryStorage(options.stored);
  const listeners = new Set<() => void>();
  const env: EnvDeps = {
    matchMedia: (query) => ({ matches: media.has(query) }),
    navigator: { hardwareConcurrency: 8, deviceMemory: 8 },
    createCanvas: () => canvas(options.gl ?? { strict: true, loose: true }),
  };
  return {
    media,
    storage,
    deps: {
      env,
      storage,
      search: options.search ?? '',
      watchReducedMotion: (listener) => {
        listeners.add(listener);
        return () => void listeners.delete(listener);
      },
    },
    fireReducedMotion: () => listeners.forEach((listener) => listener()),
    watchers: () => listeners.size,
  };
}

describe('createModeController: initial decision', () => {
  it('chooses 3D on a capable desktop and offers the static toggle', () => {
    const { state } = snapshotOf(harness());
    expect(state.decision).toEqual({
      mode: '3d',
      reason: 'default',
      motion: 'full',
      toggle: { available: true, target: 'static' },
    });
  });

  it('stays static behind a software renderer and offers the 3D toggle', () => {
    const { state } = snapshotOf(harness({ gl: { strict: false, loose: true } }));
    expect(state.decision).toEqual({
      mode: 'static',
      reason: 'software-renderer',
      motion: 'full',
      toggle: { available: true, target: '3d' },
    });
  });

  it('stays static on a narrow viewport with the toggle targeting 3D', () => {
    const { state } = snapshotOf(harness({ media: [NARROW] }));
    expect(state.decision).toMatchObject({ mode: 'static', reason: 'mobile' });
    expect(state.decision.toggle).toEqual({ available: true, target: '3d' });
  });

  it('reports no WebGL2 without a toggle', () => {
    const { state } = snapshotOf(harness({ gl: { strict: false, loose: false } }));
    expect(state.decision).toMatchObject({ mode: 'static', reason: 'no-webgl2' });
    expect(state.decision.toggle.available).toBe(false);
  });
});

describe('createModeController: overrides', () => {
  it('persists a valid ?3d=1 query and forces 3D past the software renderer', () => {
    const h = harness({ search: '?3d=1', gl: { strict: false, loose: true } });
    const { state } = snapshotOf(h);
    expect(state.override).toBe('on');
    expect(state.decision).toMatchObject({ mode: '3d', reason: 'override-on' });
    expect(h.storage.data[HERO_MODE_STORAGE_KEY]).toBe('1');
  });

  it('keeps a ?3d=0 choice for the next plain visit', () => {
    const first = harness({ search: '?3d=0' });
    snapshotOf(first);
    expect(first.storage.data[HERO_MODE_STORAGE_KEY]).toBe('0');

    const next = harness({ search: '', stored: first.storage.data });
    const { state } = snapshotOf(next);
    expect(state.decision).toMatchObject({ mode: 'static', reason: 'override-off' });
  });

  it('ignores an invalid query value and writes nothing', () => {
    const h = harness({ search: '?3d=maybe' });
    const { state } = snapshotOf(h);
    expect(state.override).toBeNull();
    expect(h.storage.data).toEqual({});
  });

  it('keeps an explicit on override under reduced motion, with reduced motion reported', () => {
    const { state } = snapshotOf(harness({ search: '?3d=1', media: [REDUCED] }));
    expect(state.decision).toMatchObject({ mode: '3d', reason: 'override-on', motion: 'reduced' });
    expect(state.decision.toggle.available).toBe(true);
  });

  it('keeps ?3d=0 working under reduced motion', () => {
    const { state } = snapshotOf(harness({ search: '?3d=0', media: [REDUCED] }));
    expect(state.decision).toMatchObject({ mode: 'static', reason: 'override-off' });
  });

  it('survives storage that throws', () => {
    const h = harness({ search: '?3d=1' });
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const { state } = snapshotOf({ ...h, deps: { ...h.deps, storage: throwing } });
    expect(state.decision.mode).toBe('3d');
  });
});

describe('createModeController: toggle and live updates', () => {
  it('setOverride persists, re-decides and notifies once', () => {
    const h = harness();
    const controller = createModeController(h.deps);
    let calls = 0;
    controller.subscribe(() => void (calls += 1));
    controller.setOverride('off');
    expect(h.storage.data[HERO_MODE_STORAGE_KEY]).toBe('0');
    expect(controller.getSnapshot().decision).toMatchObject({
      mode: 'static',
      reason: 'override-off',
    });
    expect(calls).toBe(1);

    controller.setOverride('on');
    expect(h.storage.data[HERO_MODE_STORAGE_KEY]).toBe('1');
    expect(controller.getSnapshot().decision.mode).toBe('3d');
    expect(calls).toBe(2);
  });

  it('returns the same snapshot reference while nothing changed', () => {
    const controller = createModeController(harness().deps);
    expect(controller.getSnapshot()).toBe(controller.getSnapshot());
    const before = controller.getSnapshot();
    controller.setOverride('off');
    expect(controller.getSnapshot()).not.toBe(before);
  });

  it('re-decides the motion when reduced motion turns on, and back when it turns off', () => {
    const h = harness();
    const controller = createModeController(h.deps);
    const motions: string[] = [];
    controller.subscribe(() => motions.push(controller.getSnapshot().decision.motion));

    h.media.add(REDUCED);
    h.fireReducedMotion();
    expect(controller.getSnapshot().decision).toMatchObject({
      mode: '3d',
      reason: 'default',
      motion: 'reduced',
    });

    h.media.delete(REDUCED);
    h.fireReducedMotion();
    expect(controller.getSnapshot().decision).toMatchObject({ mode: '3d', motion: 'full' });
    expect(motions).toEqual(['reduced', 'full']);
  });

  it('does not notify when a media change leaves the decision unchanged', () => {
    const h = harness();
    const controller = createModeController(h.deps);
    let calls = 0;
    controller.subscribe(() => void (calls += 1));
    h.fireReducedMotion();
    expect(calls).toBe(0);
  });

  it('watches reduced motion only while someone is subscribed', () => {
    const h = harness();
    const controller = createModeController(h.deps);
    expect(h.watchers()).toBe(0);
    const stop = controller.subscribe(() => {});
    expect(h.watchers()).toBe(1);
    stop();
    expect(h.watchers()).toBe(0);
  });
});

function snapshotOf(h: Harness) {
  return { state: createModeController(h.deps).getSnapshot() };
}
