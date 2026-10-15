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

/** Ascending by `order`; entries without `order` go last. Stable and non-mutating. */
export function sortByOrder<T extends OrderedEntry>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => (a.data.order ?? Infinity) - (b.data.order ?? Infinity) || 0);
}
