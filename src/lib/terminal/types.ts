// Shared contracts of the pure terminal engine, plus the single command-name list.
// No logic, no DOM, no framework.
import type { Locale } from '../../i18n/locales';
import type { CERTIFICATION_KINDS } from '../content/schemas';

/** Commands the terminal advertises in `help`. The `sudo hire-me` easter egg is not one of them. */
export const COMMAND_NAMES = [
  'help',
  'whoami',
  'experience',
  'projects',
  'stack',
  'certs',
  'contact',
  'cv',
  'lang',
  'ask',
  'clear',
] as const;

export type CommandName = (typeof COMMAND_NAMES)[number];

export type Tone = 'fg' | 'muted' | 'amber' | 'error' | 'accent';

/**
 * One styled run of text. `href` renders an anchor, `run` renders a button that submits the
 * given command exactly as if it had been typed (clickable suggestions).
 */
export interface Segment {
  text: string;
  tone?: Tone;
  href?: string;
  run?: string;
}

export type Line = Segment[];

export type Effect =
  | { kind: 'navigate'; href: string }
  | { kind: 'download'; href: string }
  | { kind: 'scroll'; section: 'experience' | 'contact' }
  | { kind: 'clear' };

export interface CommandResult {
  lines: Line[];
  effects: Effect[];
  /** tmux window highlighted after the command ran. */
  window?: CommandName;
}

export interface HistoryState {
  /** Submitted commands, oldest first. */
  entries: string[];
  /** Index into `entries` while browsing, `null` when the user is on the draft. */
  cursor: number | null;
  /** Text typed before the user started browsing, restored when browsing ends. */
  draft: string;
}

export interface TerminalState {
  transcript: { id: number; input?: string; lines: Line[] }[];
  draft: string;
  history: HistoryState;
  activeWindow: CommandName | null;
  typing: { text: string; index: number } | null;
}

export interface TerminalExperience {
  role: string;
  company: string;
  location?: string;
  period: string;
  achievements: string[];
}

export interface TerminalProject {
  id: string;
  title: string;
  summary: string;
  stack: string[];
  context?: string;
  challenge?: string;
  role?: string;
  decisions?: string[];
  result?: string;
}

export interface TerminalCert {
  name: string;
  issuer: string;
  kind: string;
  year?: number;
  url?: string;
  inProgress: boolean;
}

/** Serializable snapshot of the portfolio content the terminal prints. Built from content queries. */
export interface TerminalData {
  locale: Locale;
  prompt: string;
  whoami: string;
  name: string;
  headline: string;
  experience: TerminalExperience[];
  /** Published projects only. */
  projects: TerminalProject[];
  stack: { cluster: string; items: string[] }[];
  certs: TerminalCert[];
  contact: { email: string; linkedin: string; whatsapp?: string };
  cvUrl: string | null;
  /** True when the CV shown is the Spanish one because the locale has none. */
  cvFallback: boolean;
  altLocale: { locale: Locale; path: string };
  anchors: { experience: boolean; contact: boolean };
}

/**
 * Localized chrome strings (command descriptions, errors, usage, empty states, accessible names).
 * Templates use `{name}` placeholders filled by the command engine. Never portfolio content.
 */
export interface TerminalLabels {
  logLabel: string;
  inputLabel: string;
  windowsLabel: string;
  /** One-line description per advertised command, shown by `help`. */
  commands: Record<CommandName, string>;
  helpIntro: string;
  /** Muted closing line of `help` that hints at the `sudo hire-me` easter egg. */
  helpHint: string;
  /** `{input}` is the text the user typed. */
  commandNotFound: string;
  didYouMean: string;
  tryHelp: string;
  experienceEmpty: string;
  projectsEmpty: string;
  projectsHint: string;
  /** `{id}` is the requested project id. */
  projectNotFound: string;
  projectContext: string;
  projectChallenge: string;
  projectRole: string;
  projectDecisions: string;
  projectResult: string;
  projectStack: string;
  stackEmpty: string;
  certsEmpty: string;
  certKinds: Record<(typeof CERTIFICATION_KINDS)[number], string>;
  certInProgress: string;
  contactEmail: string;
  contactProfile: string;
  /** Omitted from the props shipped to the browser while the contact has no WhatsApp link. */
  contactWhatsapp?: string;
  cvLabel: string;
  cvSpanishSuffix: string;
  cvMissing: string;
  langUsage: string;
  langSame: string;
  langSwitching: string;
  askStub: string;
  sudoHireMe: string;
}
