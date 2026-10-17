// External store that owns the hero mode: reads the environment once, applies the `?3d=` query
// and the stored choice, and re-decides when the visitor toggles, reduced motion changes or the
// viewport crosses 768px.
// No React and no DOM globals: the browser wiring is injected (see `browserModeDeps`).
import {
  HERO_MODE_QUERY_PARAM,
  decideMode,
  resolveOverride,
  type EnvSnapshot,
  type ModeDecision,
  type ModeOverride,
} from '../capabilities';
import {
  REDUCED_MOTION_QUERY,
  SMALL_SCREEN_QUERY,
  browserEnvDeps,
  readEnvSnapshot,
  readStoredOverride,
  writeStoredOverride,
  type EnvDeps,
  type StorageLike,
} from '../capabilities-env';

export interface HeroModeState {
  decision: ModeDecision;
  override: ModeOverride;
}

export interface ModeControllerDeps {
  env: EnvDeps;
  storage: StorageLike | null;
  /** `location.search` at page load. */
  search: string;
  /**
   * Calls the listener whenever the reduced-motion preference or the small-screen breakpoint
   * changes; returns the unwatch.
   */
  watchEnvironment(listener: () => void): () => void;
}

export interface HeroModeController {
  getSnapshot(): HeroModeState;
  subscribe(listener: () => void): () => void;
  /** The visitor's explicit choice (toggle button): persisted and applied immediately. */
  setOverride(override: Exclude<ModeOverride, null>): void;
}

function sameDecision(a: ModeDecision, b: ModeDecision): boolean {
  return (
    a.mode === b.mode &&
    a.reason === b.reason &&
    a.toggle.available === b.toggle.available &&
    a.toggle.target === b.toggle.target
  );
}

export function createModeController(deps: ModeControllerDeps): HeroModeController {
  const query = new URLSearchParams(deps.search).get(HERO_MODE_QUERY_PARAM);
  const resolved = resolveOverride({ query, stored: readStoredOverride(deps.storage) });
  if (resolved.override !== null && resolved.persist !== null) {
    writeStoredOverride(deps.storage, resolved.override);
  }

  let env: EnvSnapshot = readEnvSnapshot(deps.env);
  let override = resolved.override;
  let state: HeroModeState = { decision: decideMode({ ...env, override }), override };
  const listeners = new Set<() => void>();
  let unwatch: (() => void) | null = null;

  function update(next: HeroModeState): void {
    const unchanged =
      next.override === state.override && sameDecision(next.decision, state.decision);
    if (unchanged) return;
    state = next;
    for (const listener of [...listeners]) listener();
  }

  function redecide(): void {
    update({ decision: decideMode({ ...env, override }), override });
  }

  return {
    getSnapshot: () => state,

    subscribe(listener) {
      listeners.add(listener);
      unwatch ??= deps.watchEnvironment(() => {
        env = readEnvSnapshot(deps.env);
        redecide();
      });
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          unwatch?.();
          unwatch = null;
        }
      };
    },

    setOverride(choice) {
      writeStoredOverride(deps.storage, choice);
      override = choice;
      redecide();
    },
  };
}

function safeStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Real browser wiring. Only call from client code. */
export function browserModeDeps(): ModeControllerDeps {
  return {
    env: browserEnvDeps(),
    storage: safeStorage(),
    search: window.location.search,
    watchEnvironment(listener) {
      const queries = [REDUCED_MOTION_QUERY, SMALL_SCREEN_QUERY].map((q) => window.matchMedia(q));
      for (const query of queries) query.addEventListener('change', listener);
      return () => {
        for (const query of queries) query.removeEventListener('change', listener);
      };
    },
  };
}
