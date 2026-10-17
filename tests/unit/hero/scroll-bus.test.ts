import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  registerScroller,
  scrollToSection,
  type ScrollEnv,
} from '../../../src/lib/hero/scroll-bus';

const section = { id: 'experience' };

function env(reduced: boolean, found: unknown = section) {
  const scrollIntoView = vi.fn();
  const target = found ? { ...(found as object), scrollIntoView } : null;
  const fakeEnv: ScrollEnv = {
    find: vi.fn(() => target as unknown as HTMLElement | null),
    prefersReducedMotion: () => reduced,
  };
  return { fakeEnv, scrollIntoView };
}

afterEach(() => registerScroller(null));

describe('scrollToSection', () => {
  it('falls back to smooth scrollIntoView when nothing is registered', () => {
    const { fakeEnv, scrollIntoView } = env(false);
    scrollToSection('experience', fakeEnv);
    expect(fakeEnv.find).toHaveBeenCalledWith('experience');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('jumps instead of animating under reduced motion', () => {
    const { fakeEnv, scrollIntoView } = env(true);
    scrollToSection('experience', fakeEnv);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto' });
  });

  it('hands the element to the registered scroller and does not scrollIntoView', () => {
    const scroller = vi.fn();
    registerScroller(scroller);
    const { fakeEnv, scrollIntoView } = env(false);
    scrollToSection('experience', fakeEnv);
    expect(scroller).toHaveBeenCalledTimes(1);
    expect(scroller.mock.calls[0]![0]).toMatchObject({ id: 'experience' });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('stops using a scroller once null is registered', () => {
    const scroller = vi.fn();
    registerScroller(scroller);
    registerScroller(null);
    const { fakeEnv, scrollIntoView } = env(false);
    scrollToSection('experience', fakeEnv);
    expect(scroller).not.toHaveBeenCalled();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('does nothing for a section that is not on the page', () => {
    const scroller = vi.fn();
    registerScroller(scroller);
    const { fakeEnv } = env(false, null);
    expect(() => scrollToSection('nope', fakeEnv)).not.toThrow();
    expect(scroller).not.toHaveBeenCalled();
  });

  it('uses the latest scroller when one replaces another', () => {
    const first = vi.fn();
    const second = vi.fn();
    registerScroller(first);
    registerScroller(second);
    scrollToSection('experience', env(false).fakeEnv);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
