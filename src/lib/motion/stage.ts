/** Index of the current stage: the latest one that is real (placeholders are `marked`), or -1. */
export function currentStage(marked: readonly boolean[]): number {
  return marked.findLastIndex((isMarked) => !isMarked);
}

/** Node positions (px from the path start) as fractions of the path length, clamped to 0..1. */
export function nodeFractions(offsets: readonly number[], length: number): number[] {
  if (length <= 0) return offsets.map(() => 0);
  return offsets.map((offset) => Math.min(1, Math.max(0, offset / length)));
}

/**
 * How far the graph line is drawn (0..1): down to the last commit that appeared, and the whole
 * line once all of them did. `reached` and `fractions` are per commit, in order.
 */
export function traceTarget(reached: readonly boolean[], fractions: readonly number[]): number {
  if (reached.every(Boolean)) return 1;
  const last = reached.findLastIndex(Boolean);
  return last === -1 ? 0 : (fractions[last] ?? 0);
}
