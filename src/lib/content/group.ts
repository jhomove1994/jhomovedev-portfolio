export interface KindGroup<K extends string, T> {
  kind: K;
  items: T[];
}

/** Groups items by `kind` in a fixed display order; kinds without items are left out. */
export function groupByKind<K extends string, T extends { kind: string }>(
  items: readonly T[],
  kinds: readonly K[],
): KindGroup<K, T>[] {
  return kinds.flatMap((kind) => {
    const own = items.filter((item) => item.kind === kind);
    return own.length > 0 ? [{ kind, items: own }] : [];
  });
}
