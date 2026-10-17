/** Index of the current stage: the latest one that is real (placeholders are `marked`), or -1. */
export function currentStage(marked: readonly boolean[]): number {
  return marked.findLastIndex((isMarked) => !isMarked);
}

/** Node positions (px from the path start) as fractions of the path length, clamped to 0..1. */
export function nodeFractions(offsets: readonly number[], length: number): number[] {
  if (length <= 0) return offsets.map(() => 0);
  return offsets.map((offset) => Math.min(1, Math.max(0, offset / length)));
}
