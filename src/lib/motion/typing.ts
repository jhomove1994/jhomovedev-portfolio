/** Pace of a section command: slow enough to read it as it is typed. */
export const COMMAND_MS_PER_CHAR = 50;
/** Largest deviation from the command pace, so the typing feels played rather than mechanical. */
export const COMMAND_JITTER_MS = 18;
/** Pace of a commit line in the git log: quick, it is a header, not the show. */
export const COMMIT_MS_PER_CHAR = 20;
export const COMMIT_JITTER_MS = 6;

const chars = (text: string) => Array.from(text);

/** Deterministic pseudo-random value in -1..1 for the `index`-th character. */
function jitterAt(index: number): number {
  const mixed = Math.imul(index + 1, 2654435761) >>> 0;
  return ((mixed >>> 8) % 1000) / 500 - 1;
}

/**
 * Cumulative time (ms after typing started) at which each character of `text` appears. Each step
 * is `msPerChar` give or take up to `jitterMs`, the same every run so tests and replays agree.
 */
export function typingTimes(text: string, msPerChar: number, jitterMs: number): number[] {
  let elapsed = 0;
  return chars(text).map((_, index) => {
    elapsed += Math.max(1, msPerChar + jitterAt(index) * jitterMs);
    return elapsed;
  });
}

/** How many characters are on screen `elapsedMs` after typing started. */
export function typedCount(times: readonly number[], elapsedMs: number): number {
  return times.filter((time) => time <= elapsedMs).length;
}

/** The visible part of each segment when `count` characters are typed across all of them in order. */
export function typedSegments(segments: readonly string[], count: number): string[] {
  let left = Math.max(0, count);
  return segments.map((segment) => {
    const taken = chars(segment).slice(0, left);
    left -= taken.length;
    return taken.join('');
  });
}

/** Splits `$ cat about.md` into its prompt and the command, so each can have its own colour. */
export function splitCommand(command: string): { prompt: string; body: string } {
  const match = /^(\$)\s+(.*)$/.exec(command);
  return match ? { prompt: match[1]!, body: match[2]! } : { prompt: '', body: command };
}
