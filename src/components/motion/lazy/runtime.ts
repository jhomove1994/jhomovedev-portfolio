// The lazy chunk of the section motion: the only place (with its effects) that imports gsap.
// `sections.ts` reaches it through a dynamic import, once the first animated section is in view.
import type { MotionKit } from './kit';
import { initReveal } from './reveal';

/** Layout moves after the triggers measured (fonts, the hero pin wrapper): re-measure once settled. */
function refreshOnResize({ ScrollTrigger }: MotionKit): void {
  const main = document.querySelector('main');
  if (!main || typeof ResizeObserver === 'undefined') return;
  let frame = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => ScrollTrigger.refresh());
  }).observe(main);
}

export async function runSectionMotion(): Promise<void> {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);
  const kit: MotionKit = { gsap, ScrollTrigger };
  initReveal(kit);
  refreshOnResize(kit);
}
