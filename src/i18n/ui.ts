import type { CERTIFICATION_KINDS, CLUSTERS } from '../lib/content/schemas';
import { DEFAULT_LOCALE, type Locale } from './locales';

/**
 * UI chrome strings only (navigation, buttons, aria labels, short labels). Portfolio facts such as
 * bio, experience, stack items and links live in `src/content/` and must never be added here.
 */
export interface UiDict {
  nav: {
    about: string;
    pathToTechLead: string;
    experience: string;
    certifications: string;
    contact: string;
  };
  buttons: {
    downloadCv: string;
    copy: string;
    copied: string;
  };
  aria: {
    skipToContent: string;
    mainNavigation: string;
    languageSwitcher: string;
    copyEmail: string;
  };
  clusters: Record<(typeof CLUSTERS)[number] | 'languages' | 'tools', string>;
  certificationKinds: Record<(typeof CERTIFICATION_KINDS)[number], string>;
  labels: {
    spanishSuffix: string;
    present: string;
    inProgress: string;
    email: string;
    remote: string;
    fallbackBadge: string;
  };
  /** Language names, each written in its own language so they read the same on every page. */
  localeNames: Record<Locale, string>;
  notFound: {
    title: string;
    hint: string;
  };
}

export const ui = {
  es: {
    nav: {
      about: 'Sobre mí',
      pathToTechLead: 'Camino a Tech Lead',
      experience: 'Experiencia',
      certifications: 'Certificaciones',
      contact: 'Contacto',
    },
    buttons: {
      downloadCv: 'Descargar CV',
      copy: 'Copiar',
      copied: 'Copiado',
    },
    aria: {
      skipToContent: 'Saltar al contenido',
      mainNavigation: 'Navegación principal',
      languageSwitcher: 'Cambiar idioma',
      copyEmail: 'Copiar el correo electrónico',
    },
    clusters: {
      frontend: 'Frontend',
      backend: 'Backend',
      'aws-serverless': 'AWS y serverless',
      data: 'Datos',
      'devops-iac': 'DevOps e IaC',
      ai: 'IA',
      languages: 'Lenguajes',
      tools: 'Herramientas',
    },
    certificationKinds: {
      certification: 'Certificación',
      education: 'Educación',
      training: 'Curso',
    },
    labels: {
      spanishSuffix: '(Español)',
      present: 'Actualidad',
      inProgress: 'En curso',
      email: 'Correo',
      remote: 'Trabajo en remoto',
      fallbackBadge: 'Sin traducción',
    },
    localeNames: { es: 'Español', en: 'English' },
    notFound: {
      title: 'Página no encontrada',
      hint: 'Elige un idioma para volver al inicio.',
    },
  },
  en: {
    nav: {
      about: 'About',
      pathToTechLead: 'Path to Tech Lead',
      experience: 'Experience',
      certifications: 'Certifications',
      contact: 'Contact',
    },
    buttons: {
      downloadCv: 'Download CV',
      copy: 'Copy',
      copied: 'Copied',
    },
    aria: {
      skipToContent: 'Skip to content',
      mainNavigation: 'Main navigation',
      languageSwitcher: 'Change language',
      copyEmail: 'Copy email address',
    },
    clusters: {
      frontend: 'Frontend',
      backend: 'Backend',
      'aws-serverless': 'AWS & serverless',
      data: 'Data',
      'devops-iac': 'DevOps & IaC',
      ai: 'AI',
      languages: 'Languages',
      tools: 'Tools',
    },
    certificationKinds: {
      certification: 'Certification',
      education: 'Education',
      training: 'Course',
    },
    labels: {
      spanishSuffix: '(Spanish)',
      present: 'Present',
      inProgress: 'In progress',
      email: 'Email',
      remote: 'Remote',
      fallbackBadge: 'Spanish fallback',
    },
    localeNames: { es: 'Español', en: 'English' },
    notFound: {
      title: 'Page not found',
      hint: 'Choose a language to go back to the home page.',
    },
  },
} satisfies Record<Locale, UiDict>;

type Path<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Path<T[K]>}`;
}[keyof T & string];

/** Dotted path to a string leaf, e.g. `nav.about` or `clusters.aws-serverless`. */
export type UiKey = Path<UiDict>;

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** UI string for `locale`; a missing translation falls back to the default locale (es). */
export function t(locale: Locale, key: UiKey): string {
  const value = lookup(ui[locale], key) ?? lookup(ui[DEFAULT_LOCALE], key);
  if (value === undefined) {
    throw new Error(`Unknown UI key "${key}"`);
  }
  return value;
}
