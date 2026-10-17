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
    ['reduced motion', { reducedMotion: true }, 'static', 'reduced-motion'],
    ['mobile default', { isMobile: true }, 'static', 'mobile'],
    ['small screen (terminal-first layout)', { smallScreen: true }, 'static', 'small-screen'],
    [
      'override on cannot bypass a small screen',
      { smallScreen: true, isMobile: true, override: 'on' },
      'static',
      'small-screen',
    ],
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
      'override on cannot bypass reduced motion',
      { reducedMotion: true, override: 'on' },
      'static',
      'reduced-motion',
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

  it('reduced-motion beats override off', () => {
    expect(decide({ reducedMotion: true, override: 'off' }).reason).toBe('reduced-motion');
  });

  it('reduced-motion beats a small screen', () => {
    expect(decide({ reducedMotion: true, smallScreen: true }).reason).toBe('reduced-motion');
  });

  it('a small screen beats override off', () => {
    expect(decide({ smallScreen: true, override: 'off' }).reason).toBe('small-screen');
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

  it('is unavailable on a small screen, where 3D never mounts', () => {
    expect(decide({ smallScreen: true }).toggle.available).toBe(false);
    expect(decide({ smallScreen: true, override: 'on' }).toggle.available).toBe(false);
  });

  it('is unavailable under reduced motion, even with override on', () => {
    expect(decide({ reducedMotion: true }).toggle.available).toBe(false);
    expect(decide({ reducedMotion: true, override: 'on' }).toggle.available).toBe(false);
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
