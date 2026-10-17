import { ENTER_LINE } from '../../../lib/motion/viewport';
import type { Effect } from './kit';
import { staggerDelayMs } from '../../../lib/motion/stagger';
import { typedDurationMs, typedText } from '../../../lib/motion/typing';

/** Section top reaches this viewport line: the command starts typing. */
const ENTER_START = `top ${ENTER_LINE * 100}%`;
/** Content waits a beat so the command is already typing when it rises. */
const ITEM_BASE_DELAY_MS = 150;
/** The caret lingers after the last character, then goes away. */
const CARET_LINGER_S = 0.9;

/**
 * Per section, once: types the command line above the heading, and fades the content up in
 * ~100ms steps (the transition itself is CSS, see `[data-reveal-item]` in global.css).
 */
export const initReveal: Effect = ({ gsap, ScrollTrigger }) => {
  for (const section of document.querySelectorAll<HTMLElement>(
    '[data-reveal]:not([data-revealed])',
  )) {
    const text = section.querySelector<HTMLElement>('[data-cmd-text]');
    const caret = section.querySelector<HTMLElement>('[data-cmd-caret]');
    const command = text?.textContent ?? '';
    if (text) text.textContent = '';

    ScrollTrigger.create({
      trigger: section,
      start: ENTER_START,
      once: true,
      onEnter: () => {
        if (!text) return;
        const clock = { ms: 0 };
        gsap.to(clock, {
          ms: typedDurationMs(command),
          duration: typedDurationMs(command) / 1000,
          ease: 'none',
          onUpdate: () => {
            text.textContent = typedText(command, clock.ms);
          },
          onComplete: () => {
            text.textContent = command;
            gsap.delayedCall(CARET_LINGER_S, () => caret?.setAttribute('data-done', ''));
          },
        });
      },
    });

    const items = section.querySelectorAll<HTMLElement>('[data-reveal-item]');
    if (items.length === 0) continue;
    ScrollTrigger.batch(items, {
      start: ENTER_START,
      once: true,
      onEnter: (batch) => {
        batch.forEach((element, index) => {
          const item = element as HTMLElement;
          item.style.transitionDelay = `${staggerDelayMs(index, ITEM_BASE_DELAY_MS)}ms`;
          item.classList.add('is-in');
        });
      },
    });
  }
};
