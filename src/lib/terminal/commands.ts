// Command table: turns one input line into printable lines plus UI effects.
// Pure: every string comes from `TerminalData` (content) or `TerminalLabels` (chrome).
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
const blank = (): Line => [seg('')];
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
  const lines = data.experience.flatMap((entry, index): Line[] => {
    const meta = [entry.location, entry.period].filter((part) => part !== undefined && part !== '');
    return [
      ...(index > 0 ? [blank()] : []),
      [seg(entry.role, 'amber'), seg(` @ ${entry.company}`)],
      plain(meta.join(' · '), 'muted'),
      ...entry.achievements.map((achievement) => plain(`  - ${achievement}`)),
    ];
  });
  const effects: CommandResult['effects'] = data.anchors.experience
    ? [{ kind: 'scroll', section: 'experience' }]
    : [];
  return result(lines, 'experience', effects);
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
    case 'ask':
      return ask(context);
    case 'clear':
      return clear();
    default:
      return unknown(context, input.trim().split(/\s+/).join(' '), parsed.name);
  }
}
