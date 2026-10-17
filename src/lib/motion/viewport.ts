/** Fraction of the viewport height (from the top) at which a section counts as entered: `top 85%`. */
export const ENTER_LINE = 0.85;

/** Whether an element whose top is `top` px from the viewport top is already past the enter line. */
export function hasEntered(top: number, viewportHeight: number): boolean {
  return top <= viewportHeight * ENTER_LINE;
}
