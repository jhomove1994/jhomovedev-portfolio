import { describe, expect, it } from 'vitest';
import {
  NO_NAME_FILE,
  TMUX_WINDOWS,
  nvimStatusline,
  promptLineNumber,
  tmuxWindows,
  transcriptRows,
} from '../../../src/lib/terminal/view';
import type { TerminalState } from '../../../src/lib/terminal/types';

function stateWith(overrides: Partial<TerminalState> = {}): TerminalState {
  return {
    transcript: [],
    draft: '',
    history: { entries: [], cursor: null, draft: '' },
    activeWindow: null,
    typing: null,
    ...overrides,
  };
}

describe('tmuxWindows', () => {
  it('lists the runnable commands in order, numbered from zero', () => {
    const windows = tmuxWindows(null);
    expect(windows.map(({ command }) => command)).toEqual([...TMUX_WINDOWS]);
    expect(windows.map(({ index }) => index)).toEqual(windows.map((_, position) => position));
    expect(windows.some(({ active }) => active)).toBe(false);
  });

  it('marks exactly the active command', () => {
    const windows = tmuxWindows('experience');
    expect(windows.filter(({ active }) => active).map(({ command }) => command)).toEqual([
      'experience',
    ]);
  });

  it('never offers commands that need an argument or only clear the screen', () => {
    for (const command of ['lang', 'ask', 'clear'] as const) {
      expect(TMUX_WINDOWS).not.toContain(command);
    }
  });

  it('ignores an active command that has no window', () => {
    expect(tmuxWindows('lang').some(({ active }) => active)).toBe(false);
  });
});

describe('transcriptRows', () => {
  it('numbers the typed command and every output line consecutively', () => {
    const rows = transcriptRows([
      { id: 0, input: 'whoami', lines: [[{ text: 'a' }], [{ text: 'b' }]] },
      { id: 1, input: 'help', lines: [[{ text: 'c' }]] },
    ]);
    expect(rows.map(({ n, kind }) => [n, kind])).toEqual([
      [1, 'input'],
      [2, 'output'],
      [3, 'output'],
      [4, 'input'],
      [5, 'output'],
    ]);
    expect(rows[0]).toMatchObject({ input: 'whoami' });
    expect(rows[4]?.line).toEqual([{ text: 'c' }]);
  });

  it('gives each row a stable unique key', () => {
    const rows = transcriptRows([
      { id: 0, input: 'a', lines: [[{ text: 'x' }]] },
      { id: 1, input: 'b', lines: [[{ text: 'x' }]] },
    ]);
    expect(new Set(rows.map(({ key }) => key)).size).toBe(4);
  });

  it('prints output-only entries without a command row', () => {
    const rows = transcriptRows([{ id: 3, lines: [[{ text: 'only' }]] }]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ n: 1, kind: 'output' });
  });

  it('keeps an abandoned command as a single input row', () => {
    const rows = transcriptRows([{ id: 2, input: 'wh^C', lines: [] }]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'input', input: 'wh^C' });
  });
});

describe('promptLineNumber', () => {
  it('is 1 on an empty transcript and follows the last row otherwise', () => {
    expect(promptLineNumber([])).toBe(1);
    expect(
      promptLineNumber(transcriptRows([{ id: 0, input: 'x', lines: [[{ text: 'y' }]] }])),
    ).toBe(3);
  });
});

describe('nvimStatusline', () => {
  it('shows NORMAL when the input is not focused and INSERT when it is', () => {
    expect(nvimStatusline(stateWith(), { focused: false, locale: 'es', promptLine: 1 }).mode).toBe(
      'NORMAL',
    );
    expect(nvimStatusline(stateWith(), { focused: true, locale: 'es', promptLine: 1 }).mode).toBe(
      'INSERT',
    );
  });

  it('names the file after the active window, with a no-name fallback', () => {
    const named = nvimStatusline(stateWith({ activeWindow: 'whoami' }), {
      focused: false,
      locale: 'en',
      promptLine: 1,
    });
    expect(named.file).toBe('~/whoami.md');
    const bare = nvimStatusline(stateWith(), { focused: false, locale: 'en', promptLine: 1 });
    expect(bare.file).toBe(NO_NAME_FILE);
  });

  it('reports line:column from the prompt line and the draft length', () => {
    const status = nvimStatusline(stateWith({ draft: 'whoami' }), {
      focused: true,
      locale: 'en',
      promptLine: 4,
    });
    expect(status.position).toBe('4:7');
    expect(status.locale).toBe('en');
    expect(status.encoding).toBe('utf-8');
  });
});
