const typedBySection = new WeakMap<Element, Promise<void>>();

/** Registers the promise that settles once a section's command finished typing. */
export function markTyped(section: Element, typed: Promise<void>): void {
  typedBySection.set(section, typed);
}

/** Resolves when the section's command is typed; at once for a section that never types. */
export function whenTyped(section: Element): Promise<void> {
  return typedBySection.get(section) ?? Promise.resolve();
}
