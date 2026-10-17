/**
 * Pointer parallax maths for the hero camera (pure, no three import). The pointer becomes a
 * bounded camera offset in metres: never past `limits`, scaled by a weight (the scroll zoom
 * lowers it to 0), and absent on coarse pointers where there is no hover to follow.
 */
export interface PointerPosition {
  /** -1 (left edge) .. 1 (right edge). */
  x: number;
  /** -1 (bottom edge) .. 1 (top edge). */
  y: number;
}

export interface ParallaxLimits {
  x: number;
  y: number;
}

export interface ParallaxOptions {
  /** Largest offset on each axis, metres. */
  limits: ParallaxLimits;
  /** 0..1 multiplier; out-of-range values are clamped. */
  weight?: number;
  /** A touch / coarse pointer: the camera never moves. */
  coarse?: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Adding 0 turns a negative zero into a plain zero, so equality checks stay simple. */
const plain = (value: number) => value + 0;

export function parallaxOffset(
  pointer: PointerPosition,
  { limits, weight = 1, coarse = false }: ParallaxOptions,
): PointerPosition {
  if (coarse) return { x: 0, y: 0 };
  const w = clamp(weight, 0, 1);
  return {
    x: plain(clamp(pointer.x, -1, 1) * limits.x * w),
    y: plain(clamp(pointer.y, -1, 1) * limits.y * w),
  };
}

/** Client coordinates to the -1..1 pointer space (y up), clamped to the viewport. */
export function normalizePointer(
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): PointerPosition {
  if (width <= 0 || height <= 0) return { x: 0, y: 0 };
  return {
    x: plain(clamp((clientX / width) * 2 - 1, -1, 1)),
    y: plain(clamp(1 - (clientY / height) * 2, -1, 1)),
  };
}

/**
 * Exponential smoothing toward `target`. `lambda` is the rate in 1/s; the result depends only on
 * elapsed time, so the camera feels the same at 30 and 120 fps.
 */
export function dampValue(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
