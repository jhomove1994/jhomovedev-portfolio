import { describe, expect, it } from 'vitest';
import {
  decideKey,
  type KeyAction,
  type KeyInput,
  type KeyState,
} from '../../../src/lib/terminal/keys';

const idle: KeyState = { draft: '', hasSelection: false, composing: false };
const typing: KeyState = { draft: 'wh', hasSelection: false, composing: false };

function press(key: string, modifiers: Partial<KeyInput> = {}, state: KeyState = idle): KeyAction {
  return decideKey({ key, ...modifiers }, state);
}

describe('decideKey: S5 keyboard model', () => {
  it('Enter submits, with or without a draft', () => {
    expect(press('Enter', {}, typing)).toEqual({ kind: 'submit' });
    expect(press('Enter')).toEqual({ kind: 'submit' });
  });

  it('Enter during IME composition is left to the input method', () => {
    expect(press('Enter', {}, { ...typing, composing: true })).toEqual({ kind: 'pass' });
  });

  it('Up and Down browse history only without modifiers', () => {
    expect(press('ArrowUp')).toEqual({ kind: 'history-prev' });
    expect(press('ArrowDown')).toEqual({ kind: 'history-next' });
    expect(press('ArrowUp', { shift: true })).toEqual({ kind: 'pass' });
    expect(press('ArrowDown', { alt: true })).toEqual({ kind: 'pass' });
    expect(press('ArrowUp', { ctrl: true })).toEqual({ kind: 'pass' });
  });

  it('Tab completes only when the draft is non-empty', () => {
    expect(press('Tab', {}, typing)).toEqual({ kind: 'complete' });
    expect(press('Tab', {}, idle)).toEqual({ kind: 'pass' });
    expect(press('Tab', {}, { ...idle, draft: '   ' })).toEqual({ kind: 'pass' });
  });

  it('Shift+Tab always passes through so focus can leave', () => {
    expect(press('Tab', { shift: true }, typing)).toEqual({ kind: 'pass' });
    expect(press('Tab', { shift: true }, idle)).toEqual({ kind: 'pass' });
  });

  it('Escape blurs the input', () => {
    expect(press('Escape', {}, typing)).toEqual({ kind: 'blur' });
    expect(press('Escape')).toEqual({ kind: 'blur' });
  });

  it('Ctrl+L clears, case-insensitively', () => {
    expect(press('l', { ctrl: true })).toEqual({ kind: 'clear' });
    expect(press('L', { ctrl: true })).toEqual({ kind: 'clear' });
    expect(press('l')).toEqual({ kind: 'pass' });
  });

  it('Ctrl+C abandons the draft, but copies when text is selected', () => {
    expect(press('c', { ctrl: true }, typing)).toEqual({ kind: 'abandon' });
    expect(press('c', { ctrl: true })).toEqual({ kind: 'abandon' });
    expect(press('c', { ctrl: true }, { ...typing, hasSelection: true })).toEqual({
      kind: 'pass',
    });
  });

  it('leaves ordinary typing and Meta shortcuts alone', () => {
    expect(press('a')).toEqual({ kind: 'pass' });
    expect(press('c', { meta: true }, typing)).toEqual({ kind: 'pass' });
    expect(press('l', { meta: true })).toEqual({ kind: 'pass' });
  });
});
