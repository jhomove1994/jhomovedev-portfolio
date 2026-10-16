/** Brand accent `#3DDC97` as RGB. Mirrors the design token; the terminal/neon budget is ~10%. */
export const ACCENT_RGB = [0x3d, 0xdc, 0x97] as const;

export interface AccentRatioOptions {
  /** Max per-channel distance from the accent for a pixel to count as accent. */
  tolerance?: number;
}

const DEFAULT_TOLERANCE = 24;

/**
 * Share (0..1) of opaque pixels whose color is within `tolerance` of the accent.
 * `rgba` is a flat RGBA buffer (4 bytes per pixel), e.g. canvas `ImageData.data`.
 * Fully transparent pixels are excluded from the total.
 */
export function accentRatio(
  rgba: ArrayLike<number>,
  { tolerance = DEFAULT_TOLERANCE }: AccentRatioOptions = {},
): number {
  if (rgba.length % 4 !== 0) {
    throw new Error('accentRatio expects a whole number of RGBA pixels');
  }
  let total = 0;
  let accent = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] === 0) continue;
    total++;
    if (
      Math.abs(rgba[i]! - ACCENT_RGB[0]) <= tolerance &&
      Math.abs(rgba[i + 1]! - ACCENT_RGB[1]) <= tolerance &&
      Math.abs(rgba[i + 2]! - ACCENT_RGB[2]) <= tolerance
    ) {
      accent++;
    }
  }
  return total === 0 ? 0 : accent / total;
}
