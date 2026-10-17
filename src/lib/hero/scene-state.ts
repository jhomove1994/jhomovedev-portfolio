/**
 * Lifecycle of the lazily loaded 3D scene and what the hero reports for it. Pure: the island
 * feeds events (chunk requested / loaded / failed) and renders the resolved view onto `#hero`.
 */
import type { HeroMode, ModeDecision, ModeReason } from '../capabilities';

export type SceneState = 'idle' | 'loading' | 'ready' | 'error';
export type SceneEvent = 'request' | 'loaded' | 'failed' | 'reset';

export function reduceScene(state: SceneState, event: SceneEvent): SceneState {
  if (event === 'reset') return 'idle';
  if (state === 'error') return 'error';
  if (event === 'failed') return 'error';
  if (event === 'request') return state === 'idle' ? 'loading' : state;
  return 'ready'; // 'loaded'
}

export interface HeroView {
  mode: HeroMode;
  reason: ModeReason;
  state: SceneState;
}

/**
 * `#hero[data-hero-mode]` is `3d` only once the canvas is live: while it loads the static hero
 * (still + 2D terminal) stays, and a failure reverts to it with reason `load-failed`.
 */
export function resolveHeroView(decision: ModeDecision, scene: SceneState): HeroView {
  if (decision.mode !== '3d') {
    return { mode: 'static', reason: decision.reason, state: 'idle' };
  }
  if (scene === 'error') return { mode: 'static', reason: 'load-failed', state: 'error' };
  if (scene === 'ready') return { mode: '3d', reason: decision.reason, state: 'ready' };
  return { mode: 'static', reason: decision.reason, state: scene };
}

export interface FrameloopInputs {
  inViewport: boolean;
  documentHidden: boolean;
}

/** R3F `frameloop`: render only while the hero is on screen and the tab is visible. */
export function frameloopFor({ inViewport, documentHidden }: FrameloopInputs): 'always' | 'never' {
  return inViewport && !documentHidden ? 'always' : 'never';
}

/**
 * The render-count probe (`window.__heroRenderCount`) exists for e2e and the capture script only:
 * `?capture=1`, or `?3d=1&probe=1`. Ordinary visitors never get a global.
 */
export function probeEnabled(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get('capture') === '1' || (params.get('3d') === '1' && params.get('probe') === '1');
}
