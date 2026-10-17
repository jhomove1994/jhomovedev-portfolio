// Tab completion over command names and the arguments of `projects` and `lang`.
// Pure: no DOM, no framework.
import { LOCALES, type Locale } from '../../i18n/locales';
import { COMMAND_NAMES } from './types';

export interface CompletionContext {
  /** Published project ids only. */
  projectIds: string[];
  /** Current page locale: `lang <current>` is a no-op, so it is not offered. */
  locale: Locale;
}

export type Completion =
  /** Empty draft: the caller lets Tab move focus (no focus trap). */
  | { outcome: 'focus' }
  /** Nothing matches: the caller lets Tab move focus. */
  | { outcome: 'unchanged' }
  /** A unique match, or the common prefix of several. */
  | { outcome: 'completed'; value: string }
  /** Several matches without a longer common prefix; `candidates` are runnable commands. */
  | { outcome: 'candidates'; value: string; candidates: string[] };

function commonPrefix(words: string[]): string {
  return words.reduce((prefix, word) => {
    let end = 0;
    while (end < prefix.length && prefix[end] === word[end]) end += 1;
    return prefix.slice(0, end);
  });
}

/** Completes `typed` against `options`; `lead` is the unchanged text before the typed word. */
function completeWord(lead: string, typed: string, options: readonly string[]): Completion {
  const word = typed.toLowerCase();
  const matches = options.filter((option) => option.startsWith(word));
  if (matches.length === 0) return { outcome: 'unchanged' };

  const prefix = commonPrefix(matches);
  if (matches.length === 1 || prefix.length > word.length) {
    return { outcome: 'completed', value: `${lead}${prefix}` };
  }
  return {
    outcome: 'candidates',
    value: `${lead}${word}`,
    candidates: matches.map((match) => `${lead}${match}`),
  };
}

export function complete(draft: string, context: CompletionContext): Completion {
  if (draft.trim() === '') return { outcome: 'focus' };

  const name = /^\s*(\S*)$/.exec(draft);
  if (name) return completeWord('', name[1]!, COMMAND_NAMES);

  const argument = /^\s*(\S+)\s+(\S*)$/.exec(draft);
  if (!argument) return { outcome: 'unchanged' };

  const command = argument[1]!.toLowerCase();
  if (command === 'projects') {
    return completeWord('projects ', argument[2]!, context.projectIds);
  }
  if (command === 'lang') {
    const others = LOCALES.filter((locale) => locale !== context.locale);
    return completeWord('lang ', argument[2]!, others);
  }
  return { outcome: 'unchanged' };
}
