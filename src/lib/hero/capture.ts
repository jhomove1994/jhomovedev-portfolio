/**
 * Measures the projected monitor glass as a stage rect (pure, three-free). The capture script reads
 * it from the live scene (rendered from the still camera), checks it with `stillAnchorProblems` and
 * writes it to `still-anchor.json`: the 2D terminal frame of the static hero is placed exactly on
 * the glass of the committed still.
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

/** The glass must hold a readable terminal, clear the hero copy and leave desk below it. */
const MIN_GLASS_WIDTH = 0.4;
const COPY_RIGHT_EDGE = 0.33;
const MAX_RIGHT = 0.97;
const MAX_BOTTOM = 0.85;

/** What is wrong with a glass rect for the static hero; empty when it is usable. */
export function stillAnchorProblems(anchor: StillAnchor): string[] {
  const problems: string[] = [];
  if (anchor.width < MIN_GLASS_WIDTH) {
    problems.push(`glass width ${anchor.width} is under ${MIN_GLASS_WIDTH} of the stage`);
  }
  if (anchor.x < COPY_RIGHT_EDGE) {
    problems.push(`glass starts at ${anchor.x}, under the hero copy (until ${COPY_RIGHT_EDGE})`);
  }
  if (anchor.x + anchor.width > MAX_RIGHT) {
    problems.push(`glass reaches ${anchor.x + anchor.width}, past the right limit ${MAX_RIGHT}`);
  }
  if (anchor.y + anchor.height > MAX_BOTTOM) {
    problems.push(
      `glass reaches ${anchor.y + anchor.height}, past the bottom limit ${MAX_BOTTOM}: no desk below`,
    );
  }
  return problems;
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
