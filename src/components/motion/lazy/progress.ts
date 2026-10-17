import type { Effect } from './kit';

/** Desktop two-column layout: the only place the heading is sticky and the bar shows. */
const TWO_COLUMNS = '(min-width: 1024px)';

/**
 * Per section, the thin bar under the sticky heading fills with the reader's progress through the
 * section: from its top reaching 80% of the viewport to its bottom reaching 40% (a range that is
 * never empty, even for a section shorter than the viewport). The fill is the `--p` variable.
 */
export const initProgress: Effect = ({ gsap, ScrollTrigger }) => {
  gsap.matchMedia().add(TWO_COLUMNS, () => {
    for (const section of document.querySelectorAll<HTMLElement>('[data-reveal]')) {
      const bar = section.querySelector<HTMLElement>('[data-progress]');
      if (!bar) continue;
      const set = (progress: number) => bar.style.setProperty('--p', String(progress));
      ScrollTrigger.create({
        trigger: section,
        start: 'top 80%',
        end: 'bottom 40%',
        onRefresh: (self) => set(self.progress),
        onUpdate: (self) => set(self.progress),
      });
    }
    return () => {
      document
        .querySelectorAll<HTMLElement>('[data-progress]')
        .forEach((bar) => bar.style.removeProperty('--p'));
    };
  });
};
