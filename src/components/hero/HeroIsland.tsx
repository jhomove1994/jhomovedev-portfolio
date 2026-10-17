// Hero island (`client:visible`): owns the terminal session and the hero mode. The server renders
// the static transcript; once hydrated it decides the mode, reflects it on `#hero` for CSS and
// tests, and shows the 3D toggle. The 3D scene itself is wired in a later change.
import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  browserModeDeps,
  createModeController,
  type HeroModeController,
  type HeroModeState,
} from '../../lib/hero/mode-controller';
import { createTerminalSession } from '../../lib/terminal/session';
import type { TerminalData, TerminalLabels } from '../../lib/terminal/types';
import { Terminal } from '../terminal/Terminal';
import { ModeToggle } from './ModeToggle';

export interface HeroChrome {
  enable3d: string;
  disable3d: string;
}

// Flip once the 3D scene is wired in (dynamic import, `loading` -> `ready`). Until then a 3D
// decision keeps the 2D terminal and reports `unavailable`, so nobody waits on a loader.
const SCENE_WIRED = false;

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

const subscribe = (listener: () => void) => getController().subscribe(listener);
const getSnapshot = (): HeroModeState | null => getController().getSnapshot();
const getServerSnapshot = (): HeroModeState | null => null;

export function HeroIsland({ data, labels, chrome }: HeroIslandProps) {
  const [session] = useState(() => createTerminalSession(data, labels));
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Hooks for CSS and e2e. Written on the server-rendered section, never replacing its markup.
  useEffect(() => {
    const hero = document.getElementById('hero');
    if (!hero || mode === null) return;
    hero.dataset.heroMode = mode.decision.mode;
    hero.dataset.heroReason = mode.decision.reason;
    if (mode.decision.mode === '3d') {
      hero.dataset.heroState = SCENE_WIRED ? 'loading' : 'unavailable';
    } else {
      hero.dataset.heroState = 'idle';
    }
  }, [mode]);

  const is3d = mode?.decision.mode === '3d';

  return (
    <div className="hero-island">
      <div className="hero-frame">
        <Terminal session={session} data={data} labels={labels} />
      </div>
      {mode?.decision.toggle.available ? (
        <div className="hero-controls">
          <ModeToggle
            pressed={is3d}
            label={is3d ? chrome.disable3d : chrome.enable3d}
            onToggle={() => getController().setOverride(is3d ? 'off' : 'on')}
          />
        </div>
      ) : null}
    </div>
  );
}
