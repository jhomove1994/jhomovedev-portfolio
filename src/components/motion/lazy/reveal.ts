import { ENTER_LINE } from '../../../lib/motion/viewport';
import { staggerDelayMs } from '../../../lib/motion/stagger';
import { COMMAND_JITTER_MS, COMMAND_MS_PER_CHAR } from '../../../lib/motion/typing';
import type { Effect } from './kit';
import { markTyped } from './typed';
import { playTyping, prepareTyping } from './typewriter';

/** Section top reaches this viewport line: the command starts typing. */
const ENTER_START = `top ${ENTER_LINE * 100}%`;
/** After the command is typed the output takes a beat before the first line shows. */
const OUTPUT_BASE_DELAY_MS = 220;
/** The caret lingers after the last character, then goes away. */
const CARET_LINGER_S = 0.9;

/**
 * Per section, once: types the command above the heading and, only when it is finished, shows the
 * content as the command's output, one item after another (the transition itself is CSS, see
 * `[data-reveal-item]` in global.css). Scroll-driven rows (`[data-row]`) wait for the same signal.
 */
export const initReveal: Effect = (kit) => {
  const { gsap, ScrollTrigger } = kit;
  for (const section of document.querySelectorAll<HTMLElement>(
    '[data-reveal]:not([data-revealed])',
  )) {
    const text = section.querySelector<HTMLElement>('[data-cmd-text]');
    const caret = section.querySelector<HTMLElement>('[data-cmd-caret]');
    const typing = text ? prepareTyping([text], caret ?? undefined) : null;

    let finish: () => void = () => undefined;
    const typed = new Promise<void>((resolve) => (finish = resolve));
    markTyped(section, typed);

    ScrollTrigger.create({
      trigger: section,
      start: ENTER_START,
      once: true,
      onEnter: () => {
        if (!typing) return finish();
        void playTyping(kit, typing, {
          msPerChar: COMMAND_MS_PER_CHAR,
          jitterMs: COMMAND_JITTER_MS,
        }).then(() => {
          finish();
          gsap.delayedCall(CARET_LINGER_S, () => caret?.setAttribute('data-done', ''));
        });
      },
    });

    const items = section.querySelectorAll<HTMLElement>('[data-reveal-item]');
    if (items.length === 0) continue;
    ScrollTrigger.batch(items, {
      start: ENTER_START,
      once: true,
      onEnter: (batch) => {
        void typed.then(() =>
          batch.forEach((element, index) => {
            const item = element as HTMLElement;
            item.style.transitionDelay = `${staggerDelayMs(index, OUTPUT_BASE_DELAY_MS)}ms`;
            item.classList.add('is-in');
          }),
        );
      },
    });
  }
};
