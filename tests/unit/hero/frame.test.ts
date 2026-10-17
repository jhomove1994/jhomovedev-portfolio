import { describe, expect, it } from 'vitest';
import {
  COPY_FADE_END,
  FRAME_GROW_END,
  FRAME_GROW_START,
  cameraView,
  copyOpacity,
  frameGeometry,
} from '../../../src/lib/hero/frame';

// A 1440 viewport: the stage content starts at 43 px, the scene (right column) at 440 px.
const BOUNDS = { stageLeft: 43, sceneLeft: 440, sceneWidth: 960 };

describe('copyOpacity', () => {
  it('is fully visible at rest and gone once the fade range ends', () => {
    expect(copyOpacity(0)).toBe(1);
    expect(copyOpacity(COPY_FADE_END)).toBe(0);
    expect(copyOpacity(1)).toBe(0);
  });

  it('fades linearly in between', () => {
    expect(copyOpacity(COPY_FADE_END / 2)).toBeCloseTo(0.5, 9);
  });
});

describe('frameGeometry', () => {
  it('starts as the scene column: nothing grown, the extra width fully hidden', () => {
    const g = frameGeometry(BOUNDS, 0);
    expect(g.extend).toBe(397);
    expect(g.fullWidth).toBe(960 + 397);
    expect(g.visibleWidth).toBe(960);
    expect(g.hidden).toBe(397);
    expect(g.grow).toBe(0);
  });

  it('does not start growing before FRAME_GROW_START', () => {
    expect(frameGeometry(BOUNDS, FRAME_GROW_START).grow).toBe(0);
    expect(frameGeometry(BOUNDS, FRAME_GROW_START / 2).visibleWidth).toBe(960);
  });

  it('spans the whole container width once the growth range ends', () => {
    for (const progress of [FRAME_GROW_END, 0.8, 1]) {
      const g = frameGeometry(BOUNDS, progress);
      expect(g.grow).toBe(1);
      expect(g.visibleWidth).toBe(g.fullWidth);
      expect(g.hidden).toBe(0);
    }
  });

  it('grows monotonically and keeps visible + hidden equal to the full width', () => {
    let previous = 0;
    for (let i = 0; i <= 100; i += 1) {
      const g = frameGeometry(BOUNDS, i / 100);
      expect(g.visibleWidth).toBeGreaterThanOrEqual(previous);
      expect(g.visibleWidth + g.hidden).toBeCloseTo(g.fullWidth, 9);
      previous = g.visibleWidth;
    }
  });

  it('lets the copy fade almost completely before the growing frame reaches it', () => {
    for (let step = 0; step <= 100; step++) {
      const progress = step / 100;
      if (frameGeometry(BOUNDS, progress).grow < 0.05) continue;
      expect(copyOpacity(progress)).toBeLessThanOrEqual(0.15);
    }
  });

  it('finishes growing by the middle of the zoom, so no column stays empty for long', () => {
    expect(FRAME_GROW_END).toBeLessThanOrEqual(0.5);
    expect(COPY_FADE_END).toBeLessThan(FRAME_GROW_END);
    expect(FRAME_GROW_START).toBeGreaterThanOrEqual(0);
    expect(FRAME_GROW_START).toBeLessThan(FRAME_GROW_END);
  });

  it('has nothing to grow into when the scene already spans the container (single column)', () => {
    const g = frameGeometry({ stageLeft: 20, sceneLeft: 20, sceneWidth: 700 }, 1);
    expect(g.extend).toBe(0);
    expect(g.visibleWidth).toBe(700);
    expect(g.fullWidth).toBe(700);
  });

  it('never extends to the right of the scene', () => {
    expect(frameGeometry({ stageLeft: 500, sceneLeft: 440, sceneWidth: 960 }, 1).extend).toBe(0);
  });
});

describe('cameraView', () => {
  it('is the plain canvas view while the wide frame is not in place', () => {
    expect(cameraView({ fullWidth: 0, visibleWidth: 0 }, 960, 600)).toEqual({
      wide: false,
      aspect: 1.6,
      offsetX: 0,
    });
  });

  it('stays plain while the canvas has not yet taken the full width (async resize)', () => {
    const view = cameraView({ fullWidth: 1357, visibleWidth: 960 }, 960, 600);
    expect(view.wide).toBe(false);
    expect(view.aspect).toBe(1.6);
  });

  it('frames the visible part only: aspect from the visible width, offset by what is hidden', () => {
    const view = cameraView({ fullWidth: 1357, visibleWidth: 960 }, 1357, 600);
    expect(view.wide).toBe(true);
    expect(view.aspect).toBeCloseTo(960 / 600, 9);
    expect(view.offsetX).toBe(-(1357 - 960));
  });

  it('has no offset once the frame is fully grown', () => {
    const view = cameraView({ fullWidth: 1357, visibleWidth: 1357 }, 1357, 600);
    expect(view.offsetX).toBeCloseTo(0, 9);
    expect(view.aspect).toBeCloseTo(1357 / 600, 9);
  });
});
