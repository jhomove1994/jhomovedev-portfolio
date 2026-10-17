/** Gap between two consecutive items entering a section. */
export const STAGGER_STEP_MS = 100;
/** Items past this index enter together with it, so a long list does not trail behind the reader. */
export const STAGGER_MAX_STEPS = 6;

/** Delay for the `index`-th item of a batch, after `baseMs`. */
export function staggerDelayMs(index: number, baseMs = 0): number {
  const step = Math.min(Math.max(0, index), STAGGER_MAX_STEPS);
  return baseMs + step * STAGGER_STEP_MS;
}
