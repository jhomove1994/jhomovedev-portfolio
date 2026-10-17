// Turns a raw input line into a normalized command. Pure: no DOM, no framework.

export interface ParsedInput {
  /** Lowercased command name; `sudo hire-me` is the one two-word command. */
  name: string;
  args: string[];
  /** False when the name is not a command the terminal can run. */
  known: boolean;
}

const COMMANDS = [
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
];
const EASTER_EGG = 'sudo hire-me';

/** `ask` forwards free text, so its arguments keep their original case. */
const CASE_SENSITIVE_ARGS = new Set(['ask']);

export function parseInput(raw: string): ParsedInput | null {
  const words = raw.trim().split(/\s+/).filter(Boolean);
  const [first, ...rest] = words;
  if (first === undefined) return null;

  const name = first.toLowerCase();

  if (name === 'sudo' && rest.length === 1 && rest[0]!.toLowerCase() === 'hire-me') {
    return { name: EASTER_EGG, args: [], known: true };
  }

  const args = CASE_SENSITIVE_ARGS.has(name) ? rest : rest.map((word) => word.toLowerCase());
  return { name, args, known: COMMANDS.includes(name) };
}
