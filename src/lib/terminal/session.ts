// External store for one terminal: transcript, draft, history and the intro animation.
// No React, no DOM: views bind through `subscribe`/`getSnapshot` (useSyncExternalStore) and the
// same session survives swapping the 2D frame for the 3D monitor view.
import { complete as completeDraft } from './complete';
import { runCommand } from './commands';
import { createHistory, historyNext, historyPrev, recordEntry } from './history';
import type { Effect, Line, TerminalData, TerminalLabels, TerminalState } from './types';

/** Delay between typed characters of the intro command. */
export const INTRO_CHAR_DELAY_MS = 70;
/** Pause after the last typed character, before the output appears. */
export const INTRO_SETTLE_MS = 300;

/** The intro prints this command, exactly as a visitor could type it. */
const INTRO_COMMAND = 'whoami';

/** Injected timer functions so the intro is deterministic under test. */
export interface Scheduler {
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

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
  /** Plays the intro once per session; `animate: false` only marks it as played. */
  playIntro(options: { animate: boolean }): void;
  /** A keypress during the intro: jump to the finished state. */
  skipIntro(): void;
}

type IntroPhase = 'pending' | 'playing' | 'done';

const defaultScheduler: Scheduler = {
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function createTerminalSession(
  data: TerminalData,
  labels: TerminalLabels,
  scheduler: Scheduler = defaultScheduler,
): TerminalSession {
  const context = { data, labels };
  const introLines = runCommand(INTRO_COMMAND, context).lines;
  const introEntry = { id: 0, input: INTRO_COMMAND, lines: introLines };
  let nextId = 1;
  let introPhase: IntroPhase = 'pending';
  let timer: unknown = null;

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

  function stopTimer(): void {
    if (timer !== null) scheduler.clearTimeout(timer);
    timer = null;
  }

  function finishIntro(): void {
    if (introPhase === 'done') return;
    const wasPlaying = introPhase === 'playing';
    introPhase = 'done';
    stopTimer();
    if (wasPlaying) {
      set({ ...state, transcript: [introEntry], typing: null, activeWindow: INTRO_COMMAND });
    }
  }

  function typeNext(index: number): void {
    if (index < INTRO_COMMAND.length) {
      timer = scheduler.setTimeout(() => {
        set({ ...state, typing: { text: INTRO_COMMAND, index: index + 1 } });
        typeNext(index + 1);
      }, INTRO_CHAR_DELAY_MS);
      return;
    }
    timer = scheduler.setTimeout(finishIntro, INTRO_SETTLE_MS);
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
      finishIntro();
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
      finishIntro();
      if (value === state.draft && state.history.cursor === null) return;
      // Typing ends history browsing; the next Up saves the new draft.
      set({ ...state, draft: value, history: { ...state.history, cursor: null, draft: '' } });
    },

    historyPrev() {
      finishIntro();
      const step = historyPrev(state.history, state.draft);
      if (step.input === null) return;
      set({ ...state, draft: step.input, history: step.history });
    },

    historyNext() {
      finishIntro();
      const step = historyNext(state.history);
      if (step.input === null) return;
      set({ ...state, draft: step.input, history: step.history });
    },

    complete() {
      finishIntro();
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
      finishIntro();
      set({ ...state, transcript: [] });
    },

    abandon() {
      finishIntro();
      set({
        ...state,
        transcript: append(`${state.draft}^C`, []),
        draft: '',
        history: { ...state.history, cursor: null, draft: '' },
      });
    },

    playIntro({ animate }) {
      if (introPhase !== 'pending') return;
      if (!animate || state.history.entries.length > 0 || state.draft !== '') {
        introPhase = 'done';
        return;
      }
      introPhase = 'playing';
      set({
        ...state,
        transcript: [],
        typing: { text: INTRO_COMMAND, index: 0 },
        activeWindow: null,
      });
      typeNext(0);
    },

    skipIntro: finishIntro,
  };
}
