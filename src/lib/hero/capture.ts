/**
 * Measures the projected monitor glass as a stage rect (pure, three-free). The capture script reads
 * it from the live scene and checks that the 2D terminal frame of the static hero (the rect in
 * `still-anchor.json`) covers the glass of the committed still, so the painted screen never shows
 * around the frame.
 */
import type { Quad, StageSize } from './zoom';

/** The glass as fractions of the stage: origin top-left, all values 0..1. */
export interface StillAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DECIMALS = 1000;
const round = (value: number) => Math.round(value * DECIMALS) / DECIMALS;

/** Bounding box of `quad`, as fractions of `stage`, rounded so the committed json is stable. */
export function stillAnchorFromQuad(quad: Quad, stage: StageSize): StillAnchor {
  const xs = quad.map((p) => p.x);
  const ys = quad.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: round(minX / stage.width),
    y: round(minY / stage.height),
    width: round((Math.max(...xs) - minX) / stage.width),
    height: round((Math.max(...ys) - minY) / stage.height),
  };
}

const EPSILON = 1e-9;

/** True when `frame` contains `glass`, edges included. */
export function frameCoversGlass(frame: StillAnchor, glass: StillAnchor): boolean {
  return (
    glass.x >= frame.x - EPSILON &&
    glass.y >= frame.y - EPSILON &&
    glass.x + glass.width <= frame.x + frame.width + EPSILON &&
    glass.y + glass.height <= frame.y + frame.height + EPSILON
  );
}

/** Reads CAPTURE_PORT: `fallback` when unset or empty, otherwise an integer 1..65535 or an error. */
export function parseCapturePort(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === '') return fallback;
  const port = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`CAPTURE_PORT must be an integer between 1 and 65535, got "${raw}"`);
  }
  return port;
}
