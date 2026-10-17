// One printed line: plain runs, safe links and `run` buttons (clickable suggestions).
import { safeHref } from '../../lib/terminal/href';
import type { Line as LineModel, Segment } from '../../lib/terminal/types';

interface LineProps {
  line: LineModel;
  /** Runs a command exactly as if it had been typed. */
  onRun: (command: string) => void;
  /** False before hydration: suggestions are plain text because nothing can run them yet. */
  interactive: boolean;
}

function SegmentView({
  segment,
  onRun,
  interactive,
}: {
  segment: Segment;
  onRun: LineProps['onRun'];
  interactive: boolean;
}) {
  const { text, tone = 'fg', run, href } = segment;

  if (run !== undefined && interactive) {
    return (
      <button type="button" className="term-run" data-tone={tone} onClick={() => onRun(run)}>
        {text}
      </button>
    );
  }

  const safe = href === undefined ? null : safeHref(href);
  if (safe !== null) {
    return (
      <a className="term-link" data-tone={tone} href={safe}>
        {text}
      </a>
    );
  }
  return <span data-tone={tone}>{text}</span>;
}

export function Line({ line, onRun, interactive }: LineProps) {
  return (
    <div className="term-line">
      {line.map((segment, index) => (
        <SegmentView key={index} segment={segment} onRun={onRun} interactive={interactive} />
      ))}
      {/* An empty line keeps its height so blank separators stay visible. */}
      {line.every((segment) => segment.text === '') ? ' ' : null}
    </div>
  );
}
