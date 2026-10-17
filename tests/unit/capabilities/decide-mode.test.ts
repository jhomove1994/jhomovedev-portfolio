import { describe, expect, it } from 'vitest';
import { decideMode, isLowEnd, type ModeInput } from '../../../src/lib/capabilities';

const capable: ModeInput = {
  webgl2: true,
  reducedMotion: false,
  isMobile: false,
  cores: 8,
  memory: 8,
  override: null,
};

const decide = (patch: Partial<ModeInput>) => decideMode({ ...capable, ...patch });

describe('decideMode: spec render-capabilities scenarios', () => {
  it.each<[string, Partial<ModeInput>, string, string]>([
    ['capable desktop', {}, '3d', 'default'],
    ['no WebGL2', { webgl2: false }, 'static', 'no-webgl2'],
    ['reduced motion still shows the 3D scene', { reducedMotion: true }, '3d', 'default'],
    ['mobile default', { isMobile: true }, 'static', 'mobile'],
    ['desktop low-end by cores 2', { cores: 2 }, 'static', 'low-end'],
    ['desktop low-end by memory 2', { memory: 2 }, 'static', 'low-end'],
    ['desktop low-end by cores 1', { cores: 1 }, 'static', 'low-end'],
    ['desktop low-end by memory 0.5', { memory: 0.5 }, 'static', 'low-end'],
    [
      'missing hardware signals are not low-end',
      { cores: undefined, memory: undefined },
      '3d',
      'default',
    ],
    ['boundary cores 3 / memory 4', { cores: 3, memory: 4 }, '3d', 'default'],
    ['boundary memory 3 is above the threshold', { memory: 3 }, '3d', 'default'],
    ['override off beats a capable desktop', { override: 'off' }, 'static', 'override-off'],
    ['override on bypasses mobile', { isMobile: true, override: 'on' }, '3d', 'override-on'],
    ['override on bypasses low-end cores', { cores: 2, override: 'on' }, '3d', 'override-on'],
    ['override on bypasses low-end memory', { memory: 2, override: 'on' }, '3d', 'override-on'],
    [
      'override on bypasses the software renderer',
      { softwareRenderer: true, override: 'on' },
      '3d',
      'override-on',
    ],
    [
      'software renderer without override',
      { softwareRenderer: true },
      'static',
      'software-renderer',
    ],
    [
      'override on cannot bypass missing WebGL2',
      { webgl2: false, override: 'on' },
      'static',
      'no-webgl2',
    ],
    [
      'reduced motion keeps an explicit override on',
      { reducedMotion: true, override: 'on' },
      '3d',
      'override-on',
    ],
    [
      'reduced motion on mobile keeps the mobile default',
      { reducedMotion: true, isMobile: true },
      'static',
      'mobile',
    ],
    [
      'reduced motion on software rendering keeps the P1 default',
      { reducedMotion: true, softwareRenderer: true },
      'static',
      'software-renderer',
    ],
  ])('%s', (_name, patch, mode, reason) => {
    const d = decide(patch);
    expect({ mode: d.mode, reason: d.reason }).toEqual({ mode, reason });
  });
});

describe('decideMode: precedence', () => {
  it('no-webgl2 beats reduced-motion', () => {
    expect(decide({ webgl2: false, reducedMotion: true }).reason).toBe('no-webgl2');
  });

  it('override off wins under reduced motion', () => {
    expect(decide({ reducedMotion: true, override: 'off' })).toMatchObject({
      mode: 'static',
      reason: 'override-off',
    });
  });

  it('override off beats mobile', () => {
    expect(decide({ isMobile: true, override: 'off' }).reason).toBe('override-off');
  });

  it('mobile beats low-end and software-renderer', () => {
    expect(decide({ isMobile: true, cores: 2, softwareRenderer: true }).reason).toBe('mobile');
  });

  it('low-end beats software-renderer', () => {
    expect(decide({ cores: 2, softwareRenderer: true }).reason).toBe('low-end');
  });
});

describe('decideMode: toggle', () => {
  it('targets static while in 3d, available', () => {
    expect(decide({}).toggle).toEqual({ available: true, target: 'static' });
  });

  it('targets 3d on mobile static, available', () => {
    expect(decide({ isMobile: true }).toggle).toEqual({ available: true, target: '3d' });
  });

  it('stays available under low-end and software renderer so the user can opt in', () => {
    expect(decide({ cores: 2 }).toggle).toEqual({ available: true, target: '3d' });
    expect(decide({ softwareRenderer: true }).toggle).toEqual({ available: true, target: '3d' });
  });

  it('is unavailable without WebGL2', () => {
    expect(decide({ webgl2: false }).toggle.available).toBe(false);
  });

  it('stays available under reduced motion so the visitor can turn 3D off', () => {
    expect(decide({ reducedMotion: true }).toggle).toEqual({ available: true, target: 'static' });
    expect(decide({ reducedMotion: true, override: 'off' }).toggle).toEqual({
      available: true,
      target: '3d',
    });
  });
});

describe('decideMode: motion', () => {
  it.each<[string, Partial<ModeInput>, string]>([
    ['default is full motion', {}, 'full'],
    ['reduced preference is reduced motion', { reducedMotion: true }, 'reduced'],
    ['reduced stays reduced with override on', { reducedMotion: true, override: 'on' }, 'reduced'],
    [
      'reduced is reported even for the static hero',
      { reducedMotion: true, webgl2: false },
      'reduced',
    ],
    ['no preference with override off is full', { override: 'off' }, 'full'],
  ])('%s', (_name, patch, motion) => {
    expect(decide(patch).motion).toBe(motion);
  });
});

describe('isLowEnd', () => {
  it.each<[Partial<ModeInput>, boolean]>([
    [{ cores: 2 }, true],
    [{ memory: 2 }, true],
    [{ cores: 3, memory: 4 }, false],
    [{ cores: undefined, memory: undefined }, false],
    [{ cores: 2, memory: undefined }, true],
    [{ cores: undefined, memory: 1 }, true],
  ])('%j -> %s', (patch, expected) => {
    expect(isLowEnd({ ...capable, ...patch })).toBe(expected);
  });
});
