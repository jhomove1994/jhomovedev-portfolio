export interface PublishableEntry {
  data: { published: boolean };
}

export interface OrderedEntry {
  data: { order?: number };
}

/** Drafts (`published: false`) never reach a rendered page. */
export function isPublished(entry: PublishableEntry): boolean {
  return entry.data.published;
}

function orderOf(entry: OrderedEntry): number {
  return entry.data.order ?? Number.POSITIVE_INFINITY;
}

/** Ascending by `order`; entries without `order` go last. Stable and non-mutating. */
export function sortByOrder<T extends OrderedEntry>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => {
    const left = orderOf(a);
    const right = orderOf(b);
    // Equal values (including two Infinity) must yield 0, not NaN, to keep the sort stable.
    return left === right ? 0 : left < right ? -1 : 1;
  });
}
