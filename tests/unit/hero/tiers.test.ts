import { describe, expect, it } from 'vitest';
import {
  BLOOM_SETTINGS,
  FLOOR_TIER,
  MAX_TIER,
  TIER_SETTINGS,
  reduceTier,
  type Tier,
} from '../../../src/lib/hero/tiers';

describe('reduceTier', () => {
  it('steps down one tier on decline until the floor', () => {
    expect(reduceTier('high', 'decline')).toEqual({ tier: 'mid', atFloor: false });
    expect(reduceTier('mid', 'decline')).toEqual({ tier: 'low', atFloor: true });
  });

  it('never goes below the floor and keeps reporting it', () => {
    expect(reduceTier('low', 'decline')).toEqual({ tier: 'low', atFloor: true });
  });

  it('steps up one tier on incline until the max', () => {
    expect(reduceTier('low', 'incline')).toEqual({ tier: 'mid', atFloor: false });
    expect(reduceTier('mid', 'incline')).toEqual({ tier: 'high', atFloor: false });
  });

  it('never goes above the max', () => {
    expect(reduceTier('high', 'incline')).toEqual({ tier: 'high', atFloor: false });
  });

  it('pins the floor tier on fallback from any tier', () => {
    for (const from of ['high', 'mid', 'low'] as Tier[]) {
      expect(reduceTier(from, 'fallback')).toEqual({ tier: FLOOR_TIER, atFloor: true });
    }
  });

  it('exposes the bounds the stepping respects', () => {
    expect(MAX_TIER).toBe('high');
    expect(FLOOR_TIER).toBe('low');
  });
});

describe('TIER_SETTINGS', () => {
  it('caps the device pixel ratio at 1.5 and lowers it with the tier', () => {
    expect(TIER_SETTINGS.high.dpr).toEqual([1, 1.5]);
    expect(TIER_SETTINGS.mid.dpr).toEqual([1, 1]);
    expect(TIER_SETTINGS.low.dpr).toEqual([1, 1]);
  });

  it('drops contact shadows first, then bloom (design AD10)', () => {
    expect(TIER_SETTINGS.high).toMatchObject({ contactShadows: true, bloom: true });
    expect(TIER_SETTINGS.mid).toMatchObject({ contactShadows: true, bloom: true });
    expect(TIER_SETTINGS.low).toMatchObject({ contactShadows: false, bloom: false });
  });
});

describe('BLOOM_SETTINGS', () => {
  it('only the emissives (lamp shade, screen glow) pass the luminance threshold', () => {
    // Lit, tone-mapped surfaces stay below 0.9; the toneMapped:false emissives exceed it.
    expect(BLOOM_SETTINGS.threshold).toBeGreaterThanOrEqual(0.85);
    expect(BLOOM_SETTINGS.threshold).toBeLessThan(1);
  });

  it('is a faint halo, not a glow: intensity stays at or below 0.5', () => {
    expect(BLOOM_SETTINGS.intensity).toBeGreaterThan(0);
    expect(BLOOM_SETTINGS.intensity).toBeLessThanOrEqual(0.5);
  });
});
