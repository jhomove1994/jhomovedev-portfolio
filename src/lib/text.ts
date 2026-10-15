const TODO_MARKER = /^\s*TODO\(autor\)/;

/** True for author placeholders such as `TODO(autor): add the real figure`. */
export function isTodo(value: unknown): boolean {
  return typeof value === 'string' && TODO_MARKER.test(value);
}

/** Sveltia writes `""` for cleared optional fields; normalize it to `undefined`. */
export function emptyToUndefined<T>(value: T): T | undefined {
  return value === '' ? undefined : value;
}
