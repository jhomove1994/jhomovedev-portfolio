// The 3D hero: an R3F canvas laid over the static still's box (so the page never shifts), paused
// whenever the hero is off screen or the tab is hidden, stepped down a quality tier when frames
// get slow, and reverted to static by the island on any failure. Only reachable through the
// dynamic import in HeroIsland.
import { PerformanceMonitor, useProgress } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
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
import { Vector3 } from 'three';
import { stillAnchorFromQuad, type StillAnchor } from '../../lib/hero/capture';
import { DESKTOP_ASPECT, restCameraFor } from '../../lib/hero/layout';
import { TERMINAL_ON_SCREEN, screenCorners } from '../../lib/hero/monitor';
import type { HeroMotion } from '../../lib/capabilities';
import {
  captureEnabled,
  frameloopFor,
  motionPolicy,
  probeEnabled,
} from '../../lib/hero/scene-state';
import {
  BLOOM_SETTINGS,
  FLOOR_TIER,
  INITIAL_LOW_FPS,
  TIER_SETTINGS,
  reduceTier,
  stepLowFps,
  type Tier,
  type TierEvent,
} from '../../lib/hero/tiers';
import { createZoomStore, projectRect, type ZoomStore } from '../../lib/hero/zoom';
import { BootLoader } from '../hero/BootLoader';
import { DeskScene } from './DeskScene';
import {
  GlassDriver,
  HtmlMonitorTerminal,
  OverlayTerminal,
  type MonitorTerminalContent,
} from './MonitorTerminal';
import { useParallaxEnabled } from './Parallax';
import { startScrollZoom } from './scroll/ScrollZoom';

declare global {
  interface Window {
    /** Frames rendered since mount; only defined for e2e and capture runs (see `probeEnabled`). */
    __heroRenderCount?: number;
    /** Only defined for `?capture=1`: where the monitor glass sits in the stage right now. */
    __heroCapture?: { screenRect: () => StillAnchor };
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
  /** `reduced`: motionless scene (no parallax, zoom, smooth scroll or typing; frames on demand). */
  motion: HeroMotion;
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

/** Publishes the glass rect for the capture script, which writes it to `still-anchor.json`. */
function CaptureProbe() {
  const get = useThree((state) => state.get);
  useEffect(() => {
    const corners = screenCorners();
    const scratch = new Vector3();
    window.__heroCapture = {
      screenRect: () => {
        const { camera, size } = get();
        camera.updateMatrixWorld();
        const quad = projectRect(
          corners,
          ([x, y, z]) => {
            scratch.set(x, y, z).project(camera);
            return { x: scratch.x, y: scratch.y };
          },
          size,
        );
        return stillAnchorFromQuad(quad, size);
      },
    };
    return () => {
      delete window.__heroCapture;
    };
  }, [get]);
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

/**
 * Starts the scroll zoom once the scene is up and tears it down with it (mode switch, failure).
 * The load is async, so a teardown that arrives first cancels the start.
 */
function useScrollZoom(hero: HTMLElement, zoom: ZoomStore, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let stop: (() => void) | undefined;
    startScrollZoom({ hero, zoom }).then(
      (teardown) => {
        if (cancelled) teardown();
        else stop = teardown;
      },
      // Without the zoom the scene is still a good hero: native scrolling stays.
      () => undefined,
    );
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [hero, zoom, enabled]);
}

/** Frames drawn after a change while rendering on demand: enough for load, layout and glass. */
const DEMAND_SETTLE_FRAMES = 4;

/**
 * Under `frameloop="demand"` nothing draws until asked: this asks for a few frames whenever
 * `token` changes (scene ready, tier, back in view) so the rest pose and the glass are placed.
 */
function DemandKick({ token }: { token: string }) {
  const invalidate = useThree((state) => state.invalidate);
  const left = useRef(0);
  useEffect(() => {
    left.current = DEMAND_SETTLE_FRAMES;
    invalidate();
  }, [token, invalidate]);
  useFrame(() => {
    if (left.current <= 0) return;
    left.current -= 1;
    if (left.current > 0) invalidate();
  });
  return null;
}

function useActive(observed: HTMLElement, motion: HeroMotion): 'always' | 'demand' | 'never' {
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
  return frameloopFor({ inViewport, documentHidden, motion });
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
  motion,
  terminal,
  focusHandoffRef,
}: DeskExperienceProps) {
  const [tier, setTier] = useState<Tier>('high');
  const [ready, setReady] = useState(false);
  const policy = motionPolicy(motion);
  const frameloop = useActive(observed, motion);
  const parallax = useParallaxEnabled(policy.parallax);
  const [zoom] = useState(createZoomStore);
  useScrollZoom(observed, zoom, ready && terminal !== null && policy.scrollZoom);
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
  const [capture] = useState(() => captureEnabled(window.location.search));
  const step = (event: TierEvent) => setTier((current) => reduceTier(current, event).tier);
  const settings = TIER_SETTINGS[tier];

  return createPortal(
    <>
      <div className="hero-canvas" data-ready={ready || undefined} aria-hidden="true">
        <SceneBoundary onError={onError}>
          <Canvas
            frameloop={frameloop}
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
            {policy.continuousFrames ? (
              <PerformanceMonitor
                flipflops={3}
                onDecline={() => step('decline')}
                onIncline={() => step('incline')}
                onFallback={() => step('fallback')}
              />
            ) : (
              <DemandKick token={`${ready}|${tier}|${frameloop}`} />
            )}
            {settings.bloom ? (
              <EffectComposer multisampling={0}>
                <Bloom
                  mipmapBlur
                  luminanceThreshold={BLOOM_SETTINGS.threshold}
                  intensity={BLOOM_SETTINGS.intensity}
                />
                <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              </EffectComposer>
            ) : null}
            {/* Frames are sparse on demand, so frame times say nothing about performance. */}
            {policy.continuousFrames ? (
              <LowFpsWatch atFloor={tier === FLOOR_TIER} onLowFps={onLowFps} />
            ) : null}
            {probe ? <RenderProbe /> : null}
            {capture ? <CaptureProbe /> : null}
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
              zoom={zoom}
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
