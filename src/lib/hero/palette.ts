/**
 * Night-rustic material palette for the hero desk (design AD8), build-time only.
 * Pure: no three, no DOM. `scripts/models/build-hero.ts` imports it to replace the
 * Kenney unlit materials with standard PBR ones.
 */

export type Hsv = readonly [hue: number, saturation: number, value: number];
export type Rgb = readonly [number, number, number];

/** Hue range (degrees) of the #3DDC97 accent; warm props must stay out of it. */
export const ACCENT_HUE_BAND = [124, 184] as const;

const WARM_HUE = 30;
const SATURATION_KEEP = 0.55; // desaturate 45%
const VALUE_SCALE = 0.55;
const HUE_NUDGE = 0.5; // fraction of the shortest distance to WARM_HUE
const MAX_HUE_SHIFT = 40;
const BAND_MARGIN = 2; // absorbs 8-bit rounding when re-reading a hue
const ACCENT_ESCAPE_HUE = ACCENT_HUE_BAND[0] - 4; // olive side, away from mint

function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex([r, g, b]: Rgb): string {
  const channel = (c: number) => Math.round(c).toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

export function hexToHsv(hex: string): Hsv {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
  }
  return [(hue * 60 + 360) % 360, max === 0 ? 0 : delta / max, max];
}

export function hsvToHex(hue: number, saturation: number, value: number): string {
  const h = (((hue % 360) + 360) % 360) / 60;
  const c = value * saturation;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const sector: Rgb[] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ];
  const m = value - c;
  const [r, g, b] = sector[Math.floor(h) % 6]!;
  return rgbToHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/** sRGB hex to the linear factors glTF `baseColorFactor` / `emissiveFactor` expect. */
export function hexToLinear(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return [toLinear(r / 255), toLinear(g / 255), toLinear(b / 255)];
}

export function linearToHex([r, g, b]: Rgb): string {
  return rgbToHex([toSrgb(r) * 255, toSrgb(g) * 255, toSrgb(b) * 255]);
}

/** Signed shortest rotation from `from` to `to`, in (-180, 180]. */
function hueDelta(from: number, to: number): number {
  const d = (((to - from) % 360) + 540) % 360;
  return d - 180 + (d === 0 ? 360 : 0);
}

/**
 * Pulls an arbitrary colour into the warm night palette: -45% saturation, value x0.55 and
 * the hue nudged toward 30deg (bounded). Never returns a hue inside the accent band.
 */
export function warmRetint(hex: string): string {
  const [hue, saturation, value] = hexToHsv(hex);
  const shift = Math.max(
    -MAX_HUE_SHIFT,
    Math.min(MAX_HUE_SHIFT, hueDelta(hue, WARM_HUE) * HUE_NUDGE),
  );
  let nextHue = (hue + shift + 360) % 360;
  if (nextHue >= ACCENT_HUE_BAND[0] - BAND_MARGIN && nextHue <= ACCENT_HUE_BAND[1] + BAND_MARGIN) {
    nextHue = ACCENT_ESCAPE_HUE;
  }
  return hsvToHex(nextHue, saturation * SATURATION_KEEP, value * VALUE_SCALE);
}

export interface MaterialSpec {
  name: string;
  color: string;
  roughness: number;
  metallic: number;
  emissive?: { color: string; strength: number };
  /** Runtime hint (glTF extras): bloom-bright emissives must skip tone mapping. */
  toneMapped?: boolean;
}

const spec = (
  name: string,
  color: string,
  roughness: number,
  metallic: number,
  extra: Partial<MaterialSpec> = {},
): MaterialSpec => ({ name, color, roughness, metallic, ...extra });

/** Kenney material names found in the 8 source models, by name. */
export const MATERIAL_TABLE: Readonly<Record<string, MaterialSpec>> = {
  wood: spec('wood', '#5c3a21', 0.72, 0),
  woodDark: spec('woodDark', '#3b2414', 0.78, 0),
  metal: spec('metal', '#8c6d3f', 0.38, 0.7),
  metalDark: spec('metalDark', '#1f1c1a', 0.6, 0.2),
  metalMedium: spec('metalMedium', '#33302c', 0.55, 0.3),
  lamp: spec('lamp', '#ffcf8a', 0.5, 0, {
    emissive: { color: '#ffb35c', strength: 2 },
    toneMapped: false,
  }),
  plant: spec('plant', '#56653a', 0.8, 0),
};

/** Per-model overrides, keyed `modelId:materialName`. The monitor face is the screen. */
export const MODEL_OVERRIDES: Readonly<Record<string, MaterialSpec>> = {
  'computerScreen:metal': spec('screen', '#050807', 0.4, 0, {
    emissive: { color: '#3ddc97', strength: 0.18 },
    toneMapped: false,
  }),
};

export interface ResolvedMaterial {
  spec: MaterialSpec;
  /** false when no table entry existed and the source colour was retinted instead. */
  mapped: boolean;
}

export function resolveMaterial(
  modelId: string,
  materialName: string,
  sourceHex: string,
): ResolvedMaterial {
  const known = MODEL_OVERRIDES[`${modelId}:${materialName}`] ?? MATERIAL_TABLE[materialName];
  if (known) return { spec: known, mapped: true };
  return { spec: spec(materialName, warmRetint(sourceHex), 0.8, 0), mapped: false };
}

export interface EmissiveParams {
  /** glTF `emissiveFactor`, linear, each channel in [0, 1]. */
  factor: [number, number, number];
  /** KHR_materials_emissive_strength value, or null when the factor alone carries it. */
  strength: number | null;
}

/** glTF caps emissiveFactor at 1, so brighter-than-1 emission needs the strength extension. */
export function emissiveParams(emissive: { color: string; strength: number }): EmissiveParams {
  const [r, g, b] = hexToLinear(emissive.color);
  if (emissive.strength >= 1) return { factor: [r, g, b], strength: emissive.strength };
  const k = emissive.strength;
  return { factor: [r * k, g * k, b * k], strength: null };
}
