import { REDUCED_MOTION_QUERY } from '../../lib/capabilities-env';
import { motionMode, motionProfile, type MotionProfile } from '../../lib/motion/mode';
import { hasEntered } from '../../lib/motion/viewport';

/**
 * Sections already in view when motion starts stay as they are: hiding what the reader is looking
 * at just to animate it would read as a glitch. They are marked so the effects skip them.
 */
function settleVisibleSections(): void {
  for (const section of document.querySelectorAll<HTMLElement>('[data-reveal]')) {
    if (!hasEntered(section.getBoundingClientRect().top, window.innerHeight)) continue;
    section.setAttribute('data-revealed', '');
    section.querySelector('[data-cmd-caret]')?.setAttribute('data-done', '');
    section
      .querySelectorAll('[data-reveal-item], [data-row], [data-row-body]')
      .forEach((item) => item.classList.add('is-in'));
  }
}

async function start(profile: MotionProfile): Promise<void> {
  const root = document.documentElement;
  settleVisibleSections();
  // Only once these classes are on <html> does CSS offset or hide anything.
  root.classList.add(...profile.htmlClasses);
  try {
    const { runSectionMotion } = await import('./lazy/runtime');
    await runSectionMotion(profile);
  } catch {
    root.classList.remove(...profile.htmlClasses);
  }
}

/**
 * Entry point of the motion below the hero. Reduced motion gets the same flow without any
 * displacement (typing and opacity fades only, see `motionProfile`). Nothing loads until the
 * reader first scrolls: the first view stays light and the library never delays paint.
 */
export function startSectionMotion(): void {
  if (document.querySelector('[data-reveal]') === null) return;
  const profile = motionProfile(motionMode(window.matchMedia(REDUCED_MOTION_QUERY).matches));
  window.addEventListener('scroll', () => void start(profile), { once: true, passive: true });
}
