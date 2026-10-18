import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '../../i18n/locales';
import { isPublished, sortByOrder } from './filters';
import { localizeCollection, localizeSingleton, type Localized } from './localize';
import { withYears } from './years';

/** Fallback to the default locale is only worth a signal while authoring; never in a build. */
const onFallback = import.meta.env.DEV
  ? (slug: string, locale: Locale) =>
      console.warn(`[content] "${slug}" has no "${locale}" translation; showing the fallback.`)
  : undefined;

const options = { onFallback };

/** Sorts localized entries by their entry's `order`, keeping the fallback metadata. */
function ordered<T extends { id: string; data: { order?: number } }>(
  items: Localized<T>[],
): Localized<T>[] {
  return sortByOrder(items.map((item) => ({ data: item.entry.data, item }))).map(
    ({ item }) => item,
  );
}

/** Stack catalog (locale-neutral), ordered. */
export async function getStack(): Promise<CollectionEntry<'stack'>[]> {
  return sortByOrder(await getCollection('stack'));
}

/** The profile with `{years}` already filled, so no consumer can print the raw token. */
export async function getProfile(locale: Locale): Promise<Localized<CollectionEntry<'profile'>>> {
  const localized = localizeSingleton(await getCollection('profile'), locale, options);
  return { ...localized, entry: { ...localized.entry, data: withYears(localized.entry.data) } };
}

/** Media is optional until the author uploads a CV or share image, so an empty set is valid. */
export async function getMedia(
  locale: Locale,
): Promise<Localized<CollectionEntry<'media'>> | undefined> {
  const entries = await getCollection('media');
  return entries.length === 0 ? undefined : localizeSingleton(entries, locale, options);
}

export async function getLeadership(
  locale: Locale,
): Promise<Localized<CollectionEntry<'leadership'>>[]> {
  return ordered(localizeCollection(await getCollection('leadership'), locale, options));
}

export async function getExperience(
  locale: Locale,
): Promise<Localized<CollectionEntry<'experience'>>[]> {
  return ordered(localizeCollection(await getCollection('experience'), locale, options));
}

export async function getCertifications(
  locale: Locale,
): Promise<Localized<CollectionEntry<'certifications'>>[]> {
  return ordered(localizeCollection(await getCollection('certifications'), locale, options));
}

/** Drafts (`published: false`) are dropped after resolving the locale, so the served entry decides. */
export async function getProjects(
  locale: Locale,
): Promise<Localized<CollectionEntry<'projects'>>[]> {
  const projects = localizeCollection(await getCollection('projects'), locale, options);
  return ordered(projects.filter(({ entry }) => isPublished(entry)));
}
