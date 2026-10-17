import { fillLength, litNodes } from '../../../lib/motion/rail';
import type { Effect } from './kit';

/** The fill tip follows this viewport line: the rail is lit down to where the reader is looking. */
const READING_LINE = '65%';

/**
 * Experience: the vertical rail fills as the page scrolls past it and each node lights when the
 * fill reaches it. The fill is a CSS variable (`--fill`, 0..1) so it only ever costs a transform.
 */
export const initRail: Effect = ({ ScrollTrigger }) => {
  for (const rail of document.querySelectorAll<HTMLElement>('[data-rail]')) {
    const track = rail.querySelector<HTMLElement>('[data-rail-track]');
    const nodes = [...rail.querySelectorAll<HTMLElement>('[data-rail-node]')];
    if (!track || nodes.length === 0) continue;

    let offsets: number[] = [];
    let height = 0;
    const measure = () => {
      const box = track.getBoundingClientRect();
      height = box.height;
      offsets = nodes.map((node) => {
        const nodeBox = node.getBoundingClientRect();
        return nodeBox.top + nodeBox.height / 2 - box.top;
      });
    };
    const apply = (progress: number) => {
      rail.style.setProperty('--fill', String(progress));
      const lit = litNodes(offsets, fillLength(progress, height));
      nodes.forEach((node, index) => node.classList.toggle('is-lit', lit[index] ?? false));
    };

    ScrollTrigger.create({
      trigger: rail,
      start: `top ${READING_LINE}`,
      end: `bottom ${READING_LINE}`,
      onRefresh: (self) => {
        measure();
        apply(self.progress);
      },
      onUpdate: (self) => apply(self.progress),
    });
  }
};
