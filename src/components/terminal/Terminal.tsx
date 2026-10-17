// Terminal container: binds the session store, maps keys through `decideKey` and carries out
// command effects. Layout and chrome live in the presentational components next to it.
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  type SyntheticEvent,
} from 'react';
import { scrollToSection } from '../../lib/hero/scroll-bus';
import { decideKey } from '../../lib/terminal/keys';
import { runEffects, type EffectPorts } from '../../lib/terminal/effects';
import type { TerminalSession } from '../../lib/terminal/session';
import type { TerminalData, TerminalLabels } from '../../lib/terminal/types';
import {
  nvimStatusline,
  promptLineNumber,
  tmuxWindows,
  transcriptRows,
} from '../../lib/terminal/view';
import { NvimPane } from './NvimPane';
import { PromptLine, PromptMarker } from './PromptLine';
import { TmuxBar } from './TmuxBar';
import './terminal.css';

interface TerminalProps {
  session: TerminalSession;
  data: TerminalData;
  labels: TerminalLabels;
}

const noopSubscribe = () => () => {};

/** `false` while rendering on the server and during hydration, `true` once mounted. */
function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

const browserPorts: EffectPorts = {
  navigate: (href) => window.location.assign(href),
  download(href) {
    const link = document.createElement('a');
    link.href = href;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  scroll: (section) => scrollToSection(section),
};

export function Terminal({ session, data, labels }: TerminalProps) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const mounted = useMounted();
  const [focused, setFocused] = useState(false);
  const [caretAt, setCaretAt] = useState({ pos: 0, draft: '' });
  const regionRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the newest output in view. Only the log scrolls, never the page.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [state.transcript, state.typing]);

  const rows = transcriptRows(state.transcript);
  const promptLine = promptLineNumber(rows);
  // After an external draft change (history, completion) the browser puts the caret at the end.
  const caret = caretAt.draft === state.draft ? caretAt.pos : state.draft.length;

  function run(command: string): void {
    runEffects(session.submit(command), browserPorts);
  }

  function trackCaret(input: HTMLInputElement): void {
    setCaretAt({ pos: input.selectionStart ?? input.value.length, draft: input.value });
  }

  function onChange(event: ChangeEvent<HTMLInputElement>): void {
    session.setDraft(event.target.value);
    trackCaret(event.target);
  }

  function onSelect(event: SyntheticEvent<HTMLInputElement>): void {
    trackCaret(event.currentTarget);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    const input = event.currentTarget;
    const action = decideKey(
      {
        key: event.key,
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        meta: event.metaKey,
      },
      {
        draft: state.draft,
        hasSelection: input.selectionStart !== input.selectionEnd,
        composing: event.nativeEvent.isComposing,
      },
    );

    switch (action.kind) {
      case 'submit':
        event.preventDefault();
        run(state.draft);
        break;
      case 'history-prev':
        event.preventDefault();
        session.historyPrev();
        break;
      case 'history-next':
        event.preventDefault();
        session.historyNext();
        break;
      case 'complete':
        // Nothing to complete: let Tab move focus so the keyboard is never trapped.
        if (session.complete()) event.preventDefault();
        break;
      case 'blur':
        event.preventDefault();
        input.blur();
        regionRef.current?.focus({ preventScroll: true });
        break;
      case 'clear':
        event.preventDefault();
        session.clear();
        break;
      case 'abandon':
        event.preventDefault();
        session.abandon();
        break;
      case 'pass':
        session.skipIntro();
        break;
    }
  }

  function onPaneClick(event: MouseEvent<HTMLDivElement>): void {
    if ((event.target as HTMLElement).closest('button, a, input')) return;
    if (window.getSelection()?.toString()) return;
    inputRef.current?.focus();
  }

  const status = nvimStatusline(state, { focused, locale: data.locale, promptLine });

  return (
    // The pane click is a mouse convenience only: keyboard users reach the input by Tab.
    <div className="term" ref={regionRef} tabIndex={-1} onClick={onPaneClick}>
      <NvimPane
        rows={rows}
        typing={state.typing === null ? null : state.typing.text.slice(0, state.typing.index)}
        promptName={data.prompt}
        promptLine={promptLine}
        logLabel={labels.logLabel}
        logRef={logRef}
        status={status}
        onRun={run}
        interactive={mounted}
      >
        {mounted ? (
          <PromptLine
            line={promptLine}
            prompt={data.prompt}
            value={state.draft}
            caret={caret}
            focused={focused}
            label={labels.inputLabel}
            inputRef={inputRef}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onSelect={onSelect}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        ) : (
          <div className="term-row term-prompt" aria-hidden="true">
            <span className="term-gutter">{promptLine}</span>
            <PromptMarker name={data.prompt} />
          </div>
        )}
      </NvimPane>
      <TmuxBar
        session={data.prompt}
        windows={tmuxWindows(state.activeWindow)}
        label={labels.windowsLabel}
        onRun={run}
        interactive={mounted}
      />
    </div>
  );
}
