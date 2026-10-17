/** `full` is the whole show; `reduced` keeps typing and opacity fades but nothing that moves. */
export type MotionMode = 'full' | 'reduced';

/** Which behaviours of the section motion apply in a mode. */
export interface MotionProfile {
  /** Classes put on <html> once the script confirmed motion (CSS hides and offsets only then). */
  htmlClasses: string[];
  /** Each section types its command line. */
  typeCommand: boolean;
  /** Content and rows appear one after another with an opacity fade. */
  fadeItems: boolean;
  /** Entering content slides or scales into place (translate, scale, tilt). */
  displace: boolean;
  /** The experience rail fill follows the scroll. */
  scrubRail: boolean;
  /** The git graph line grows down to each commit as it appears. */
  growGraph: boolean;
  /** Each commit header is typed out. */
  typeCommitHeads: boolean;
  /** The HEAD node pulses. */
  pulseHead: boolean;
  /** The sticky scroll progress bar is shown. */
  progressBar: boolean;
}

export function motionMode(prefersReduced: boolean): MotionMode {
  return prefersReduced ? 'reduced' : 'full';
}

export function motionProfile(mode: MotionMode): MotionProfile {
  const full = mode === 'full';
  return {
    htmlClasses: full ? ['motion'] : ['motion', 'motion-reduced'],
    typeCommand: true,
    fadeItems: true,
    displace: full,
    scrubRail: full,
    growGraph: full,
    typeCommitHeads: full,
    pulseHead: full,
    progressBar: full,
  };
}
