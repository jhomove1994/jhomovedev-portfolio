// "Did you mean" for unknown commands. Pure: no DOM, no framework.

import { COMMAND_NAMES } from './types';

const MAX_DISTANCE = 2;

/** Levenshtein distance with a single rolling row. */
export function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, substitution);
    }
    previous = current;
  }
  return previous[b.length]!;
}

/** Closest advertised command within edit distance 2, or `null`. */
export function suggestCommand(input: string): string | null {
  const word = input.trim().toLowerCase();
  let best: { command: string; distance: number } | null = null;
  for (const command of COMMAND_NAMES) {
    const distance = editDistance(word, command);
    if (distance <= MAX_DISTANCE && (best === null || distance < best.distance)) {
      best = { command, distance };
    }
  }
  return best?.command ?? null;
}
