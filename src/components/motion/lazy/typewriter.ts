import { typedCount, typedSegments, typingTimes } from '../../../lib/motion/typing';
import type { MotionKit } from './kit';

/** Pace of one typing run (see `lib/motion/typing`). */
export interface Pace {
  msPerChar: number;
  jitterMs: number;
}

export interface Typewriter {
  /** Shows the first `count` characters, counted across all the elements in order. */
  show: (count: number) => void;
  /** Total characters across the elements. */
  length: number;
  /** Elements' full texts, in order. */
  texts: string[];
}

/**
 * Turns each element into a typed part plus an invisible rest. The rest keeps the room of the
 * text still to come, so typing never reflows the layout (the full text stays in the DOM).
 * `caret`, when given, sits right after the typed part of the last element.
 */
export function prepareTyping(elements: readonly HTMLElement[], caret?: HTMLElement): Typewriter {
  const texts = elements.map((element) => element.textContent ?? '');
  const parts = elements.map((element, index) => {
    const typed = document.createElement('span');
    typed.setAttribute('data-typed', '');
    const rest = document.createElement('span');
    rest.className = 'type-rest';
    rest.textContent = texts[index] ?? '';
    element.textContent = '';
    element.appendChild(typed);
    if (caret && index === elements.length - 1) element.appendChild(caret);
    element.appendChild(rest);
    return { typed, rest };
  });
  return {
    texts,
    length: texts.reduce((sum, text) => sum + Array.from(text).length, 0),
    show: (count) => {
      const shown = typedSegments(texts, count);
      parts.forEach(({ typed, rest }, index) => {
        const full = Array.from(texts[index] ?? '');
        const visible = Array.from(shown[index] ?? '').length;
        typed.textContent = shown[index] ?? '';
        rest.textContent = full.slice(visible).join('');
      });
    },
  };
}

/** Types the prepared elements at `pace`; resolves once the last character is on screen. */
export function playTyping({ gsap }: MotionKit, typing: Typewriter, pace: Pace): Promise<void> {
  const times = typingTimes(typing.texts.join(''), pace.msPerChar, pace.jitterMs);
  const total = times[times.length - 1] ?? 0;
  return new Promise((resolve) => {
    const clock = { ms: 0 };
    gsap.to(clock, {
      ms: total,
      duration: total / 1000,
      ease: 'none',
      onUpdate: () => typing.show(typedCount(times, clock.ms)),
      onComplete: () => {
        typing.show(typing.length);
        resolve();
      },
    });
  });
}
