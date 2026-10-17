import { describe, expect, it } from 'vitest';
import {
  INITIAL_LOW_FPS,
  LOW_FPS_MAX_FRAME_MS,
  LOW_FPS_SUSTAIN_MS,
  stepLowFps,
  type LowFpsState,
} from '../../../src/lib/hero/tiers';

/** Feeds frames of `deltaMs` until `fire` or the budget runs out; returns when it fired. */
function run(
  frames: number,
  deltaMs: number,
  { atFloor = true, from = INITIAL_LOW_FPS }: { atFloor?: boolean; from?: LowFpsState } = {},
) {
  let state = from;
  let fired = 0;
  let firedAtFrame = -1;
  for (let i = 0; i < frames; i += 1) {
    const step = stepLowFps(state, { atFloor, deltaMs });
    state = step.state;
    if (step.fire) {
      fired += 1;
      if (firedAtFrame < 0) firedAtFrame = i + 1;
    }
  }
  return { state, fired, firedAtFrame };
}

describe('stepLowFps', () => {
  it('fires once when the floor tier stays slow for the sustain window', () => {
    // 60 ms frames are ~16 fps: slower than the 20 fps threshold.
    const result = run(300, 60);
    expect(result.fired).toBe(1);
    expect(result.firedAtFrame * 60).toBeGreaterThanOrEqual(LOW_FPS_SUSTAIN_MS);
    expect(result.firedAtFrame * 60).toBeLessThan(LOW_FPS_SUSTAIN_MS + 60);
  });

  it('never fires when the frames are healthy', () => {
    expect(run(2000, 16).fired).toBe(0);
  });

  it('never fires above the floor tier, however slow, and keeps no debt', () => {
    const result = run(300, 60, { atFloor: false });
    expect(result.fired).toBe(0);
    expect(result.state).toEqual(INITIAL_LOW_FPS);
  });

  it('forgets slowness accumulated before the tier reached the floor', () => {
    const slowAtFloor = run(40, 60); // 2.4 s of debt
    const leftFloor = stepLowFps(slowAtFloor.state, { atFloor: false, deltaMs: 60 });
    expect(leftFloor.state).toEqual(INITIAL_LOW_FPS);
    const after = run(40, 60, { from: leftFloor.state });
    expect(after.fired).toBe(0); // 2.4 s again, not 4.8 s
  });

  it('treats a gap longer than a second as a pause, not as slowness', () => {
    const slow = run(40, 60);
    const gap = stepLowFps(slow.state, { atFloor: true, deltaMs: LOW_FPS_MAX_FRAME_MS + 1 });
    expect(gap.fire).toBe(false);
    expect(gap.state).toEqual(INITIAL_LOW_FPS);
  });

  it('lets fast frames pay the debt back, so brief hitches do not add up', () => {
    let state: LowFpsState = INITIAL_LOW_FPS;
    let fired = 0;
    for (let i = 0; i < 400; i += 1) {
      // One 80 ms hitch followed by four 16 ms frames: net time is mostly healthy.
      const step = stepLowFps(state, { atFloor: true, deltaMs: i % 5 === 0 ? 80 : 16 });
      state = step.state;
      if (step.fire) fired += 1;
    }
    expect(fired).toBe(0);
    expect(state.slowMs).toBeLessThan(LOW_FPS_SUSTAIN_MS);
  });

  it('still fires through jitter when slow frames dominate', () => {
    let state: LowFpsState = INITIAL_LOW_FPS;
    let fired = 0;
    for (let i = 0; i < 400; i += 1) {
      const step = stepLowFps(state, { atFloor: true, deltaMs: i % 4 === 0 ? 30 : 70 });
      state = step.state;
      if (step.fire) fired += 1;
    }
    expect(fired).toBe(1);
  });

  it('fires exactly once and stays quiet afterwards, even if the floor is left and re-entered', () => {
    const first = run(300, 60);
    expect(first.fired).toBe(1);
    const more = run(300, 60, { from: first.state });
    expect(more.fired).toBe(0);
    const reentered = run(300, 60, {
      from: stepLowFps(first.state, { atFloor: false, deltaMs: 16 }).state,
    });
    expect(reentered.fired).toBe(0);
  });
});
