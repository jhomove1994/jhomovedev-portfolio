// Prompt row: marker, the typed text and the block cursor. The real <input> sits on top of a
// mirror of its value so the cursor can be a styled block that follows the caret.
import type { ChangeEvent, KeyboardEvent, Ref, SyntheticEvent } from 'react';

interface PromptLineProps {
  line: number;
  prompt: string;
  value: string;
  caret: number;
  focused: boolean;
  label: string;
  inputRef: Ref<HTMLInputElement>;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSelect: (event: SyntheticEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
}

/** `name ~ >`: only the chevron carries the accent colour. */
export function PromptMarker({ name }: { name: string }) {
  return (
    <span className="term-marker" aria-hidden="true">
      {name} ~ <span className="term-chevron">&gt;</span>
    </span>
  );
}

export function PromptLine(props: PromptLineProps) {
  const { line, prompt, value, caret, focused, label, inputRef } = props;
  return (
    <div className="term-row term-prompt">
      <span className="term-gutter" aria-hidden="true">
        {line}
      </span>
      <PromptMarker name={prompt} />
      <span className="term-field">
        <span className="term-mirror" aria-hidden="true">
          {value.slice(0, caret)}
          <span className="term-cursor" data-focused={focused} />
          {value.slice(caret)}
        </span>
        <input
          ref={inputRef}
          className="term-input"
          type="text"
          value={value}
          aria-label={label}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="send"
          onChange={props.onChange}
          onKeyDown={props.onKeyDown}
          onSelect={props.onSelect}
          onFocus={props.onFocus}
          onBlur={props.onBlur}
        />
      </span>
    </div>
  );
}
