// The 3D hero: an R3F canvas laid over the static still's box (so the page never shifts), paused
// whenever the hero is off screen or the tab is hidden, stepped down a quality tier when frames
// get slow, and reverted to static by the island on any failure. Only reachable through the
// dynamic import in HeroIsland.
import { PerformanceMonitor, useProgress } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Component, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { REST_CAMERA } from '../../lib/hero/layout';
import { frameloopFor, probeEnabled } from '../../lib/hero/scene-state';
import { TIER_SETTINGS, reduceTier, type Tier, type TierEvent } from '../../lib/hero/tiers';
import { BootLoader } from '../hero/BootLoader';
import { DeskScene } from './DeskScene';

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

export function DeskExperience({
  container,
  observed,
  bootLabel,
  onReady,
  onError,
}: DeskExperienceProps) {
  const [tier, setTier] = useState<Tier>('high');
  const [ready, setReady] = useState(false);
  const active = useActive(observed);
  const { progress } = useProgress();
  const [probe] = useState(() => probeEnabled(window.location.search));
  const step = (event: TierEvent) => setTier((current) => reduceTier(current, event).tier);
  const settings = TIER_SETTINGS[tier];

  return createPortal(
    <div className="hero-canvas" data-ready={ready || undefined} aria-hidden="true">
      <SceneBoundary onError={onError}>
        <Canvas
          frameloop={active ? 'always' : 'never'}
          dpr={settings.dpr}
          camera={{
            fov: REST_CAMERA.fov,
            near: 0.05,
            far: 20,
            position: REST_CAMERA.position as [number, number, number],
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
          {probe ? <RenderProbe /> : null}
          <DeskScene
            shadows={settings.contactShadows}
            onReady={() => {
              setReady(true);
              onReady();
            }}
          />
        </Canvas>
      </SceneBoundary>
      {ready ? null : <BootLoader progress={progress} label={bootLabel} />}
    </div>,
    container,
  );
}
