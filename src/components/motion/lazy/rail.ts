import { fillLength, litNodes, newlyReached } from '../../../lib/motion/rail';
import { staggerDelayMs } from '../../../lib/motion/stagger';
import type { Effect } from './kit';
import { whenTyped } from './typed';

/** The fill tip follows this viewport line: the rail is lit down to where the reader is looking. */
const READING_LINE = '65%';

/**
 * Experience: the vertical rail fills as the page scrolls past it; each node lights when the fill
 * reaches it and, at that moment, its entry slides in (once: scrolling back leaves it shown). The fill is a CSS variable (`--fill`, 0..1) so it only ever costs a transform.
 */
export const initRail: Effect = ({ gsap, ScrollTrigger }) => {
  for (const rail of document.querySelectorAll<HTMLElement>('[data-rail]')) {
    const track = rail.querySelector<HTMLElement>('[data-rail-track]');
    const rows = [...rail.querySelectorAll<HTMLElement>('[data-row]')];
    const nodes = [...rail.querySelectorAll<HTMLElement>('[data-rail-node]')];
    const section = rail.closest<HTMLElement>('[data-reveal]');
    if (!track || nodes.length === 0 || !section) continue;

    let offsets: number[] = [];
    let height = 0;
    const measure = () => {
      // Layout-based (offsetTop ignores the entries' entrance offset), relative to the track.
      height = track.offsetHeight;
      offsets = nodes.map(
        (node, index) =>
          (rows[index]?.offsetTop ?? 0) + node.offsetTop + node.offsetHeight / 2 - track.offsetTop,
      );
    };
    let reached = nodes.map(() => false);
    const apply = (progress: number) => {
      rail.style.setProperty('--fill', String(progress));
      const lit = litNodes(offsets, fillLength(progress, height));
      nodes.forEach((node, index) => node.classList.toggle('is-lit', lit[index] ?? false));
      const now = lit.map((isLit, index) => isLit || reached[index]!);
      const fresh = newlyReached(reached, now);
      reached = now;
      if (fresh.length === 0) return;
      void whenTyped(section).then(() =>
        fresh.forEach((index, order) =>
          gsap.delayedCall(staggerDelayMs(order) / 1000, () => rows[index]?.classList.add('is-in')),
        ),
      );
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
