import { describe, expect, it } from 'vitest';
import { stillAnchorProblems, type StillAnchor } from '../../../src/lib/hero/capture';
import { narrowStillLayout } from '../../../src/lib/hero/still-layout';
import stillAnchor from '../../../src/lib/hero/still-anchor.json';

const anchor = (patch: Partial<StillAnchor> = {}): StillAnchor => ({
  x: 0.5,
  y: 0.2,
  width: 0.4,
  height: 0.5,
  ...patch,
});

describe('narrowStillLayout', () => {
  it('scales the still so the glass fills the requested share of the width', () => {
    const l = narrowStillLayout(anchor(), {
      fill: 0.92,
      padTop: 0.04,
      padBottom: 0.14,
      aspect: 1.6,
    });
    expect(l.mediaWidth).toBeCloseTo(2.3, 6);
    expect(l.glassWidth).toBeCloseTo(0.92, 6);
    // 0.5 of a 1.4375-wide-by-1 media height: the glass is 0.71875 of the stage width tall.
    expect(l.glassHeight).toBeCloseTo(0.71875, 6);
  });

  it('centres the glass horizontally when the crop allows it, and crops with padding around it', () => {
    const l = narrowStillLayout(anchor(), {
      fill: 0.92,
      padTop: 0.04,
      padBottom: 0.14,
      aspect: 1.6,
    });
    expect(l.glassLeft).toBeCloseTo(0.04, 6);
    expect(l.glassTop).toBeCloseTo(0.04, 6);
    expect(l.boxHeight).toBeCloseTo(0.04 + 0.71875 + 0.14, 6);
    expect(l.mediaTop).toBeCloseTo(-(0.2 * 1.4375 - 0.04), 6);
  });

  it('never shows beyond the image: a glass near the right edge is pulled off-centre, not outside', () => {
    const l = narrowStillLayout(anchor({ x: 0.7, width: 0.3, height: 0.4 }), {
      fill: 0.92,
      padTop: 0.04,
      padBottom: 0.14,
      aspect: 1.6,
    });
    expect(l.mediaLeft + l.mediaWidth).toBeGreaterThanOrEqual(1 - 1e-9);
    expect(l.glassLeft).toBeGreaterThan(0.04);
    expect(l.glassLeft + l.glassWidth).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('trims the bottom padding where the image ends', () => {
    const l = narrowStillLayout(anchor({ y: 0.7, height: 0.3 }), {
      fill: 0.92,
      padTop: 0.04,
      padBottom: 0.14,
      aspect: 1.6,
    });
    expect(l.mediaTop + l.mediaWidth / 1.6).toBeGreaterThanOrEqual(l.boxHeight - 1e-9);
    expect(l.boxHeight).toBeLessThan(l.glassTop + l.glassHeight + 0.14);
  });

  it.each([
    anchor(),
    anchor({ x: 0.05, width: 0.3 }),
    anchor({ x: 0.65, width: 0.3, y: 0.55, height: 0.4 }),
    { ...stillAnchor },
  ])('keeps the glass inside the box and the image covering the box for %j', (a) => {
    const l = narrowStillLayout(a);
    const mediaHeight = l.mediaWidth / 1.6;
    expect(l.mediaLeft).toBeLessThanOrEqual(1e-9);
    expect(l.mediaLeft + l.mediaWidth).toBeGreaterThanOrEqual(1 - 1e-9);
    expect(l.mediaTop).toBeLessThanOrEqual(1e-9);
    expect(l.mediaTop + mediaHeight).toBeGreaterThanOrEqual(l.boxHeight - 1e-9);
    expect(l.glassLeft).toBeGreaterThanOrEqual(-1e-9);
    expect(l.glassLeft + l.glassWidth).toBeLessThanOrEqual(1 + 1e-9);
    expect(l.glassTop).toBeGreaterThanOrEqual(-1e-9);
    expect(l.glassTop + l.glassHeight).toBeLessThanOrEqual(l.boxHeight + 1e-9);
  });

  it('puts the committed glass above the fold on a 390x844 phone below the copy (box under 1 width)', () => {
    const l = narrowStillLayout(stillAnchor);
    expect(l.boxHeight).toBeLessThan(1);
  });
});

describe('stillAnchorProblems', () => {
  it('accepts the committed anchor', () => {
    expect(stillAnchorProblems(stillAnchor)).toEqual([]);
  });

  it('flags a glass that is too small to read', () => {
    const problems = stillAnchorProblems(anchor({ width: 0.2, height: 0.2 }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/width/);
  });

  it('flags a glass that sits under the hero copy', () => {
    const problems = stillAnchorProblems(anchor({ x: 0.2 }));
    expect(problems.some((p) => /copy/.test(p))).toBe(true);
  });

  it('flags a glass that leaves the frame on the right or the bottom', () => {
    expect(stillAnchorProblems(anchor({ x: 0.6, width: 0.4 })).some((p) => /right/.test(p))).toBe(
      true,
    );
    expect(stillAnchorProblems(anchor({ y: 0.6, height: 0.4 })).some((p) => /bottom/.test(p))).toBe(
      true,
    );
  });
});
