/**
 * Quality tiers driven by drei's PerformanceMonitor (design AD10). Pure: the monitor's
 * decline / incline / fallback callbacks become events, the scene reads the settings.
 * Dropping tiers never switches the hero to static by itself; `atFloor` is the signal the
 * sustained-low-fps fallback (S12) builds on.
 */
export type Tier = 'high' | 'mid' | 'low';
export type TierEvent = 'decline' | 'incline' | 'fallback';

const ORDER: readonly Tier[] = ['high', 'mid', 'low'];

export const MAX_TIER: Tier = 'high';
export const FLOOR_TIER: Tier = 'low';

export interface TierSettings {
  /** [min, max] device pixel ratio handed to the canvas. */
  dpr: [number, number];
  bloom: boolean;
  contactShadows: boolean;
}

export const TIER_SETTINGS: Record<Tier, TierSettings> = {
  high: { dpr: [1, 1.5], bloom: true, contactShadows: true },
  mid: { dpr: [1, 1], bloom: true, contactShadows: true },
  low: { dpr: [1, 1], bloom: false, contactShadows: false },
};

/**
 * Subtle bloom (design AD9). The threshold sits above anything lit and tone-mapped, so only the
 * `toneMapped: false` emissives (lamp shade, screen glow) bleed; the intensity keeps it a halo.
 */
export const BLOOM_SETTINGS = { threshold: 0.9, intensity: 0.35 } as const;

export interface TierResult {
  tier: Tier;
  atFloor: boolean;
}

export function reduceTier(current: Tier, event: TierEvent): TierResult {
  const index = ORDER.indexOf(current);
  const last = ORDER.length - 1;
  const next =
    event === 'decline'
      ? Math.min(index + 1, last)
      : event === 'incline'
        ? Math.max(index - 1, 0)
        : last;
  const tier = ORDER[next]!;
  return { tier, atFloor: tier === FLOOR_TIER };
}

/** Frames slower than this count as slow: 50 ms is 20 fps. */
export const LOW_FPS_THRESHOLD = 20;
/** Net slow time at the floor tier before the hero gives up on 3D. */
export const LOW_FPS_SUSTAIN_MS = 4000;
/** A longer gap is a paused loop (hidden tab, off screen), not slow rendering. */
export const LOW_FPS_MAX_FRAME_MS = 1000;

const SLOW_FRAME_MS = 1000 / LOW_FPS_THRESHOLD;

export interface LowFpsState {
  /** Slow time not yet paid back by healthy frames. */
  slowMs: number;
  /** The fallback was already requested; it never repeats. */
  fired: boolean;
}

export interface LowFpsFrame {
  atFloor: boolean;
  deltaMs: number;
}

export const INITIAL_LOW_FPS: LowFpsState = { slowMs: 0, fired: false };

/**
 * Sustained low-fps fallback (S12). Only the floor tier counts: above it the performance monitor
 * is still stepping quality down. Slow frames add their duration, healthy frames pay it back, so
 * hitches do not add up but a scene that cannot keep 20 fps for a few seconds reverts, once.
 */
export function stepLowFps(
  state: LowFpsState,
  { atFloor, deltaMs }: LowFpsFrame,
): { state: LowFpsState; fire: boolean } {
  if (state.fired) return { state, fire: false };
  if (!atFloor || deltaMs > LOW_FPS_MAX_FRAME_MS) {
    return { state: { slowMs: 0, fired: false }, fire: false };
  }
  const slowMs =
    deltaMs >= SLOW_FRAME_MS ? state.slowMs + deltaMs : Math.max(0, state.slowMs - deltaMs);
  if (slowMs >= LOW_FPS_SUSTAIN_MS) return { state: { slowMs, fired: true }, fire: true };
  return { state: { slowMs, fired: false }, fire: false };
}
