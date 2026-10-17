// Pure mapping from plain content objects to the serializable TerminalData the engine prints.
// Takes plain objects (no astro:content), invents nothing, drops unpublished projects.
import type { Locale } from '../../i18n/locales';
import { LOCALES } from '../../i18n/locales';
import { t } from '../../i18n/ui';
import { resolveCv } from '../content/cv';
import { sortByOrder } from '../content/filters';
import { parseBulletList } from '../content/markdown-list';
import { formatPeriod } from '../content/period';
import { CLUSTERS } from '../content/schemas';
import { resolveStackNames, type StackCatalogEntry } from '../content/stack-names';
import { withTodoVisibility } from '../content/todo';
import { isTodo } from '../text';
import { localizedPath } from '../i18n/paths';
import type { TerminalCert, TerminalData, TerminalExperience, TerminalProject } from './types';

interface Ordered {
  order?: number | undefined;
}

export interface TerminalContent {
  locale: Locale;
  /**
   * Development build: `TODO(autor)` placeholders stay visible so the author can spot them.
   * Anything else (the default) hides them, matching the rest of the site (gate G1).
   */
  isDev?: boolean;
  profile: {
    name: string;
    brand: string;
    headline: string;
    whoami: string;
    /** `whatsapp` arrives as `unknown`: the schema's optional-text preprocess erases its type. */
    contact: { email: string; linkedin: string; whatsapp?: unknown };
  };
  experience: {
    data: Ordered & {
      role: string;
      company: string;
      location: string;
      start: string;
      end: string;
      achievements: string;
    };
  }[];
  projects: {
    slug: string;
    data: Ordered & {
      title: string;
      summary: string;
      context: string;
      challenge: string;
      role: string;
      decisions: string;
      result: string;
      stack: readonly unknown[];
      published: boolean;
    };
  }[];
  stackCatalog: (StackCatalogEntry & {
    data: Ordered & { name: string; cluster: (typeof CLUSTERS)[number] };
  })[];
  certifications: {
    data: Ordered & {
      kind: string;
      name: string;
      issuer: string;
      year: number;
      status: string;
      credentialUrl?: unknown;
    };
  }[];
  media: Partial<Record<Locale, { cv?: unknown } | undefined>>;
}

const asText = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/** Keeps placeholder items in development and drops them in production (gate G1). */
function visible<T>(items: readonly T[], textsOf: (item: T) => readonly unknown[], isDev: boolean) {
  return withTodoVisibility(items, textsOf, isDev).map(({ item }) => item);
}

/** A list field (bullets) loses only its placeholder entries; the rest of the item stays. */
function visibleBullets(markdown: string, isDev: boolean): string[] {
  return parseBulletList(markdown).filter((bullet) => isDev || !isTodo(bullet));
}

/** An optional detail field disappears when it is a placeholder in production. */
function visibleText(value: string, isDev: boolean): string | undefined {
  return isDev || !isTodo(value) ? value : undefined;
}

function buildExperience(content: TerminalContent): TerminalExperience[] {
  const { locale, isDev = false } = content;
  const present = t(locale, 'labels.present');
  // `order` 1 is the most recent role in the content model.
  return visible(
    sortByOrder(content.experience),
    ({ data }) => [data.role, data.company, data.location],
    isDev,
  ).map(({ data }) => ({
    role: data.role,
    company: data.company,
    location: data.location,
    period: formatPeriod(data.start, data.end, locale, present),
    achievements: visibleBullets(data.achievements, isDev),
  }));
}

function buildProjects(content: TerminalContent): TerminalProject[] {
  const { isDev = false } = content;
  return visible(
    sortByOrder(content.projects.filter(({ data }) => data.published)),
    ({ data }) => [data.title, data.summary],
    isDev,
  ).map(({ slug, data }) => {
    const optional = {
      context: visibleText(data.context, isDev),
      challenge: visibleText(data.challenge, isDev),
      role: visibleText(data.role, isDev),
      result: visibleText(data.result, isDev),
    };
    return {
      id: slug,
      title: data.title,
      summary: data.summary,
      stack: resolveStackNames(data.stack, content.stackCatalog),
      // Absent keys, not `undefined` values: the data stays serializable and exact-optional safe.
      ...Object.fromEntries(Object.entries(optional).filter(([, value]) => value !== undefined)),
      decisions: visibleBullets(data.decisions, isDev),
    };
  });
}

function buildStack(content: TerminalContent): TerminalData['stack'] {
  const catalog = sortByOrder(content.stackCatalog);
  return CLUSTERS.flatMap((cluster) => {
    const items = catalog
      .filter(({ data }) => data.cluster === cluster)
      .map(({ data }) => data.name);
    return items.length > 0 ? [{ cluster: t(content.locale, `clusters.${cluster}`), items }] : [];
  });
}

function buildCerts(content: TerminalContent): TerminalCert[] {
  return visible(
    sortByOrder(content.certifications),
    ({ data }) => [data.name, data.issuer],
    content.isDev ?? false,
  ).map(({ data }) => {
    const url = asText(data.credentialUrl);
    return {
      name: data.name,
      issuer: data.issuer,
      kind: data.kind,
      year: data.year,
      ...(url === undefined ? {} : { url }),
      inProgress: data.status === 'in-progress',
    };
  });
}

export function buildTerminalData(content: TerminalContent): TerminalData {
  const { locale, profile, isDev = false } = content;
  const other = LOCALES.find((candidate) => candidate !== locale) ?? locale;
  const experience = buildExperience(content);
  const whatsapp = asText(profile.contact.whatsapp);
  const cv = resolveCv(
    Object.fromEntries(LOCALES.map((l) => [l, { cv: asText(content.media[l]?.cv) }] as const)),
    locale,
  );

  return {
    locale,
    prompt: profile.brand.toLowerCase(),
    // A placeholder whoami would print the author's TODO; the headline is real content.
    whoami: isDev || !isTodo(profile.whoami) ? profile.whoami : profile.headline,
    name: profile.name,
    headline: profile.headline,
    experience,
    projects: buildProjects(content),
    stack: buildStack(content),
    certs: buildCerts(content),
    contact: {
      email: profile.contact.email,
      linkedin: profile.contact.linkedin,
      ...(whatsapp === undefined ? {} : { whatsapp }),
    },
    cvUrl: cv?.href ?? null,
    cvFallback: cv?.isFallback ?? false,
    altLocale: { locale: other, path: localizedPath(other) },
    anchors: { experience: experience.length > 0, contact: true },
  };
}
