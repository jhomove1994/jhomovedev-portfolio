// External store for one terminal: transcript, draft and history.
// No React, no DOM: views bind through `subscribe`/`getSnapshot` (useSyncExternalStore) and the
// same session survives swapping the 2D frame for the 3D monitor view.
import { complete as completeDraft } from './complete';
import { runCommand } from './commands';
import { createHistory, historyNext, historyPrev, recordEntry } from './history';
import type { Effect, Line, TerminalData, TerminalLabels, TerminalState } from './types';

/** The finished intro printed at startup is this command, exactly as a visitor could type it. */
const INTRO_COMMAND = 'whoami';

export interface TerminalSession {
  getSnapshot(): TerminalState;
  subscribe(listener: () => void): () => void;
  /** Runs one command line and returns the UI effects the view must carry out. */
  submit(input: string): Effect[];
  setDraft(value: string): void;
  historyPrev(): void;
  historyNext(): void;
  /** `false` means nothing was completed and Tab should move focus. */
  complete(): boolean;
  clear(): void;
  /** Ctrl+C: prints the abandoned draft with `^C` and empties the prompt. */
  abandon(): void;
}

export function createTerminalSession(data: TerminalData, labels: TerminalLabels): TerminalSession {
  const context = { data, labels };
  const introLines = runCommand(INTRO_COMMAND, context).lines;
  const introEntry = { id: 0, input: INTRO_COMMAND, lines: introLines };
  let nextId = 1;

  let state: TerminalState = {
    transcript: [introEntry],
    draft: '',
    history: createHistory(),
    activeWindow: INTRO_COMMAND,
    typing: null,
  };
  const listeners = new Set<() => void>();

  function set(next: TerminalState): void {
    if (next === state) return;
    state = next;
    for (const listener of [...listeners]) listener();
  }

  function append(input: string, lines: Line[]): TerminalState['transcript'] {
    const entry = { id: nextId, input, lines };
    nextId += 1;
    return [...state.transcript, entry];
  }

  return {
    getSnapshot: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    submit(input) {
      const command = input.trim();
      if (command === '') return [];

      const outcome = runCommand(command, context);
      const cleared = outcome.effects.some((effect) => effect.kind === 'clear');
      set({
        ...state,
        transcript: cleared ? [] : append(command, outcome.lines),
        draft: '',
        history: recordEntry(state.history, command),
        activeWindow: outcome.window ?? state.activeWindow,
      });
      return outcome.effects;
    },

    setDraft(value) {
      if (value === state.draft && state.history.cursor === null) return;
      // Typing ends history browsing; the next Up saves the new draft.
      set({ ...state, draft: value, history: { ...state.history, cursor: null, draft: '' } });
    },

    historyPrev() {
      const step = historyPrev(state.history, state.draft);
      if (step.input === null) return;
      set({ ...state, draft: step.input, history: step.history });
    },

    historyNext() {
      const step = historyNext(state.history);
      if (step.input === null) return;
      set({ ...state, draft: step.input, history: step.history });
    },

    complete() {
      const outcome = completeDraft(state.draft, {
        projectIds: data.projects.map((project) => project.id),
        locale: data.locale,
      });
      if (outcome.outcome === 'focus' || outcome.outcome === 'unchanged') return false;

      if (outcome.outcome === 'completed') {
        set({ ...state, draft: outcome.value });
        return true;
      }
      const options: Line = outcome.candidates.flatMap((candidate, index) => [
        ...(index === 0 ? [] : [{ text: '  ' }]),
        { text: candidate, tone: 'amber' as const, run: candidate },
      ]);
      set({ ...state, transcript: append(state.draft, [options]), draft: outcome.value });
      return true;
    },

    clear() {
      set({ ...state, transcript: [] });
    },

    abandon() {
      set({
        ...state,
        transcript: append(`${state.draft}^C`, []),
        draft: '',
        history: { ...state.history, cursor: null, draft: '' },
      });
    },
  };
}
