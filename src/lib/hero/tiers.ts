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
