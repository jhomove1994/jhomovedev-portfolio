// The 3D hero: an R3F canvas laid over the static still's box (so the page never shifts), paused
// whenever the hero is off screen or the tab is hidden, stepped down a quality tier when frames
// get slow, and reverted to static by the island on any failure. Only reachable through the
// dynamic import in HeroIsland.
import { PerformanceMonitor, useProgress } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { DESKTOP_ASPECT, restCameraFor } from '../../lib/hero/layout';
import { TERMINAL_ON_SCREEN } from '../../lib/hero/monitor';
import { frameloopFor, probeEnabled } from '../../lib/hero/scene-state';
import {
  FLOOR_TIER,
  INITIAL_LOW_FPS,
  TIER_SETTINGS,
  reduceTier,
  stepLowFps,
  type Tier,
  type TierEvent,
} from '../../lib/hero/tiers';
import { BootLoader } from '../hero/BootLoader';
import { DeskScene } from './DeskScene';
import {
  GlassDriver,
  HtmlMonitorTerminal,
  OverlayTerminal,
  type MonitorTerminalContent,
} from './MonitorTerminal';
import { useParallaxEnabled } from './Parallax';

declare global {
  interface Window {
    /** Frames rendered since mount; only defined for e2e and capture runs (see `probeEnabled`). */
    __heroRenderCount?: number;
  }
}

export interface DeskExperienceProps {
  /** The still's box: the canvas is portalled into it and fills it. */
  container: HTMLElement;
  /** The hero section, observed to pause rendering off screen. */
  observed: HTMLElement;
  bootLabel: string;
  onReady: () => void;
  /** Import, GLB or WebGL failure: the island reverts to static. */
  onError: () => void;
  /** The floor tier is still too slow (S12): the island reverts to static, once. */
  onLowFps: () => void;
  /** The terminal to put on the monitor, or `null` below 1024px where the 2D frame stays. */
  terminal: MonitorTerminalContent | null;
  /** Written when the monitor terminal takes over from a focused 2D input. */
  focusHandoffRef: RefObject<boolean>;
}

/** Catches errors thrown while loading the GLB or rendering the scene. */
class SceneBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Counts rendered frames so tests can tell a paused canvas from a running one. */
function RenderProbe() {
  useFrame(() => {
    window.__heroRenderCount = (window.__heroRenderCount ?? 0) + 1;
  });
  return null;
}

/** Feeds frame times to the pure sustained-low-fps rule; fires `onLowFps` at most once. */
function LowFpsWatch({ atFloor, onLowFps }: { atFloor: boolean; onLowFps: () => void }) {
  const state = useRef(INITIAL_LOW_FPS);
  useFrame((_, delta) => {
    const step = stepLowFps(state.current, { atFloor, deltaMs: delta * 1000 });
    state.current = step.state;
    if (step.fire) onLowFps();
  });
  return null;
}

function useActive(observed: HTMLElement): boolean {
  const [inViewport, setInViewport] = useState(true);
  const [documentHidden, setDocumentHidden] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setInViewport(entry.isIntersecting);
    });
    observer.observe(observed);
    const onVisibility = () => setDocumentHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [observed]);
  return frameloopFor({ inViewport, documentHidden }) === 'always';
}

// Before the first frame the rig has not read the canvas size yet; the desktop pose is a good guess.
const initialPose = restCameraFor(DESKTOP_ASPECT);

export function DeskExperience({
  container,
  observed,
  bootLabel,
  onReady,
  onError,
  onLowFps,
  terminal,
  focusHandoffRef,
}: DeskExperienceProps) {
  const [tier, setTier] = useState<Tier>('high');
  const [ready, setReady] = useState(false);
  const active = useActive(observed);
  const parallax = useParallaxEnabled();
  // The layer is both a ref (drei's `portal`) and state (the overlay portals into it).
  const screenLayerRef = useRef<HTMLDivElement | null>(null);
  const [screenLayer, setScreenLayer] = useState<HTMLDivElement | null>(null);
  const attachLayer = useCallback((node: HTMLDivElement | null) => {
    screenLayerRef.current = node;
    setScreenLayer(node);
  }, []);
  const overlayBoxRef = useRef<HTMLDivElement | null>(null);
  const { progress } = useProgress();
  const [probe] = useState(() => probeEnabled(window.location.search));
  const step = (event: TierEvent) => setTier((current) => reduceTier(current, event).tier);
  const settings = TIER_SETTINGS[tier];

  return createPortal(
    <>
      <div className="hero-canvas" data-ready={ready || undefined} aria-hidden="true">
        <SceneBoundary onError={onError}>
          <Canvas
            frameloop={active ? 'always' : 'never'}
            dpr={settings.dpr}
            camera={{
              fov: initialPose.fov,
              near: 0.05,
              far: 20,
              position: initialPose.position as [number, number, number],
            }}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
              gl.domElement.setAttribute('aria-hidden', 'true');
              // A lost context cannot be drawn to again: hand the hero back to the still.
              gl.domElement.addEventListener('webglcontextlost', (event) => {
                event.preventDefault();
                onError();
              });
            }}
          >
            <PerformanceMonitor
              flipflops={3}
              onDecline={() => step('decline')}
              onIncline={() => step('incline')}
              onFallback={() => step('fallback')}
            />
            <LowFpsWatch atFloor={tier === FLOOR_TIER} onLowFps={onLowFps} />
            {probe ? <RenderProbe /> : null}
            {ready && terminal && TERMINAL_ON_SCREEN === 'html' ? (
              <HtmlMonitorTerminal
                content={terminal}
                handoffRef={focusHandoffRef}
                layerRef={screenLayerRef}
              />
            ) : null}
            {ready && terminal && TERMINAL_ON_SCREEN === 'overlay' ? (
              <GlassDriver boxRef={overlayBoxRef} />
            ) : null}
            <DeskScene
              shadows={settings.contactShadows}
              parallax={parallax}
              onReady={() => {
                setReady(true);
                onReady();
              }}
            />
          </Canvas>
        </SceneBoundary>
        {ready ? null : <BootLoader progress={progress} label={bootLabel} />}
      </div>
      {/* Not aria-hidden: the terminal on the monitor is real, readable DOM. */}
      <div ref={attachLayer} className="hero-screen-layer" />
      {ready && terminal && TERMINAL_ON_SCREEN === 'overlay' && screenLayer ? (
        <OverlayTerminal
          content={terminal}
          handoffRef={focusHandoffRef}
          boxRef={overlayBoxRef}
          layer={screenLayer}
        />
      ) : null}
    </>,
    container,
  );
}
