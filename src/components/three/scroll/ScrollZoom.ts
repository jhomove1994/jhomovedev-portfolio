// Scroll-driven zoom into the monitor: Lenis smooths the scroll, GSAP ScrollTrigger holds the hero
// (sticky) for a stretch of it and reports progress into the zoom store the camera rig reads each frame.
// gsap and lenis are loaded here by dynamic import, so they exist only on the 3D path.
import { registerScroller } from '../../../lib/hero/scroll-bus';
import { zoomProgress, type ZoomStore } from '../../../lib/hero/zoom';

/** Desktop with a fine pointer and motion allowed; everything else keeps native scrolling. */
export const ZOOM_MEDIA =
  '(min-width:1024px) and (pointer:fine) and (prefers-reduced-motion:no-preference)';
/** Scroll distance of the zoom, in viewport heights. */
const ZOOM_SCROLL_VH = 1.2;
/** The hero copy is gone by this much of the zoom (it fades over the first part). */
const COPY_FADE_END = 0.4;

export interface ScrollZoomOptions {
  hero: HTMLElement;
  zoom: ZoomStore;
}

function stickyHeaderHeight(): number {
  return document.querySelector('header')?.getBoundingClientRect().height ?? 0;
}

/** Skip links and nav anchors move the focus as the browser would, after the scroll lands. */
function focusTarget(target: HTMLElement): void {
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

/** Moving `#hero` in the DOM blurs a focused input: put the focus back after `change`. */
function keepingFocus(hero: HTMLElement, change: () => void): void {
  const active = document.activeElement;
  const focused = active instanceof HTMLElement && hero.contains(active) ? active : null;
  const selection =
    focused instanceof HTMLInputElement
      ? { start: focused.selectionStart, end: focused.selectionEnd }
      : null;
  change();
  if (!focused || document.activeElement === focused) return;
  focused.focus({ preventScroll: true });
  if (focused instanceof HTMLInputElement && selection) {
    focused.setSelectionRange(selection.start, selection.end);
  }
}

/**
 * Starts the zoom when the media query holds and keeps it in step with it. Resolves to a teardown
 * that removes everything it added: the pin, Lenis and its class, the ticker callback, the scroller.
 */
export async function startScrollZoom({ hero, zoom }: ScrollZoomOptions): Promise<() => void> {
  const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
    import('lenis'),
  ]);
  gsap.registerPlugin(ScrollTrigger);
  const copy = hero.querySelector<HTMLElement>('.hero-copy');

  const media = gsap.matchMedia();
  media.add(ZOOM_MEDIA, () => {
    const lenis = new Lenis({ autoRaf: false });
    const tick = (time: number) => lenis.raf(time * 1000);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Lenis honours `scroll-margin-top`, which already keeps sections clear of the sticky header.
    const scrollTo = (target: HTMLElement, onComplete?: () => void) =>
      lenis.scrollTo(target, { onComplete });
    registerScroller((target) => scrollTo(target));

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      const hash = link?.getAttribute('href');
      if (!hash || hash.length < 2) return;
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (!target) return;
      event.preventDefault();
      history.pushState(null, '', hash);
      scrollTo(target, () => focusTarget(target));
    };
    document.addEventListener('click', onClick);

    // The pin is plain CSS sticky inside one wrapper added here, not ScrollTrigger's own pin:
    // that one re-parents the hero on every refresh, which blurs the terminal input each time.
    const wrap = document.createElement('div');
    wrap.className = 'hero-pin';
    keepingFocus(hero, () => {
      hero.parentNode?.insertBefore(wrap, hero);
      wrap.appendChild(hero);
    });
    const zoomLength = () => Math.round(window.innerHeight * ZOOM_SCROLL_VH);
    const sizeWrap = () => {
      wrap.style.height = `${hero.offsetHeight + zoomLength()}px`;
    };
    sizeWrap();

    const trigger = ScrollTrigger.create({
      trigger: wrap,
      start: () => `top ${stickyHeaderHeight()}px`,
      end: () => `+=${zoomLength()}`,
      invalidateOnRefresh: true,
      onRefreshInit: sizeWrap,
      onUpdate: (self) => {
        const progress = zoomProgress(self.scroll(), { start: self.start, end: self.end });
        zoom.progress = progress;
        if (!copy) return;
        const visible = 1 - zoomProgress(progress, { start: 0, end: COPY_FADE_END });
        copy.style.opacity = String(visible);
        copy.style.visibility = visible === 0 ? 'hidden' : '';
      },
    });

    return () => {
      trigger.kill();
      keepingFocus(hero, () => {
        wrap.parentNode?.insertBefore(hero, wrap);
        wrap.parentNode?.removeChild(wrap);
      });
      document.removeEventListener('click', onClick);
      registerScroller(null);
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      zoom.progress = 0;
      copy?.style.removeProperty('opacity');
      copy?.style.removeProperty('visibility');
    };
  });

  return () => media.revert();
}
