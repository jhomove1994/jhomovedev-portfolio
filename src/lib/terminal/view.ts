// View-model helpers for the terminal chrome (tmux window list, nvim gutter and statusline).
// Pure: the React components only map these shapes to markup.
import type { Locale } from '../../i18n/locales';
import type { CommandName, Line, TerminalState } from './types';

/**
 * Commands that run without arguments, shown as tmux windows. Each one is a clickable
 * suggestion; `lang` and `ask` need an argument and `clear` leaves no output to show.
 */
export const TMUX_WINDOWS = [
  'help',
  'whoami',
  'experience',
  'projects',
  'stack',
  'certs',
  'contact',
  'cv',
] as const satisfies readonly CommandName[];

export interface TmuxWindow {
  index: number;
  command: (typeof TMUX_WINDOWS)[number];
  active: boolean;
}

export function tmuxWindows(active: CommandName | null): TmuxWindow[] {
  return TMUX_WINDOWS.map((command, index) => ({ index, command, active: command === active }));
}

export interface TranscriptRow {
  /** 1-based line number shown in the gutter. */
  n: number;
  key: string;
  kind: 'input' | 'output';
  input?: string;
  line?: Line;
}

/** Flattens the transcript into numbered rows: the typed command first, then its output lines. */
export function transcriptRows(transcript: TerminalState['transcript']): TranscriptRow[] {
  const rows: TranscriptRow[] = [];
  for (const entry of transcript) {
    if (entry.input !== undefined) {
      rows.push({ n: rows.length + 1, key: `${entry.id}-in`, kind: 'input', input: entry.input });
    }
    entry.lines.forEach((line, index) => {
      rows.push({ n: rows.length + 1, key: `${entry.id}-${index}`, kind: 'output', line });
    });
  }
  return rows;
}

/** Gutter number of the live prompt line, right after the last printed row. */
export function promptLineNumber(rows: readonly TranscriptRow[]): number {
  return (rows.at(-1)?.n ?? 0) + 1;
}

/** Vim shows this when the buffer has no file. */
export const NO_NAME_FILE = '[No Name]';

export interface NvimStatusline {
  mode: 'NORMAL' | 'INSERT';
  file: string;
  encoding: 'utf-8';
  locale: Locale;
  /** `line:column` of the cursor on the prompt. */
  position: string;
}

export function nvimStatusline(
  state: TerminalState,
  view: { focused: boolean; locale: Locale; promptLine: number },
): NvimStatusline {
  return {
    mode: view.focused ? 'INSERT' : 'NORMAL',
    file: state.activeWindow === null ? NO_NAME_FILE : `~/${state.activeWindow}.md`,
    encoding: 'utf-8',
    locale: view.locale,
    position: `${view.promptLine}:${state.draft.length + 1}`,
  };
}
