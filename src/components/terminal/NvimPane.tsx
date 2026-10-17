// nvim-like pane: a line-number gutter, the transcript as an aria-live log, the prompt (children)
// and the statusline. Presentational only.
import type { ReactNode, Ref } from 'react';
import type { NvimStatusline, TranscriptRow } from '../../lib/terminal/view';
import { Line } from './Line';
import { PromptMarker } from './PromptLine';

interface NvimPaneProps {
  rows: TranscriptRow[];
  /** Characters of the intro command typed so far; purely visual, hidden from assistive tech. */
  typing: string | null;
  promptName: string;
  /** Gutter number of the live prompt row. */
  promptLine: number;
  logLabel: string;
  logRef: Ref<HTMLDivElement>;
  status: NvimStatusline;
  onRun: (command: string) => void;
  interactive: boolean;
  children: ReactNode;
}

export function NvimPane({
  rows,
  typing,
  promptName,
  promptLine,
  logLabel,
  logRef,
  status,
  onRun,
  interactive,
  children,
}: NvimPaneProps) {
  return (
    <div className="term-pane">
      <div className="term-scroll" ref={logRef} data-lenis-prevent>
        <div role="log" aria-live="polite" aria-relevant="additions" aria-label={logLabel}>
          {rows.map((row) => (
            <div className="term-row" key={row.key}>
              <span className="term-gutter" aria-hidden="true">
                {row.n}
              </span>
              {row.kind === 'input' ? (
                <div className="term-line">
                  <PromptMarker name={promptName} /> <span data-tone="amber">{row.input}</span>
                </div>
              ) : (
                <Line line={row.line ?? []} onRun={onRun} interactive={interactive} />
              )}
            </div>
          ))}
        </div>
        {typing !== null ? (
          <div className="term-row" aria-hidden="true">
            <span className="term-gutter">{promptLine}</span>
            <div className="term-line">
              <PromptMarker name={promptName} /> <span data-tone="amber">{typing}</span>
              <span className="term-cursor" data-focused="true" />
            </div>
          </div>
        ) : null}
        {/* While the intro types, the live prompt stays focusable but visually yields. */}
        <div className="term-live" data-typing={typing !== null}>
          {children}
        </div>
      </div>
      <div className="term-status">
        <span className="term-mode" data-mode={status.mode}>
          {status.mode}
        </span>
        <span className="term-file">{status.file}</span>
        <span className="term-meta">
          {status.encoding} {status.locale} {status.position}
        </span>
      </div>
    </div>
  );
}
