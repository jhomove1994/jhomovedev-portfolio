/**
 * Crop of the static still for stacked (narrow) screens, pure and DOM-free. The monitor glass
 * (`still-anchor.json`) is scaled up to fill most of the stage width and the image is cropped
 * around it, so the 2D terminal sits on the glass inside the first viewport instead of below an
 * empty monitor. Every value is a fraction of the stage width (CSS turns them into `cqw`).
 */
import type { StillAnchor } from './capture';

/** The still and the stage it fills are 16:10. */
export const STILL_ASPECT = 1.6;

export interface NarrowStillOptions {
  /** Share of the stage width the glass should fill. */
  fill: number;
  /** Desk and wall kept above the glass. */
  padTop: number;
  /** Desk and keyboard kept below the glass (room for the 3D toggle). */
  padBottom: number;
  /** Width over height of the still image. */
  aspect: number;
}

export const NARROW_STILL_DEFAULTS: NarrowStillOptions = {
  fill: 0.9,
  padTop: 0.08,
  padBottom: 0.14,
  aspect: STILL_ASPECT,
};

export interface NarrowStillLayout {
  /** Rendered width of the whole image. */
  mediaWidth: number;
  /** Offset of the image inside the box (<= 0). */
  mediaLeft: number;
  mediaTop: number;
  /** Height of the visible box. */
  boxHeight: number;
  /** Glass rect inside the box, where the terminal frame goes. */
  glassLeft: number;
  glassTop: number;
  glassWidth: number;
  glassHeight: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function narrowStillLayout(
  anchor: StillAnchor,
  options: Partial<NarrowStillOptions> = {},
): NarrowStillLayout {
  const { fill, padTop, padBottom, aspect } = { ...NARROW_STILL_DEFAULTS, ...options };
  const mediaWidth = fill / anchor.width;
  const mediaHeight = mediaWidth / aspect;

  // Centre the glass, but never reveal anything outside the image.
  const mediaLeft = clamp((1 - fill) / 2 - anchor.x * mediaWidth, 1 - mediaWidth, 0);
  const glassTopInMedia = anchor.y * mediaHeight;
  const glassHeight = anchor.height * mediaHeight;
  const boxTop = Math.max(0, glassTopInMedia - padTop);
  const boxBottom = Math.min(mediaHeight, glassTopInMedia + glassHeight + padBottom);

  return {
    mediaWidth,
    mediaLeft,
    mediaTop: -boxTop,
    boxHeight: boxBottom - boxTop,
    glassLeft: mediaLeft + anchor.x * mediaWidth,
    glassTop: glassTopInMedia - boxTop,
    glassWidth: fill,
    glassHeight,
  };
}
