// Pure mapping from plain content objects to the serializable TerminalData the engine prints.
// Takes plain objects (no astro:content), invents nothing, drops unpublished projects.
import type { Locale } from '../../i18n/locales';
import { t } from '../../i18n/ui';
import { sortByOrder } from '../content/filters';
import { parseBulletList } from '../content/markdown-list';
import { formatPeriod } from '../content/period';
import { CLUSTERS } from '../content/schemas';
import { resolveStackNames, type StackCatalogEntry } from '../content/stack-names';
import type { TerminalCert, TerminalData, TerminalExperience, TerminalProject } from './types';

interface Ordered {
  order?: number | undefined;
}

export interface TerminalContent {
  locale: Locale;
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

function buildExperience(content: TerminalContent): TerminalExperience[] {
  const { locale } = content;
  const present = t(locale, 'labels.present');
  // `order` 1 is the most recent role in the content model.
  return sortByOrder(content.experience).map(({ data }) => ({
    role: data.role,
    company: data.company,
    location: data.location,
    period: formatPeriod(data.start, data.end, locale, present),
    achievements: parseBulletList(data.achievements),
  }));
}

function buildProjects(content: TerminalContent): TerminalProject[] {
  return sortByOrder(content.projects.filter(({ data }) => data.published)).map(
    ({ slug, data }) => ({
      id: slug,
      title: data.title,
      summary: data.summary,
      stack: resolveStackNames(data.stack, content.stackCatalog),
      context: data.context,
      challenge: data.challenge,
      role: data.role,
      decisions: parseBulletList(data.decisions),
      result: data.result,
    }),
  );
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
  return sortByOrder(content.certifications).map(({ data }) => {
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

/** The list-shaped sections of the terminal data, mapped from plain content. */
export type TerminalSections = Pick<TerminalData, 'experience' | 'projects' | 'stack' | 'certs'>;

export function buildTerminalSections(content: TerminalContent): TerminalSections {
  return {
    experience: buildExperience(content),
    projects: buildProjects(content),
    stack: buildStack(content),
    certs: buildCerts(content),
  };
}
