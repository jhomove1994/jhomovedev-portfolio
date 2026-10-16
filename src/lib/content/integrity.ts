/** A content file and the stack ids it references. */
export interface RefSource {
  file: string;
  ids: readonly string[];
}

export interface DanglingRef {
  file: string;
  id: string;
}

/**
 * Stack ids that do not exist in the catalog. Astro only logs an `[ERROR] [content]` line for a
 * dangling `reference()` and still builds, so this is the guard that actually fails a test.
 */
export function findDanglingRefs(
  refs: readonly RefSource[],
  known: Iterable<string>,
): DanglingRef[] {
  const catalog = new Set(known);
  return refs.flatMap(({ file, ids }) =>
    ids.filter((id) => !catalog.has(id)).map((id) => ({ file, id })),
  );
}
