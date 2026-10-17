// Hero island (`client:visible`): owns the terminal session and the hero mode. The server renders
// the static transcript; once hydrated it decides the mode, reflects it on `#hero` for CSS and
// tests, and shows the 3D toggle. The 3D scene is a dynamic import, so the static path never
// downloads three, R3F or the model.
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
} from 'react';
import {
  browserModeDeps,
  createModeController,
  type HeroModeController,
  type HeroModeState,
} from '../../lib/hero/mode-controller';
import { reduceScene, resolveHeroView } from '../../lib/hero/scene-state';
import { createTerminalSession } from '../../lib/terminal/session';
import type { TerminalData, TerminalLabels } from '../../lib/terminal/types';
import type { DeskExperienceProps } from '../three/DeskExperience';
import { Terminal } from '../terminal/Terminal';
import { ModeToggle } from './ModeToggle';

export interface HeroChrome {
  enable3d: string;
  disable3d: string;
  bootLoading: string;
}

type DeskExperienceComponent = ComponentType<DeskExperienceProps>;

interface HeroIslandProps {
  data: TerminalData;
  labels: TerminalLabels;
  chrome: HeroChrome;
}

// Created on first client read: the controller needs `window`, which the server render lacks.
let controller: HeroModeController | undefined;
function getController(): HeroModeController {
  controller ??= createModeController(browserModeDeps());
  return controller;
}

/** From this width the terminal can live on the 3D monitor; below it the 2D frame stays. */
const DESKTOP_QUERY = '(min-width: 1024px)';
const subscribeDesktop = (listener: () => void) => {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
};
const getDesktop = () => window.matchMedia(DESKTOP_QUERY).matches;
const getServerDesktop = () => false;

const subscribe = (listener: () => void) => getController().subscribe(listener);
const getSnapshot = (): HeroModeState | null => getController().getSnapshot();
const getServerSnapshot = (): HeroModeState | null => null;

export function HeroIsland({ data, labels, chrome }: HeroIslandProps) {
  const [session] = useState(() => createTerminalSession(data, labels));
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [scene, dispatch] = useReducer(reduceScene, 'idle');
  const [Experience, setExperience] = useState<DeskExperienceComponent | null>(null);
  const desktop = useSyncExternalStore(subscribeDesktop, getDesktop, getServerDesktop);
  const focusHandoffRef = useRef(false);
  // The 2D input may be focused when it is replaced by the monitor's: remember it as it leaves.
  const frameRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    return () => {
      focusHandoffRef.current = node.contains(document.activeElement);
    };
  }, []);

  const wants3d = mode?.decision.mode === '3d';
  // Nothing has settled yet for a 3D decision: that is the loading state, derived not stored.
  const sceneState = wants3d && scene === 'idle' ? 'loading' : scene;
  const view = mode ? resolveHeroView(mode.decision, sceneState) : null;
  const viewMode = view?.mode;
  const viewReason = view?.reason;
  const viewState = view?.state;

  // The scene chunk is requested only for a 3D decision; a failed import reverts to static.
  useEffect(() => {
    if (!wants3d || Experience) return;
    let cancelled = false;
    import('../three/DeskExperience').then(
      (module) => {
        if (!cancelled) setExperience(() => module.DeskExperience);
      },
      () => {
        if (!cancelled) dispatch('failed');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [wants3d, Experience]);

  // Hooks for CSS and e2e. Written on the server-rendered section, never replacing its markup.
  useEffect(() => {
    const hero = document.getElementById('hero');
    if (!hero || !viewMode || !viewReason || !viewState) return;
    hero.dataset.heroMode = viewMode;
    hero.dataset.heroReason = viewReason;
    hero.dataset.heroState = viewState;
  }, [viewMode, viewReason, viewState]);

  const hero = typeof document === 'undefined' ? null : document.getElementById('hero');
  const container = hero?.querySelector<HTMLElement>('.hero-still') ?? null;
  const showScene =
    wants3d &&
    Experience !== null &&
    sceneState !== 'error' &&
    sceneState !== 'slow' &&
    hero &&
    container;

  // In 3D on a desktop the monitor is the terminal: the 2D frame must not cover the canvas.
  const terminalOnMonitor = viewMode === '3d' && desktop;

  return (
    <div className="hero-island">
      {terminalOnMonitor ? null : (
        <div className="hero-frame" ref={frameRef}>
          <Terminal session={session} data={data} labels={labels} />
        </div>
      )}
      {showScene ? (
        <Experience
          container={container}
          observed={hero}
          bootLabel={chrome.bootLoading}
          onReady={() => dispatch('loaded')}
          onError={() => dispatch('failed')}
          onLowFps={() => dispatch('slow')}
          terminal={desktop ? { session, data, labels } : null}
          focusHandoffRef={focusHandoffRef}
        />
      ) : null}
      {mode?.decision.toggle.available ? (
        <div className="hero-controls">
          <ModeToggle
            pressed={wants3d}
            label={wants3d ? chrome.disable3d : chrome.enable3d}
            onToggle={() => {
              dispatch('reset');
              getController().setOverride(wants3d ? 'off' : 'on');
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
