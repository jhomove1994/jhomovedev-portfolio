import { describe, expect, it } from 'vitest';
import {
  ACCENT_HUE_BAND,
  hexToHsv,
  hexToLinear,
  emissiveParams,
  hsvToHex,
  linearToHex,
  resolveMaterial,
  warmRetint,
} from '../../../src/lib/hero/palette';

const hueOf = (hex: string) => hexToHsv(hex)[0];
const inAccentBand = (hue: number) => hue >= ACCENT_HUE_BAND[0] && hue <= ACCENT_HUE_BAND[1];
const angularDistance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

describe('colour conversions', () => {
  it('round-trips sRGB hex through HSV', () => {
    for (const hex of ['#5c3a21', '#3ddc97', '#ffcf8a', '#050807']) {
      const [h, s, v] = hexToHsv(hex);
      expect(hsvToHex(h, s, v)).toBe(hex);
    }
  });

  it('reads known hues', () => {
    expect(hueOf('#ff0000')).toBeCloseTo(0, 5);
    expect(hueOf('#00ff00')).toBeCloseTo(120, 5);
    expect(hueOf('#3ddc97')).toBeGreaterThan(145);
    expect(hueOf('#3ddc97')).toBeLessThan(160);
  });

  it('converts sRGB hex to linear factors and back', () => {
    expect(hexToLinear('#ffffff')).toEqual([1, 1, 1]);
    expect(hexToLinear('#000000')).toEqual([0, 0, 0]);
    const mid = hexToLinear('#808080');
    expect(mid[0]).toBeCloseTo(0.2158, 3);
    expect(linearToHex([0.2158, 0.2158, 0.2158])).toBe('#808080');
  });
});

describe('warmRetint', () => {
  it('desaturates by 45% and scales value by 0.55', () => {
    const [, s0, v0] = hexToHsv('#3366cc');
    const [, s1, v1] = hexToHsv(warmRetint('#3366cc'));
    expect(s1).toBeCloseTo(s0 * 0.55, 1);
    expect(v1).toBeCloseTo(v0 * 0.55, 1);
  });

  it('nudges the hue toward 30deg without overshooting it', () => {
    const before = hueOf('#3366cc');
    const after = hueOf(warmRetint('#3366cc'));
    expect(angularDistance(after, 30)).toBeLessThan(angularDistance(before, 30));
    const aboveTarget = hueOf(warmRetint('#ffff00'));
    expect(aboveTarget).toBeLessThan(60);
    expect(aboveTarget).toBeGreaterThan(30);
  });

  it('bounds the hue shift', () => {
    for (const hex of ['#3366cc', '#cc3366', '#66cc33', '#ffff00', '#ff00ff']) {
      const shift = angularDistance(hueOf(hex), hueOf(warmRetint(hex)));
      expect(shift).toBeLessThanOrEqual(40.5);
    }
  });

  it('leaves greys neutral (no invented hue)', () => {
    const out = hexToHsv(warmRetint('#bbbbbb'));
    expect(out[1]).toBe(0);
    expect(out[2]).toBeCloseTo(hexToHsv('#bbbbbb')[2] * 0.55, 1);
  });

  it('never lands in the accent hue band for any input hue', () => {
    for (let hue = 0; hue < 360; hue += 5) {
      const input = hsvToHex(hue, 0.8, 0.9);
      expect(inAccentBand(hueOf(warmRetint(input)))).toBe(false);
    }
  });
});

describe('resolveMaterial', () => {
  it('maps named Kenney materials to the night-rustic table', () => {
    expect(resolveMaterial('desk', 'wood', '#e59a64')).toMatchObject({
      mapped: true,
      spec: { color: '#5c3a21', roughness: 0.72, metallic: 0 },
    });
    expect(resolveMaterial('radio', 'metal', '#bdd2d6').spec.color).toBe('#8c6d3f');
    expect(resolveMaterial('lampRoundTable', 'lamp', '#ffffff').spec).toMatchObject({
      color: '#ffcf8a',
      emissive: { color: '#ffb35c', strength: 2 },
      toneMapped: false,
    });
  });

  it('turns the computerScreen metal face into the emissive screen material', () => {
    const screen = resolveMaterial('computerScreen', 'metal', '#bdd2d6');
    expect(screen.mapped).toBe(true);
    expect(screen.spec.name).toBe('screen');
    expect(screen.spec.emissive).toEqual({ color: '#3ddc97', strength: 0.18 });
    expect(screen.spec.toneMapped).toBe(false);
    // The same source name elsewhere is brass, not a screen.
    expect(resolveMaterial('desk', 'metal', '#bdd2d6').spec.name).toBe('metal');
  });

  it('keeps the plant olive and out of the accent hue band', () => {
    const plant = resolveMaterial('books', 'plant', '#2ed293');
    expect(plant.spec.color).toBe('#56653a');
    expect(inAccentBand(hueOf(plant.spec.color))).toBe(false);
  });

  it('retints unmapped materials from their source colour', () => {
    const carpet = resolveMaterial('books', 'carpetDarker', '#cc4c49');
    expect(carpet.mapped).toBe(false);
    expect(carpet.spec.color).toBe(warmRetint('#cc4c49'));
    expect(carpet.spec).toMatchObject({ roughness: 0.8, metallic: 0 });
    expect(resolveMaterial('books', 'carpetWhite', '#f8ffff').spec.color).toBe(
      warmRetint('#f8ffff'),
    );
  });
});

describe('emissiveParams', () => {
  it('scales the factor when the strength is below 1 (no extension needed)', () => {
    const { factor, strength } = emissiveParams({ color: '#3ddc97', strength: 0.18 });
    const [r, g, b] = hexToLinear('#3ddc97');
    expect(strength).toBeNull();
    expect(factor[0]).toBeCloseTo(r * 0.18, 6);
    expect(factor[1]).toBeCloseTo(g * 0.18, 6);
    expect(factor[2]).toBeCloseTo(b * 0.18, 6);
  });

  it('keeps the factor in [0,1] and carries the strength for values above 1', () => {
    const { factor, strength } = emissiveParams({ color: '#ffb35c', strength: 2 });
    expect(factor).toEqual(hexToLinear('#ffb35c'));
    expect(strength).toBe(2);
    expect(Math.max(...factor)).toBeLessThanOrEqual(1);
  });
});
