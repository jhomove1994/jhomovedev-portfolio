import { fillLength, litNodes, newlyReached } from '../../../lib/motion/rail';
import { nodeFractions, traceTarget } from '../../../lib/motion/stage';
import { staggerDelayMs } from '../../../lib/motion/stagger';
import { COMMIT_JITTER_MS, COMMIT_MS_PER_CHAR } from '../../../lib/motion/typing';
import type { Effect } from './kit';
import { whenTyped } from './typed';
import { playTyping, prepareTyping, type Typewriter } from './typewriter';

/** The commit appears when the reader's line (this viewport height) reaches its dot. */
const READING_LINE = '72%';
/** Seconds the graph line takes to grow down to the commit that just appeared. */
const GROW_SECONDS = 0.45;
/** The graph line starts and ends this far (in rem) inside the box that holds the commits. */
const LINE_INSET_REM = 0.5;

/**
 * TechLeadPath as `git log --graph`: commits appear one at a time as the scroll reaches them (once;
 * scrolling back leaves them). When a commit appears the graph line grows down to its dot, the dot
 * lights, its header line (hash, ref, date) types out quickly and then the message fades in.
 */
export const initPath: Effect = (kit) => {
  const { gsap, ScrollTrigger, profile } = kit;
  for (const path of document.querySelectorAll<HTMLElement>('[data-path]')) {
    const line = path.querySelector<SVGPathElement>('[data-path-line]');
    const rows = [...path.querySelectorAll<HTMLElement>('[data-row]')];
    const section = path.closest<HTMLElement>('[data-reveal]');
    if (!line || rows.length === 0 || !section) continue;

    const dots = rows.map((row) => row.querySelector<HTMLElement>('[data-commit-node]'));
    const setLine = (traced: number) => {
      line.style.strokeDashoffset = String(1 - traced);
    };

    // Already in view when the motion started: the finished log, nothing redrawn or retyped.
    if (section.hasAttribute('data-revealed')) {
      setLine(1);
      dots.forEach((dot) => dot?.classList.add('is-lit'));
      continue;
    }

    // Reduced motion: the graph is drawn and lit by CSS; each commit just fades in whole.
    const heads: Typewriter[] = profile.typeCommitHeads
      ? rows.map((row) =>
          prepareTyping([...row.querySelectorAll<HTMLElement>('[data-commit-head] [data-type]')]),
        )
      : [];
    const bodies = rows.map((row) => row.querySelector<HTMLElement>('[data-row-body]'));

    // Layout-based (offsetTop ignores the rows' entrance offset), relative to the log box.
    let offsets: number[] = [];
    let fractions: number[] = [];
    let height = 0;
    const measure = () => {
      const inset =
        LINE_INSET_REM * parseFloat(getComputedStyle(document.documentElement).fontSize);
      height = path.offsetHeight;
      offsets = dots.map((dot, index) => {
        const row = rows[index]!;
        return row.offsetTop + (dot ? dot.offsetTop + dot.offsetHeight / 2 : 0);
      });
      fractions = nodeFractions(
        offsets.map((offset) => offset - inset),
        height - inset * 2,
      );
    };

    let reached = rows.map(() => false);
    const shown = rows.map(() => false);
    const grown = { value: 0 };
    const growTo = (target: number) => {
      gsap.to(grown, {
        value: target,
        duration: GROW_SECONDS,
        ease: 'power1.out',
        overwrite: true,
        onUpdate: () => setLine(grown.value),
      });
    };

    const showCommit = (index: number) => {
      shown[index] = true;
      rows[index]!.classList.add('is-in');
      dots[index]?.classList.add('is-lit');
      if (!profile.growGraph) return;
      growTo(traceTarget(shown, fractions));
      void playTyping(kit, heads[index]!, {
        msPerChar: COMMIT_MS_PER_CHAR,
        jitterMs: COMMIT_JITTER_MS,
      }).then(() => bodies[index]?.classList.add('is-in'));
    };

    const update = (progress: number) => {
      const now = litNodes(offsets, fillLength(progress, height)).map(
        (isReached, index) => isReached || reached[index]!,
      );
      const fresh = newlyReached(reached, now);
      reached = now;
      if (fresh.length === 0) return;
      void whenTyped(section).then(() =>
        fresh.forEach((index, order) =>
          gsap.delayedCall(staggerDelayMs(order) / 1000, () => showCommit(index)),
        ),
      );
    };

    ScrollTrigger.create({
      trigger: path,
      start: `top ${READING_LINE}`,
      end: `bottom ${READING_LINE}`,
      onRefresh: (self) => {
        measure();
        update(self.progress);
      },
      onUpdate: (self) => update(self.progress),
    });
  }
};
