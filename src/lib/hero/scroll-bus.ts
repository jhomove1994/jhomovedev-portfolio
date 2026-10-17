/**
 * One way to scroll the page to a section, whoever asks (the terminal's `experience` command, an
 * anchor). While the 3D hero runs, Lenis owns the scroll and registers a scroller here; otherwise
 * the browser's own `scrollIntoView` is used. Pure of three/gsap/lenis, so the terminal can import it.
 */
export type Scroller = (element: HTMLElement) => void;

export interface ScrollEnv {
  find(id: string): HTMLElement | null;
  prefersReducedMotion(): boolean;
}

let scroller: Scroller | null = null;

/** Registers the active smooth scroller, or `null` to unregister it. */
export function registerScroller(next: Scroller | null): void {
  scroller = next;
}

const browserEnv: ScrollEnv = {
  find: (id) => document.getElementById(id),
  prefersReducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};

export function scrollToSection(id: string, env: ScrollEnv = browserEnv): void {
  const element = env.find(id);
  if (!element) return;
  if (scroller) {
    scroller(element);
    return;
  }
  element.scrollIntoView({ behavior: env.prefersReducedMotion() ? 'auto' : 'smooth' });
}
