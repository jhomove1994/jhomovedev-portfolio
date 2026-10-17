/**
 * Lifecycle of the lazily loaded 3D scene and what the hero reports for it. Pure: the island
 * feeds events (chunk requested / loaded / failed) and renders the resolved view onto `#hero`.
 */
import type { HeroMode, HeroMotion, ModeDecision, ModeReason } from '../capabilities';

export type SceneState = 'idle' | 'loading' | 'ready' | 'error' | 'slow';
export type SceneEvent = 'request' | 'loaded' | 'failed' | 'slow' | 'reset';

export function reduceScene(state: SceneState, event: SceneEvent): SceneState {
  if (event === 'reset') return 'idle';
  // `error` and `slow` are final until a reset; an earlier failure stays the reason.
  if (state === 'error' || state === 'slow') return state;
  if (event === 'failed') return 'error';
  if (event === 'slow') return 'slow';
  if (event === 'request') return state === 'idle' ? 'loading' : state;
  return 'ready'; // 'loaded'
}

export interface HeroView {
  mode: HeroMode;
  reason: ModeReason;
  /** `reduced` under prefers-reduced-motion: the scene is shown, motionless. */
  motion: HeroMotion;
  state: SceneState;
}

/**
 * `#hero[data-hero-mode]` is `3d` only once the canvas is live: while it loads the static hero
 * (still + 2D terminal) stays, a failure reverts to it with reason `load-failed` and sustained
 * low fps with `low-fps`.
 */
export function resolveHeroView(decision: ModeDecision, scene: SceneState): HeroView {
  const { motion } = decision;
  if (decision.mode !== '3d') {
    return { mode: 'static', reason: decision.reason, motion, state: 'idle' };
  }
  if (scene === 'error') return { mode: 'static', reason: 'load-failed', motion, state: 'error' };
  // Sustained low fps: nothing failed, so the hero reports idle. Not persisted, a reload retries.
  if (scene === 'slow') return { mode: 'static', reason: 'low-fps', motion, state: 'idle' };
  if (scene === 'ready') return { mode: '3d', reason: decision.reason, motion, state: 'ready' };
  return { mode: 'static', reason: decision.reason, motion, state: scene };
}

export interface MotionPolicy {
  /** Camera drifts toward the pointer. */
  parallax: boolean;
  /** Lenis smooth scroll, the ScrollTrigger pin and the zoom into the monitor. */
  scrollZoom: boolean;
  /** The intro `whoami` is typed instead of printed at once. */
  typeIntro: boolean;
  /** The canvas renders every frame (otherwise on demand, camera parked at the rest pose). */
  continuousFrames: boolean;
}

/** What each motion level allows in the 3D hero (decision: reduced motion shows a still scene). */
export function motionPolicy(motion: HeroMotion): MotionPolicy {
  const full = motion === 'full';
  return { parallax: full, scrollZoom: full, typeIntro: full, continuousFrames: full };
}

export interface FrameloopInputs {
  inViewport: boolean;
  documentHidden: boolean;
  motion: HeroMotion;
}

/**
 * R3F `frameloop`: render only while the hero is on screen and the tab is visible; under reduced
 * motion frames are drawn on demand (resize, load) because nothing animates.
 */
export function frameloopFor({
  inViewport,
  documentHidden,
  motion,
}: FrameloopInputs): 'always' | 'demand' | 'never' {
  if (!inViewport || documentHidden) return 'never';
  return motionPolicy(motion).continuousFrames ? 'always' : 'demand';
}

/**
 * The render-count probe (`window.__heroRenderCount`) exists for e2e and the capture script only:
 * `?capture=1`, or `?3d=1&probe=1`. Ordinary visitors never get a global.
 */
export function probeEnabled(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get('capture') === '1' || (params.get('3d') === '1' && params.get('probe') === '1');
}

/** The capture script's hooks (`window.__heroCapture`, the `[data-capture]` styling): `?capture=1`. */
export function captureEnabled(search: string): boolean {
  return new URLSearchParams(search).get('capture') === '1';
}
