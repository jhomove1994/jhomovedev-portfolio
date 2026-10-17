import { REDUCED_MOTION_QUERY } from '../../lib/capabilities-env';
import { hasEntered } from '../../lib/motion/viewport';

/** Set on <html> once motion is confirmed: only then does CSS offset or hide anything. */
const MOTION_CLASS = 'motion';

/**
 * Sections already in view when motion starts stay as they are: hiding what the reader is looking
 * at just to animate it would read as a glitch. They are marked so the effects skip them.
 */
function settleVisibleSections(): void {
  for (const section of document.querySelectorAll<HTMLElement>('[data-reveal]')) {
    if (!hasEntered(section.getBoundingClientRect().top, window.innerHeight)) continue;
    section.setAttribute('data-revealed', '');
    section.querySelector('[data-cmd-caret]')?.setAttribute('data-done', '');
    section.querySelectorAll('[data-reveal-item]').forEach((item) => item.classList.add('is-in'));
  }
}

async function start(): Promise<void> {
  const root = document.documentElement;
  settleVisibleSections();
  root.classList.add(MOTION_CLASS);
  try {
    const { runSectionMotion } = await import('./lazy/runtime');
    await runSectionMotion();
  } catch {
    root.classList.remove(MOTION_CLASS);
  }
}

/**
 * Entry point of the motion below the hero. Nothing loads for reduced motion, and nothing loads
 * until the reader first scrolls: the first view stays light and the library never delays paint.
 */
export function startSectionMotion(): void {
  if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
  if (document.querySelector('[data-reveal]') === null) return;
  window.addEventListener('scroll', () => void start(), { once: true, passive: true });
}
