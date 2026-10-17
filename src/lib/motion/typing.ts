/** Time between two typed characters of a section command line. */
export const TYPE_MS_PER_CHAR = 45;

/** The part of `command` that is on screen `elapsedMs` after typing started (code points, not units). */
export function typedText(command: string, elapsedMs: number): string {
  const count = Math.max(0, Math.floor(elapsedMs / TYPE_MS_PER_CHAR));
  return Array.from(command).slice(0, count).join('');
}

/** How long typing the whole command takes. */
export function typedDurationMs(command: string): number {
  return Array.from(command).length * TYPE_MS_PER_CHAR;
}
