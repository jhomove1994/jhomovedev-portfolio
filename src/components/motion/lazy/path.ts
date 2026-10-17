import { litNodes } from '../../../lib/motion/rail';
import { nodeFractions } from '../../../lib/motion/stage';
import { ENTER_LINE } from '../../../lib/motion/viewport';
import type { Effect } from './kit';

/** Seconds the path takes to trace from the first stage to the last. */
const TRACE_SECONDS = 1.6;

/**
 * TechLeadPath: the line between the stages is traced once when the path enters the view
 * (`stroke-dashoffset`, with the path length normalised to 1) and each stage lights as the trace
 * reaches it. The pulse on the current stage is pure CSS, started by the stage being lit.
 */
export const initPath: Effect = ({ gsap, ScrollTrigger }) => {
  for (const path of document.querySelectorAll<HTMLElement>('[data-path]')) {
    const line = path.querySelector<SVGPathElement>('[data-path-line]');
    const nodes = [...path.querySelectorAll<HTMLElement>('[data-path-node]')];
    if (!line) continue;

    const fractions = () => {
      const box = path.getBoundingClientRect();
      return nodeFractions(
        nodes.map((node) => {
          const nodeBox = node.getBoundingClientRect();
          return nodeBox.top + nodeBox.height / 2 - box.top;
        }),
        box.height,
      );
    };
    const show = (traced: number, at: readonly number[]) => {
      line.style.strokeDashoffset = String(1 - traced);
      const lit = litNodes(at, traced);
      nodes.forEach((node, index) => node.classList.toggle('is-lit', lit[index] ?? false));
    };

    // Already in view when the motion started: show the finished path instead of redrawing it.
    if (path.closest('[data-revealed]')) {
      show(1, fractions());
      continue;
    }

    ScrollTrigger.create({
      trigger: path,
      start: `top ${ENTER_LINE * 100}%`,
      once: true,
      onEnter: () => {
        const at = fractions();
        const state = { traced: 0 };
        gsap.to(state, {
          traced: 1,
          duration: TRACE_SECONDS,
          ease: 'power1.inOut',
          onUpdate: () => show(state.traced, at),
        });
      },
    });
  }
};
