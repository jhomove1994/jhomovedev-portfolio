// Immutable command history with Up/Down browsing. Pure: no DOM, no framework.
import type { HistoryState } from './types';

export const HISTORY_LIMIT = 50;

/** `input` is the text the prompt should show, or `null` when it must stay as it is. */
export interface BrowseResult {
  history: HistoryState;
  input: string | null;
}

export function createHistory(): HistoryState {
  return { entries: [], cursor: null, draft: '' };
}

/** Stores a submitted command (trimmed, no empties, consecutive duplicates collapsed, capped). */
export function recordEntry(history: HistoryState, input: string): HistoryState {
  const command = input.trim();
  const last = history.entries.at(-1);
  const entries =
    command === '' || command === last
      ? history.entries
      : [...history.entries, command].slice(-HISTORY_LIMIT);
  return { entries, cursor: null, draft: '' };
}

/** Up: move to the previous entry, remembering what was typed on the first step. */
export function historyPrev(history: HistoryState, currentInput: string): BrowseResult {
  if (history.entries.length === 0) return { history, input: null };

  const cursor =
    history.cursor === null ? history.entries.length - 1 : Math.max(history.cursor - 1, 0);
  const draft = history.cursor === null ? currentInput : history.draft;
  return { history: { ...history, cursor, draft }, input: history.entries[cursor]! };
}

/** Down: move to the next entry, then back to the saved draft past the newest one. */
export function historyNext(history: HistoryState): BrowseResult {
  if (history.cursor === null) return { history, input: null };

  if (history.cursor >= history.entries.length - 1) {
    return { history: { ...history, cursor: null, draft: '' }, input: history.draft };
  }
  const cursor = history.cursor + 1;
  return { history: { ...history, cursor }, input: history.entries[cursor]! };
}
