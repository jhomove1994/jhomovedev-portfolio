export interface StackCatalogEntry {
  id: string;
  data: { name: string };
}

function refId(ref: unknown): string {
  if (typeof ref === 'object' && ref !== null && 'id' in ref && typeof ref.id === 'string') {
    return ref.id;
  }
  throw new Error('Invalid stack reference: expected an object with a string id');
}

/**
 * Display names for an entry's stack references, in the entry's own order. References arrive as
 * `unknown` because the collection schema is built from an injected validator. A reference missing
 * from the catalog throws: Astro only logs dangling references, so the page build must not.
 */
export function resolveStackNames(
  refs: readonly unknown[],
  catalog: readonly StackCatalogEntry[],
): string[] {
  const names = new Map(catalog.map((entry) => [entry.id, entry.data.name]));
  return refs.map((ref) => {
    const id = refId(ref);
    const name = names.get(id);
    if (name === undefined) throw new Error(`Unknown stack reference "${id}"`);
    return name;
  });
}
