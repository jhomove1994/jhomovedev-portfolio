import { describe, expect, it } from 'vitest';
import { motionMode, motionProfile } from '../../../src/lib/motion/mode';

describe('motionMode', () => {
  it('is reduced when the reader prefers reduced motion', () => {
    expect(motionMode(true)).toBe('reduced');
  });

  it('is full otherwise', () => {
    expect(motionMode(false)).toBe('full');
  });
});

describe('motionProfile', () => {
  it('keeps everything in full mode', () => {
    expect(motionProfile('full')).toEqual({
      htmlClasses: ['motion'],
      typeCommand: true,
      fadeItems: true,
      displace: true,
      scrubRail: true,
      growGraph: true,
      typeCommitHeads: true,
      pulseHead: true,
      progressBar: true,
    });
  });

  it('keeps typing and fades in reduced mode but drops every displacement', () => {
    const profile = motionProfile('reduced');
    expect(profile.htmlClasses).toEqual(['motion', 'motion-reduced']);
    expect(profile.typeCommand).toBe(true);
    expect(profile.fadeItems).toBe(true);
    expect(profile.displace).toBe(false);
    expect(profile.scrubRail).toBe(false);
    expect(profile.growGraph).toBe(false);
    expect(profile.typeCommitHeads).toBe(false);
    expect(profile.pulseHead).toBe(false);
    expect(profile.progressBar).toBe(false);
  });
});
