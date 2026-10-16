import { DEFAULT_LOCALE, type Locale } from '../../i18n/locales';
import { parseEntryId } from './entry-id';

/**
 * Fields the admin copies to every locale file (`i18n: duplicate`), per collection. They must be
 * equal across locales; a test keeps this map equal to `public/admin/config.yml`. `stack` has no
 * locale files, so it is absent.
 */
export const SHARED_FIELDS = {
  profile: ['name', 'brand', 'remote', 'yearsExperience', 'availability', 'contact'],
  media: [],
  leadership: ['date', 'link', 'order'],
  experience: ['company', 'location', 'start', 'end', 'stack', 'order'],
  certifications: ['kind', 'code', 'issuer', 'year', 'status', 'credentialUrl', 'badge', 'order'],
  projects: ['stack', 'featured', 'order', 'published', 'repoUrl'],
} as const satisfies Record<string, readonly string[]>;

export interface ParityEntry {
  id: string;
  data: Record<string, unknown>;
}

export interface SharedMismatch {
  slug: string;
  field: string;
  es: unknown;
  en: unknown;
}

export interface UnpairedEntry {
  slug: string;
  locale: Locale;
}

export interface SharedFieldsReport {
  /** Failures: a shared field differs between the two locale files of one entry. */
  mismatches: SharedMismatch[];
  /** Warnings: entries that exist in only one locale (the other falls back at render time). */
  unpaired: UnpairedEntry[];
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (typeof left !== 'object' || typeof right !== 'object' || left === null || right === null) {
    return false;
  }
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key) =>
      deepEqual((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]),
    )
  );
}

/** Compares `fields` between the `es` and `en` entry of every slug that has both. */
export function findSharedMismatches(
  entries: readonly ParityEntry[],
  fields: readonly string[],
): SharedFieldsReport {
  const bySlug = new Map<string, Map<Locale, ParityEntry>>();
  for (const entry of entries) {
    const { locale, slug } = parseEntryId(entry.id);
    const perLocale = bySlug.get(slug) ?? new Map<Locale, ParityEntry>();
    perLocale.set(locale, entry);
    bySlug.set(slug, perLocale);
  }

  const report: SharedFieldsReport = { mismatches: [], unpaired: [] };
  for (const [slug, perLocale] of bySlug) {
    const es = perLocale.get(DEFAULT_LOCALE);
    const en = perLocale.get('en');
    if (!es || !en) {
      const locale = es ? DEFAULT_LOCALE : 'en';
      report.unpaired.push({ slug, locale });
      continue;
    }
    for (const field of fields) {
      if (!deepEqual(es.data[field], en.data[field])) {
        report.mismatches.push({ slug, field, es: es.data[field], en: en.data[field] });
      }
    }
  }
  return report;
}
