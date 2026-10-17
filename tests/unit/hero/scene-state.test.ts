import { describe, expect, it } from 'vitest';
import type { ModeDecision } from '../../../src/lib/capabilities';
import {
  captureEnabled,
  frameloopFor,
  probeEnabled,
  reduceScene,
  resolveHeroView,
  type SceneState,
} from '../../../src/lib/hero/scene-state';

const decision = (
  mode: 'static' | '3d',
  reason: ModeDecision['reason'] = 'default',
): ModeDecision => ({
  mode,
  reason,
  toggle: { available: true, target: mode === '3d' ? 'static' : '3d' },
});

describe('reduceScene', () => {
  it('walks idle -> loading -> ready', () => {
    const loading = reduceScene('idle', 'request');
    expect(loading).toBe('loading');
    expect(reduceScene(loading, 'loaded')).toBe('ready');
  });

  it('fails from loading and from ready (context loss) and stays failed', () => {
    expect(reduceScene('loading', 'failed')).toBe('error');
    expect(reduceScene('ready', 'failed')).toBe('error');
    expect(reduceScene('error', 'request')).toBe('error');
    expect(reduceScene('error', 'loaded')).toBe('error');
  });

  it('ignores a repeated request', () => {
    expect(reduceScene('loading', 'request')).toBe('loading');
    expect(reduceScene('ready', 'request')).toBe('ready');
  });

  it('settles from idle too, because the island derives loading instead of storing it', () => {
    expect(reduceScene('idle', 'loaded')).toBe('ready');
    expect(reduceScene('idle', 'failed')).toBe('error');
  });

  it('resets to idle from any state', () => {
    for (const from of ['idle', 'loading', 'ready', 'error'] as SceneState[]) {
      expect(reduceScene(from, 'reset')).toBe('idle');
    }
  });
});

describe('resolveHeroView', () => {
  it('keeps the static hero and its own reason when the decision is static', () => {
    expect(resolveHeroView(decision('static', 'mobile'), 'idle')).toEqual({
      mode: 'static',
      reason: 'mobile',
      state: 'idle',
    });
  });

  it('stays static while the scene loads (text paints before 3D)', () => {
    expect(resolveHeroView(decision('3d'), 'loading')).toEqual({
      mode: 'static',
      reason: 'default',
      state: 'loading',
    });
  });

  it('switches to 3d only once the scene is ready, keeping the decision reason', () => {
    expect(resolveHeroView(decision('3d', 'override-on'), 'ready')).toEqual({
      mode: '3d',
      reason: 'override-on',
      state: 'ready',
    });
  });

  it('reverts to static with load-failed after a failure, whatever the override', () => {
    expect(resolveHeroView(decision('3d', 'override-on'), 'error')).toEqual({
      mode: 'static',
      reason: 'load-failed',
      state: 'error',
    });
  });

  it('ignores a stale scene state when the decision is static', () => {
    expect(resolveHeroView(decision('static', 'override-off'), 'ready')).toEqual({
      mode: 'static',
      reason: 'override-off',
      state: 'idle',
    });
  });
});

describe('frameloopFor', () => {
  it('renders only while the hero is in view and the tab is visible', () => {
    expect(frameloopFor({ inViewport: true, documentHidden: false })).toBe('always');
    expect(frameloopFor({ inViewport: false, documentHidden: false })).toBe('never');
    expect(frameloopFor({ inViewport: true, documentHidden: true })).toBe('never');
    expect(frameloopFor({ inViewport: false, documentHidden: true })).toBe('never');
  });
});

describe('probeEnabled', () => {
  it('turns the render-activity probe on for capture runs and for ?3d=1&probe=1', () => {
    expect(probeEnabled('?capture=1')).toBe(true);
    expect(probeEnabled('?3d=1&probe=1')).toBe(true);
  });

  it('keeps it off for ordinary visits, a bare probe flag, or a non-forced mode', () => {
    expect(probeEnabled('')).toBe(false);
    expect(probeEnabled('?3d=1')).toBe(false);
    expect(probeEnabled('?probe=1')).toBe(false);
    expect(probeEnabled('?3d=0&probe=1')).toBe(false);
    expect(probeEnabled('?capture=0')).toBe(false);
  });
});

describe('captureEnabled', () => {
  it('exposes the capture hooks only for ?capture=1', () => {
    expect(captureEnabled('?3d=1&capture=1')).toBe(true);
    expect(captureEnabled('?capture=1')).toBe(true);
  });

  it('stays off for ordinary visits and for the e2e-only probe', () => {
    expect(captureEnabled('')).toBe(false);
    expect(captureEnabled('?3d=1&probe=1')).toBe(false);
    expect(captureEnabled('?capture=0')).toBe(false);
  });
});

describe('low-fps revert (S12)', () => {
  it('moves any live state to slow, and slow is final until a reset', () => {
    for (const from of ['idle', 'loading', 'ready'] as SceneState[]) {
      expect(reduceScene(from, 'slow')).toBe('slow');
    }
    expect(reduceScene('slow', 'request')).toBe('slow');
    expect(reduceScene('slow', 'loaded')).toBe('slow');
    expect(reduceScene('slow', 'failed')).toBe('slow');
    expect(reduceScene('slow', 'reset')).toBe('idle');
  });

  it('keeps an earlier failure as the reason', () => {
    expect(reduceScene('error', 'slow')).toBe('error');
  });

  it('reverts to static with low-fps, not persisted as an error', () => {
    expect(resolveHeroView(decision('3d', 'default'), 'slow')).toEqual({
      mode: 'static',
      reason: 'low-fps',
      state: 'idle',
    });
  });

  it('leaves a static decision on its own reason', () => {
    expect(resolveHeroView(decision('static', 'mobile'), 'slow')).toEqual({
      mode: 'static',
      reason: 'mobile',
      state: 'idle',
    });
  });
});
