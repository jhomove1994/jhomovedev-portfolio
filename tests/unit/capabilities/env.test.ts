import { describe, expect, it } from 'vitest';
import { HERO_MODE_STORAGE_KEY } from '../../../src/lib/capabilities';
import {
  probeWebgl2,
  readEnvSnapshot,
  readStoredOverride,
  writeStoredOverride,
  type CanvasLike,
  type EnvDeps,
  type StorageLike,
} from '../../../src/lib/capabilities-env';

function fakeCanvas(contexts: { strict?: boolean; loose?: boolean }): CanvasLike & {
  calls: unknown[][];
  lost: number;
} {
  const calls: unknown[][] = [];
  const state = { lost: 0 };
  const gl = {
    getExtension: (name: string) =>
      name === 'WEBGL_lose_context' ? { loseContext: () => void (state.lost += 1) } : null,
  };
  return {
    calls,
    get lost() {
      return state.lost;
    },
    getContext(id, attrs) {
      calls.push([id, attrs]);
      const strict = attrs?.failIfMajorPerformanceCaveat === true;
      return (strict ? contexts.strict : contexts.loose) ? gl : null;
    },
  };
}

function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => void (data[k] = v),
  };
}

const throwingStorage: StorageLike = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

function deps(patch: Partial<EnvDeps> & { queries?: string[] } = {}): EnvDeps {
  const matching = new Set(patch.queries ?? []);
  return {
    matchMedia: (q) => ({ matches: matching.has(q) }),
    navigator: { hardwareConcurrency: 8, deviceMemory: 8 },
    createCanvas: () => fakeCanvas({ strict: true, loose: true }),
    ...patch,
  };
}

describe('probeWebgl2', () => {
  it('reports hardware WebGL2 when the strict context is granted, and releases it', () => {
    const canvas = fakeCanvas({ strict: true });
    expect(probeWebgl2(() => canvas)).toEqual({ webgl2: true, softwareRenderer: false });
    expect(canvas.lost).toBe(1);
    expect(canvas.calls).toEqual([['webgl2', { failIfMajorPerformanceCaveat: true }]]);
  });

  it('flags a software renderer when only the loose context is granted', () => {
    const canvas = fakeCanvas({ loose: true });
    expect(probeWebgl2(() => canvas)).toEqual({ webgl2: true, softwareRenderer: true });
    expect(canvas.calls).toHaveLength(2);
  });

  it('reports no WebGL2 when neither context is granted', () => {
    expect(probeWebgl2(() => fakeCanvas({}))).toEqual({ webgl2: false, softwareRenderer: false });
  });

  it('treats a throwing canvas as no WebGL2', () => {
    const probe = probeWebgl2(() => {
      throw new Error('no canvas');
    });
    expect(probe).toEqual({ webgl2: false, softwareRenderer: false });
  });
});

describe('readEnvSnapshot', () => {
  it('reads a capable desktop', () => {
    expect(readEnvSnapshot(deps())).toEqual({
      webgl2: true,
      softwareRenderer: false,
      reducedMotion: false,
      isMobile: false,
      smallScreen: false,
      cores: 8,
      memory: 8,
    });
  });

  it('leaves hardware signals undefined when the browser does not expose them', () => {
    const snap = readEnvSnapshot(deps({ navigator: {} }));
    expect(snap.cores).toBeUndefined();
    expect(snap.memory).toBeUndefined();
  });

  it('reads reduced motion from matchMedia', () => {
    const snap = readEnvSnapshot(deps({ queries: ['(prefers-reduced-motion: reduce)'] }));
    expect(snap.reducedMotion).toBe(true);
  });

  it('treats a narrow viewport as mobile', () => {
    expect(readEnvSnapshot(deps({ queries: ['(max-width: 1023px)'] })).isMobile).toBe(true);
  });

  it('flags a viewport under 768px as a small screen, and as mobile too', () => {
    const snap = readEnvSnapshot(deps({ queries: ['(max-width: 767px)', '(max-width: 1023px)'] }));
    expect(snap).toMatchObject({ smallScreen: true, isMobile: true });
    expect(readEnvSnapshot(deps({ queries: ['(max-width: 1023px)'] })).smallScreen).toBe(false);
  });

  it('treats a coarse primary pointer as mobile', () => {
    expect(readEnvSnapshot(deps({ queries: ['(pointer: coarse)'] })).isMobile).toBe(true);
  });

  it('reports no WebGL2 and software caveats from the probe', () => {
    expect(readEnvSnapshot(deps({ createCanvas: () => fakeCanvas({}) })).webgl2).toBe(false);
    const soft = readEnvSnapshot(deps({ createCanvas: () => fakeCanvas({ loose: true }) }));
    expect(soft).toMatchObject({ webgl2: true, softwareRenderer: true });
  });
});

describe('stored override', () => {
  it('reads the raw stored value under the documented key', () => {
    const storage = memoryStorage({ [HERO_MODE_STORAGE_KEY]: '1' });
    expect(readStoredOverride(storage)).toBe('1');
  });

  it('returns null when nothing is stored', () => {
    expect(readStoredOverride(memoryStorage())).toBeNull();
  });

  it('returns null when storage access throws', () => {
    expect(readStoredOverride(throwingStorage)).toBeNull();
  });

  it('returns null when storage is unavailable', () => {
    expect(readStoredOverride(null)).toBeNull();
  });

  it('writes 1 for on and 0 for off', () => {
    const storage = memoryStorage();
    expect(writeStoredOverride(storage, 'on')).toBe(true);
    expect(storage.data[HERO_MODE_STORAGE_KEY]).toBe('1');
    expect(writeStoredOverride(storage, 'off')).toBe(true);
    expect(storage.data[HERO_MODE_STORAGE_KEY]).toBe('0');
  });

  it('reports false instead of throwing when the write fails', () => {
    expect(writeStoredOverride(throwingStorage, 'on')).toBe(false);
    expect(writeStoredOverride(null, 'on')).toBe(false);
  });
});
