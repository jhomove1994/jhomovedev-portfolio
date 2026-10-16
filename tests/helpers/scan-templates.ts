export interface ForbiddenTerm {
  label: string;
  value: string;
}

export interface Violation {
  path: string;
  label: string;
  value: string;
}

/** Case-insensitive search of every term in every file; blank terms are ignored. */
export function findViolations(
  files: readonly { path: string; source: string }[],
  terms: readonly ForbiddenTerm[],
): Violation[] {
  const active = terms.filter(({ value }) => value.trim() !== '');
  return files.flatMap(({ path, source }) => {
    const haystack = source.toLowerCase();
    return active
      .filter(({ value }) => haystack.includes(value.toLowerCase()))
      .map(({ label, value }) => ({ path, label, value }));
  });
}
