// tmux status bar. The window list is the set of clickable suggestions: each window is a real
// button that runs its command; the active window is the last command that ran.
import type { TmuxWindow } from '../../lib/terminal/view';

interface TmuxBarProps {
  session: string;
  windows: TmuxWindow[];
  label: string;
  onRun: (command: string) => void;
  /** False before hydration: windows are plain text because nothing can run them yet. */
  interactive: boolean;
}

export function TmuxBar({ session, windows, label, onRun, interactive }: TmuxBarProps) {
  return (
    <nav className="term-tmux" aria-label={label}>
      <span className="term-tmux-session">[{session}]</span>
      <ul className="term-tmux-windows">
        {windows.map(({ index, command, active }) => (
          <li key={command}>
            {interactive ? (
              <button
                type="button"
                className="term-window"
                aria-current={active ? 'true' : undefined}
                onClick={() => onRun(command)}
              >
                {index}:{command}
                {active ? '*' : ''}
              </button>
            ) : (
              <span className="term-window" aria-current={active ? 'true' : undefined}>
                {index}:{command}
                {active ? '*' : ''}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
