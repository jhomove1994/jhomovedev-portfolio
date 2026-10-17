const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Length of the lit part of a rail `height` px tall at scroll `progress` (0..1). */
export function fillLength(progress: number, height: number): number {
  return clamp01(progress) * height;
}

/** Which nodes (offsets in px from the rail start) the fill has reached. */
export function litNodes(offsets: readonly number[], fill: number): boolean[] {
  return offsets.map((offset) => offset <= fill);
}
