// Pure keyboard model of the terminal input (spec S5). The view maps a DOM key event to a
// `KeyInput`, asks `decideKey` what to do and carries the action out. No DOM, no framework.

export interface KeyInput {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

export interface KeyState {
  draft: string;
  /** Text is selected inside the input, so Ctrl+C must stay a native copy. */
  hasSelection: boolean;
  /** An input method (IME) composition is in progress. */
  composing: boolean;
}

/**
 * `complete` means "try the session completion": when nothing can be completed the view must
 * let Tab move focus natively, so the keyboard is never trapped.
 */
export type KeyAction =
  | { kind: 'submit' }
  | { kind: 'history-prev' }
  | { kind: 'history-next' }
  | { kind: 'complete' }
  | { kind: 'blur' }
  | { kind: 'clear' }
  | { kind: 'abandon' }
  | { kind: 'pass' };

const PASS: KeyAction = { kind: 'pass' };

function plain(input: KeyInput): boolean {
  return !input.ctrl && !input.shift && !input.alt && !input.meta;
}

export function decideKey(input: KeyInput, state: KeyState): KeyAction {
  if (state.composing) return PASS;

  switch (input.key) {
    case 'Enter':
      return { kind: 'submit' };
    case 'ArrowUp':
      return plain(input) ? { kind: 'history-prev' } : PASS;
    case 'ArrowDown':
      return plain(input) ? { kind: 'history-next' } : PASS;
    case 'Tab':
      return !input.shift && state.draft.trim() !== '' ? { kind: 'complete' } : PASS;
    case 'Escape':
      return { kind: 'blur' };
    default:
      break;
  }

  if (input.ctrl && !input.meta && !input.alt) {
    const key = input.key.toLowerCase();
    if (key === 'l') return { kind: 'clear' };
    if (key === 'c' && !state.hasSelection) return { kind: 'abandon' };
  }
  return PASS;
}
