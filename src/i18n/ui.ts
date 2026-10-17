import type { CERTIFICATION_KINDS, CLUSTERS } from '../lib/content/schemas';
import type { TerminalLabels } from '../lib/terminal/types';
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
    sendEmail: string;
    copy: string;
    copied: string;
  };
  aria: {
    skipToContent: string;
    mainNavigation: string;
    languageSwitcher: string;
    copyEmail: string;
    stack: string;
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
  terminal: TerminalLabels;
  /** Hero chrome: mode toggle, still image alt text, boot loader. */
  hero: {
    toggleEnable3d: string;
    toggleDisable3d: string;
    stillAlt: string;
    bootLoading: string;
    bootReady: string;
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
      sendEmail: 'Escríbeme',
      copy: 'Copiar',
      copied: 'Copiado',
    },
    aria: {
      skipToContent: 'Saltar al contenido',
      mainNavigation: 'Navegación principal',
      languageSwitcher: 'Cambiar idioma',
      copyEmail: 'Copiar el correo electrónico',
      stack: 'Tecnologías',
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
    terminal: {
      logLabel: 'Salida de la terminal',
      inputLabel: 'Escribe un comando',
      windowsLabel: 'Comandos de la terminal',
      commands: {
        help: 'lista los comandos disponibles',
        whoami: 'quién soy en pocas líneas',
        experience: 'mi trayectoria profesional',
        projects: 'casos de proyectos publicados',
        stack: 'tecnologías agrupadas por área',
        certs: 'certificaciones y formación',
        contact: 'cómo escribirme',
        cv: 'descarga mi CV',
        lang: 'cambia el idioma: lang es|en',
        ask: 'pregúntale al asistente',
        clear: 'limpia la pantalla',
      },
      helpIntro: 'Comandos disponibles:',
      helpHint: 'psst… prueba',
      commandNotFound: 'comando no encontrado: {input}',
      didYouMean: '¿Quisiste decir',
      tryHelp: 'Prueba',
      experienceEmpty: 'Aún no hay experiencia publicada.',
      projectsEmpty: 'Todavía no hay proyectos publicados. Mientras tanto, escríbeme:',
      projectsHint: 'Usa projects <id> para ver el detalle.',
      projectNotFound: 'proyecto no encontrado: {id}',
      projectContext: 'Contexto',
      projectChallenge: 'Reto',
      projectRole: 'Mi rol',
      projectDecisions: 'Decisiones',
      projectResult: 'Resultado',
      projectStack: 'Stack',
      stackEmpty: 'Aún no hay tecnologías publicadas.',
      certsEmpty: 'Aún no hay certificaciones publicadas.',
      certKinds: {
        certification: 'Certificaciones',
        education: 'Educación',
        training: 'Cursos',
      },
      certInProgress: 'en curso',
      contactEmail: 'Correo',
      contactProfile: 'Perfil',
      contactWhatsapp: 'WhatsApp',
      cvLabel: 'Descargar CV',
      cvSpanishSuffix: '(Español)',
      cvMissing: 'Todavía no hay un CV disponible.',
      langUsage: 'uso: lang es|en',
      langSame: 'Ya estás viendo el sitio en español.',
      langSwitching: 'Cambiando de idioma…',
      askStub: 'El asistente llegará pronto. Por ahora, prueba help.',
      sudoHireMe: 'Buena decisión. Así me encuentras:',
    },
    hero: {
      toggleEnable3d: 'Activar 3D',
      toggleDisable3d: 'Desactivar 3D',
      stillAlt: 'Un escritorio de madera de noche con un monitor que muestra una terminal',
      bootLoading: 'cargando el escritorio…',
      bootReady: 'listo',
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
      sendEmail: 'Email me',
      copy: 'Copy',
      copied: 'Copied',
    },
    aria: {
      skipToContent: 'Skip to content',
      mainNavigation: 'Main navigation',
      languageSwitcher: 'Change language',
      copyEmail: 'Copy email address',
      stack: 'Technologies',
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
    terminal: {
      logLabel: 'Terminal output',
      inputLabel: 'Type a command',
      windowsLabel: 'Terminal commands',
      commands: {
        help: 'list the available commands',
        whoami: 'who I am in a few lines',
        experience: 'my professional background',
        projects: 'published project case studies',
        stack: 'technologies grouped by area',
        certs: 'certifications and training',
        contact: 'how to reach me',
        cv: 'download my CV',
        lang: 'switch language: lang es|en',
        ask: 'ask the assistant',
        clear: 'clear the screen',
      },
      helpIntro: 'Available commands:',
      helpHint: 'psst… try',
      commandNotFound: 'command not found: {input}',
      didYouMean: 'Did you mean',
      tryHelp: 'Try',
      experienceEmpty: 'No experience published yet.',
      projectsEmpty: 'No projects are published yet. In the meantime, get in touch:',
      projectsHint: 'Use projects <id> for the details.',
      projectNotFound: 'project not found: {id}',
      projectContext: 'Context',
      projectChallenge: 'Challenge',
      projectRole: 'My role',
      projectDecisions: 'Decisions',
      projectResult: 'Result',
      projectStack: 'Stack',
      stackEmpty: 'No technologies published yet.',
      certsEmpty: 'No certifications published yet.',
      certKinds: {
        certification: 'Certifications',
        education: 'Education',
        training: 'Courses',
      },
      certInProgress: 'in progress',
      contactEmail: 'Email',
      contactProfile: 'Profile',
      contactWhatsapp: 'WhatsApp',
      cvLabel: 'Download CV',
      cvSpanishSuffix: '(Spanish)',
      cvMissing: 'No CV is available yet.',
      langUsage: 'usage: lang es|en',
      langSame: 'You are already viewing the site in English.',
      langSwitching: 'Switching language…',
      askStub: 'The assistant is coming soon. For now, try help.',
      sudoHireMe: 'Good call. Here is how to find me:',
    },
    hero: {
      toggleEnable3d: 'Enable 3D',
      toggleDisable3d: 'Disable 3D',
      stillAlt: 'A wooden desk at night with a monitor showing a terminal',
      bootLoading: 'loading the desk…',
      bootReady: 'ready',
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

/** Terminal chrome for `locale`; any missing key falls back to the default locale (es). */
export function terminalLabels(locale: Locale): TerminalLabels {
  const base = ui[DEFAULT_LOCALE].terminal;
  const own = ui[locale].terminal;
  return {
    ...base,
    ...own,
    commands: { ...base.commands, ...own.commands },
    certKinds: { ...base.certKinds, ...own.certKinds },
  };
}
