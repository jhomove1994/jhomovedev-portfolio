// Pure hero-mode decision logic. No DOM, no astro:* and no framework imports: the browser
// adapter lives in `capabilities-env.ts` and feeds this module plain values.

export type HeroMode = 'static' | '3d';

/** Explicit user choice: `on` forces 3D where allowed, `off` forces the static hero. */
export type ModeOverride = 'on' | 'off' | null;

/** How much the 3D hero may move: `reduced` freezes parallax, zoom, smooth scroll and typing. */
export type HeroMotion = 'full' | 'reduced';

export type ModeReason =
  | 'no-webgl2'
  | 'override-off'
  | 'override-on'
  | 'mobile'
  | 'low-end'
  | 'software-renderer'
  | 'default'
  // Reported by the island, never returned by decideMode:
  | 'load-failed'
  | 'low-fps';

/** Device readings gathered by the browser adapter. Missing hardware signals are `undefined`. */
export interface EnvSnapshot {
  webgl2: boolean;
  /** WebGL2 exists but only behind a major performance caveat (software rasterizer). */
  softwareRenderer?: boolean;
  reducedMotion: boolean;
  isMobile: boolean;
  cores?: number;
  /** `navigator.deviceMemory` in GB. */
  memory?: number;
}

export interface ModeInput extends EnvSnapshot {
  override: ModeOverride;
}

export interface ModeDecision {
  mode: HeroMode;
  reason: ModeReason;
  motion: HeroMotion;
  toggle: { available: boolean; target: HeroMode };
}

export const HERO_MODE_STORAGE_KEY = 'jhomove:hero-mode';
export const HERO_MODE_QUERY_PARAM = '3d';

const LOW_END_MAX_CORES = 2;
const LOW_END_MAX_MEMORY_GB = 2;

/** Desktop low-end heuristic. A missing signal never counts as low-end. */
export function isLowEnd(env: EnvSnapshot): boolean {
  const fewCores = env.cores !== undefined && env.cores <= LOW_END_MAX_CORES;
  const littleMemory = env.memory !== undefined && env.memory <= LOW_END_MAX_MEMORY_GB;
  return fewCores || littleMemory;
}

type Verdict = Pick<ModeDecision, 'mode' | 'reason'>;

function pickVerdict(input: ModeInput): Verdict {
  if (!input.webgl2) return { mode: 'static', reason: 'no-webgl2' };
  if (input.override === 'off') return { mode: 'static', reason: 'override-off' };
  if (input.override === 'on') return { mode: '3d', reason: 'override-on' };
  if (input.isMobile) return { mode: 'static', reason: 'mobile' };
  if (isLowEnd(input)) return { mode: 'static', reason: 'low-end' };
  if (input.softwareRenderer) return { mode: 'static', reason: 'software-renderer' };
  return { mode: '3d', reason: 'default' };
}

/**
 * Precedence: no WebGL2 > override off > override on > mobile > low-end > software renderer > 3D.
 * An `on` override only bypasses the heuristics, never a hard limit. Reduced motion does not pick
 * the mode: it only sets `motion`, so the visitor still gets the (motionless) 3D scene.
 */
export function decideMode(input: ModeInput): ModeDecision {
  const verdict = pickVerdict(input);
  return {
    ...verdict,
    motion: input.reducedMotion ? 'reduced' : 'full',
    toggle: {
      available: input.webgl2,
      target: verdict.mode === '3d' ? 'static' : '3d',
    },
  };
}

export function parseOverrideValue(raw: string | null): ModeOverride {
  if (raw === '1') return 'on';
  if (raw === '0') return 'off';
  return null;
}

export function overrideToStored(override: Exclude<ModeOverride, null>): '1' | '0' {
  return override === 'on' ? '1' : '0';
}

export interface ResolvedOverride {
  override: ModeOverride;
  /** Value the adapter should write to storage: only a valid query value is persisted. */
  persist: '1' | '0' | null;
}

/** `?3d=0|1` wins over the stored value; invalid values are ignored. */
export function resolveOverride(src: {
  query: string | null;
  stored: string | null;
}): ResolvedOverride {
  const fromQuery = parseOverrideValue(src.query);
  if (fromQuery) return { override: fromQuery, persist: overrideToStored(fromQuery) };
  return { override: parseOverrideValue(src.stored), persist: null };
}
