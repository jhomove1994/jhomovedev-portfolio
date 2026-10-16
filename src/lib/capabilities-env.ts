// Thin browser adapter for the pure decision logic in `capabilities.ts`. Every browser global
// is injected through small structural interfaces so the code runs under plain Node tests and
// never depends on lib.dom vs workerd typings (`navigator.deviceMemory` is not in either).

import {
  HERO_MODE_STORAGE_KEY,
  overrideToStored,
  type EnvSnapshot,
  type ModeOverride,
} from './capabilities';

interface WebglContextLike {
  getExtension(name: string): { loseContext?: () => void } | null;
}

export interface CanvasLike {
  getContext(
    id: 'webgl2',
    attrs?: { failIfMajorPerformanceCaveat?: boolean },
  ): WebglContextLike | null;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface NavigatorHints {
  hardwareConcurrency?: number;
  deviceMemory?: number;
}

export interface EnvDeps {
  matchMedia(query: string): { matches: boolean };
  navigator: NavigatorHints;
  createCanvas(): CanvasLike;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
// Matches the 1024px breakpoint used by the hero layout (below it the stage stacks).
const NARROW_VIEWPORT_QUERY = '(max-width: 1023px)';
const COARSE_POINTER_QUERY = '(pointer: coarse)';

export interface WebglProbe {
  webgl2: boolean;
  softwareRenderer: boolean;
}

function release(gl: WebglContextLike): void {
  gl.getExtension('WEBGL_lose_context')?.loseContext?.();
}

/**
 * A strict context (`failIfMajorPerformanceCaveat`) is refused on software rasterizers and
 * blocklisted GPUs, so "strict refused but loose granted" identifies a software renderer.
 */
export function probeWebgl2(createCanvas: () => CanvasLike): WebglProbe {
  try {
    const strict = createCanvas().getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (strict) {
      release(strict);
      return { webgl2: true, softwareRenderer: false };
    }
    const loose = createCanvas().getContext('webgl2');
    if (loose) {
      release(loose);
      return { webgl2: true, softwareRenderer: true };
    }
  } catch {
    // A throwing canvas is treated like missing WebGL2.
  }
  return { webgl2: false, softwareRenderer: false };
}

export function readEnvSnapshot(deps: EnvDeps = browserEnvDeps()): EnvSnapshot {
  const { webgl2, softwareRenderer } = probeWebgl2(deps.createCanvas);
  return {
    webgl2,
    softwareRenderer,
    reducedMotion: deps.matchMedia(REDUCED_MOTION_QUERY).matches,
    isMobile:
      deps.matchMedia(NARROW_VIEWPORT_QUERY).matches ||
      deps.matchMedia(COARSE_POINTER_QUERY).matches,
    cores: deps.navigator.hardwareConcurrency,
    memory: deps.navigator.deviceMemory,
  };
}

/** Real browser wiring. Only call from client code (islands, effects). */
export function browserEnvDeps(): EnvDeps {
  return {
    matchMedia: (query) => window.matchMedia(query),
    navigator: window.navigator as unknown as NavigatorHints,
    createCanvas: () => document.createElement('canvas'),
  };
}

/** Raw stored value (feed it to `resolveOverride`); null when absent or storage throws. */
export function readStoredOverride(storage: StorageLike | null): string | null {
  try {
    return storage?.getItem(HERO_MODE_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

/** Returns false instead of throwing (Safari private mode, quota, blocked storage). */
export function writeStoredOverride(
  storage: StorageLike | null,
  override: Exclude<ModeOverride, null>,
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(HERO_MODE_STORAGE_KEY, overrideToStored(override));
    return true;
  } catch {
    return false;
  }
}
