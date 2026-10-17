// Command table: turns one input line into printable lines plus UI effects.
// Pure: every string comes from `TerminalData` (content) or `TerminalLabels` (chrome).
import { safeHref } from './href';
import { parseInput } from './parser';
import { suggestCommand } from './suggest';
import {
  COMMAND_NAMES,
  type CommandName,
  type CommandResult,
  type Line,
  type Segment,
  type TerminalData,
  type TerminalLabels,
  type TerminalProject,
  type Tone,
} from './types';

export interface CommandContext {
  data: TerminalData;
  labels: TerminalLabels;
}

// Line builders -------------------------------------------------------------------------------

const seg = (text: string, tone?: Tone): Segment =>
  tone === undefined ? { text } : { text, tone };
const plain = (text: string, tone?: Tone): Line => [seg(text, tone)];
/** Joins blocks of lines with one blank line between them. */
const separated = (blocks: Line[][]): Line[] =>
  blocks.flatMap((block, index) => (index === 0 ? block : [[seg('')], ...block]));
/** A segment that runs `command` when activated, exactly as if it had been typed. */
const runSeg = (text: string, command: string): Segment => ({ text, tone: 'amber', run: command });

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

function result(
  lines: Line[],
  window?: CommandName,
  effects: CommandResult['effects'] = [],
): CommandResult {
  return window === undefined ? { lines, effects } : { lines, effects, window };
}

// Commands ------------------------------------------------------------------------------------

function help({ labels }: CommandContext): CommandResult {
  return result(
    [
      plain(labels.helpIntro, 'muted'),
      ...COMMAND_NAMES.map((name): Line => [
        runSeg(name, name),
        seg(`  ${labels.commands[name]}`, 'muted'),
      ]),
    ],
    'help',
  );
}

function whoami({ data }: CommandContext): CommandResult {
  return result([plain(data.whoami)], 'whoami');
}

function experience({ data, labels }: CommandContext): CommandResult {
  if (data.experience.length === 0)
    return result([plain(labels.experienceEmpty, 'muted')], 'experience');
  const lines = separated(
    data.experience.map((entry): Line[] => {
      const meta = [entry.location, entry.period].filter(
        (part) => part !== undefined && part !== '',
      );
      return [
        [seg(entry.role, 'amber'), seg(` @ ${entry.company}`)],
        plain(meta.join(' · '), 'muted'),
        ...entry.achievements.map((achievement) => plain(`  - ${achievement}`)),
      ];
    }),
  );
  const effects: CommandResult['effects'] = data.anchors.experience
    ? [{ kind: 'scroll', section: 'experience' }]
    : [];
  return result(lines, 'experience', effects);
}

function projectList(data: TerminalData, labels: TerminalLabels): Line[] {
  return [
    ...data.projects.flatMap((project): Line[] => [
      [runSeg(project.id, `projects ${project.id}`), seg(` - ${project.title}`)],
      plain(`  ${project.summary}`, 'muted'),
    ]),
    plain(labels.projectsHint, 'muted'),
  ];
}

function projectDetail(project: TerminalProject, labels: TerminalLabels): Line[] {
  const field = (label: string, value: string | undefined): Line[] =>
    value === undefined || value === '' ? [] : [[seg(`${label}: `, 'amber'), seg(value)]];
  return [
    plain(project.title, 'amber'),
    plain(project.summary, 'muted'),
    ...field(labels.projectContext, project.context),
    ...field(labels.projectChallenge, project.challenge),
    ...field(labels.projectRole, project.role),
    ...(project.decisions && project.decisions.length > 0
      ? [
          plain(`${labels.projectDecisions}:`, 'amber'),
          ...project.decisions.map((decision) => plain(`  - ${decision}`)),
        ]
      : []),
    ...field(labels.projectResult, project.result),
    ...field(labels.projectStack, project.stack.join(', ')),
  ];
}

function projects({ data, labels }: CommandContext, args: string[]): CommandResult {
  if (data.projects.length === 0) {
    return result(
      [plain(labels.projectsEmpty, 'muted'), [runSeg('contact', 'contact')]],
      'projects',
    );
  }
  const id = args[0];
  if (id === undefined) return result(projectList(data, labels), 'projects');
  const project = data.projects.find((candidate) => candidate.id.toLowerCase() === id);
  if (project === undefined) {
    return result(
      [plain(fill(labels.projectNotFound, { id }), 'error'), ...projectList(data, labels)],
      'projects',
    );
  }
  return result(projectDetail(project, labels), 'projects');
}

function lang({ data, labels }: CommandContext, args: string[]): CommandResult {
  const target = args.length === 1 ? args[0] : undefined;
  if (target === undefined || (target !== data.locale && target !== data.altLocale.locale)) {
    return result([plain(labels.langUsage, 'error')], 'lang');
  }
  if (target === data.locale) return result([plain(labels.langSame, 'muted')], 'lang');
  return result([plain(labels.langSwitching, 'muted')], 'lang', [
    { kind: 'navigate', href: data.altLocale.path },
  ]);
}

function stack({ data, labels }: CommandContext): CommandResult {
  const clusters = data.stack.filter((cluster) => cluster.items.length > 0);
  if (clusters.length === 0) return result([plain(labels.stackEmpty, 'muted')], 'stack');
  const lines = separated(
    clusters.map((cluster): Line[] => [
      plain(cluster.cluster, 'amber'),
      plain(`  ${cluster.items.join(', ')}`),
    ]),
  );
  return result(lines, 'stack');
}

function certs({ data, labels }: CommandContext): CommandResult {
  if (data.certs.length === 0) return result([plain(labels.certsEmpty, 'muted')], 'certs');
  const kinds = [...new Set(data.certs.map((cert) => cert.kind))];
  const lines = separated(
    kinds.map((kind): Line[] => {
      const heading = labels.certKinds[kind as keyof TerminalLabels['certKinds']] ?? kind;
      const entries = data.certs
        .filter((cert) => cert.kind === kind)
        .map((cert): Line => {
          const href = cert.url === undefined ? null : safeHref(cert.url);
          const name: Segment = href === null ? seg(cert.name) : { text: cert.name, href };
          const year = cert.year === undefined ? '' : ` (${cert.year})`;
          return [
            seg('  '),
            name,
            seg(` - ${cert.issuer}${year}`, 'muted'),
            ...(cert.inProgress ? [seg(` [${labels.certInProgress}]`, 'amber')] : []),
          ];
        });
      return [plain(heading, 'amber'), ...entries];
    }),
  );
  return result(lines, 'certs');
}

const stripProtocol = (url: string): string => url.replace(/^https?:\/\//i, '').replace(/\/$/, '');

/** Email, profile and, only when it is a web link, WhatsApp. A raw phone number is never printed. */
function contactLines({ data, labels }: CommandContext): Line[] {
  const field = (label: string, text: string, href: string | null): Line[] =>
    href === null ? [] : [[seg(`${label}: `, 'amber'), { text, href }]];
  const web = (url: string | undefined): string | null =>
    url !== undefined && /^https?:/i.test(url) ? safeHref(url) : null;
  const { email, linkedin, whatsapp } = data.contact;
  return [
    ...field(labels.contactEmail, email, safeHref(`mailto:${email}`)),
    ...field(labels.contactProfile, stripProtocol(linkedin), web(linkedin)),
    ...(whatsapp === undefined
      ? []
      : field(labels.contactWhatsapp, stripProtocol(whatsapp), web(whatsapp))),
  ];
}

function contact(context: CommandContext): CommandResult {
  return result(contactLines(context), 'contact');
}

function cv({ data, labels }: CommandContext): CommandResult {
  const href = data.cvUrl === null ? null : safeHref(data.cvUrl);
  if (href === null) return result([plain(labels.cvMissing, 'muted')], 'cv');
  const text = data.cvFallback ? `${labels.cvLabel} ${labels.cvSpanishSuffix}` : labels.cvLabel;
  return result([[{ text, href }]], 'cv', [{ kind: 'download', href }]);
}

function sudoHireMe(context: CommandContext): CommandResult {
  const effects: CommandResult['effects'] = context.data.anchors.contact
    ? [{ kind: 'scroll', section: 'contact' }]
    : [];
  return result(
    [plain(context.labels.sudoHireMe, 'amber'), ...contactLines(context)],
    'contact',
    effects,
  );
}

function ask({ labels }: CommandContext): CommandResult {
  return result([plain(labels.askStub, 'muted')], 'ask');
}

function clear(): CommandResult {
  return result([], undefined, [{ kind: 'clear' }]);
}

function unknown({ labels }: CommandContext, input: string, name: string): CommandResult {
  const near = suggestCommand(name);
  return result([
    plain(fill(labels.commandNotFound, { input }), 'error'),
    ...(near === null
      ? []
      : [[seg(`${labels.didYouMean} `, 'muted'), runSeg(near, near), seg('?', 'muted')]]),
    [seg(`${labels.tryHelp} `, 'muted'), runSeg('help', 'help')],
  ]);
}

/** Runs one input line. Empty input yields an empty result; unknown input yields an error. */
export function runCommand(input: string, context: CommandContext): CommandResult {
  const parsed = parseInput(input);
  if (parsed === null) return result([]);

  switch (parsed.name) {
    case 'help':
      return help(context);
    case 'whoami':
      return whoami(context);
    case 'experience':
      return experience(context);
    case 'projects':
      return projects(context, parsed.args);
    case 'lang':
      return lang(context, parsed.args);
    case 'stack':
      return stack(context);
    case 'certs':
      return certs(context);
    case 'contact':
      return contact(context);
    case 'cv':
      return cv(context);
    case 'sudo hire-me':
      return sudoHireMe(context);
    case 'ask':
      return ask(context);
    case 'clear':
      return clear();
    default:
      return unknown(context, input.trim().split(/\s+/).join(' '), parsed.name);
  }
}
