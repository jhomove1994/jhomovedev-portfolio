// The terminal on the 3D monitor: the same <Terminal> and the same session as the 2D frame, so
// transcript, draft and history survive the swap. `TERMINAL_ON_SCREEN` picks how it reaches the
// glass: drei's <Html transform occlude> (CSS3D, its own React root) or a DOM overlay whose
// matrix3d is projected from the camera every frame. The overlay is the default: at metre scale
// the CSS3D camera sits ~2 CSS px from the content and Chrome paints and hit-tests the box about
// 150 px off its computed rect (see the apply notes), while the overlay stays pixel-exact.
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Vector3 } from 'three';
import { monitorMount, screenCorners } from '../../lib/hero/monitor';
import { matrix3dCss, projectRect, quadToMatrix3d } from '../../lib/hero/zoom';
import type { TerminalSession } from '../../lib/terminal/session';
import type { TerminalData, TerminalLabels } from '../../lib/terminal/types';
import { Terminal } from '../terminal/Terminal';

export interface MonitorTerminalContent {
  session: TerminalSession;
  data: TerminalData;
  labels: TerminalLabels;
}

interface ScreenContentProps {
  content: MonitorTerminalContent;
  /** True when the 2D terminal's input had focus as it left: the new input takes it over. */
  handoffRef: RefObject<boolean>;
  /** The sized box; the overlay driver writes its transform. */
  boxRef?: RefObject<HTMLDivElement | null>;
}

const mount = monitorMount();

function ScreenContent({ content, handoffRef, boxRef }: ScreenContentProps) {
  const own = useRef<HTMLDivElement>(null);
  const box = boxRef ?? own;

  // Runs once, when the monitor first shows the terminal: type `whoami` unless the visitor already
  // typed (the session refuses) or asked for less motion (it then shows the finished state).
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    content.session.playIntro({ animate: !reduced });
    if (handoffRef.current) {
      handoffRef.current = false;
      const input = box.current?.querySelector('input');
      if (input) {
        input.focus({ preventScroll: true });
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  }, [content.session, handoffRef, box]);

  return (
    <div
      ref={box}
      className="monitor-terminal"
      style={{ width: mount.cssWidth, height: mount.cssHeight }}
    >
      <Terminal session={content.session} data={content.data} labels={content.labels} />
    </div>
  );
}

/** `html` mode, rendered inside the Canvas: drei mounts the DOM in `layerRef`. */
export function HtmlMonitorTerminal({
  content,
  handoffRef,
  layerRef,
}: ScreenContentProps & { layerRef: RefObject<HTMLElement | null> }) {
  return (
    <Html
      transform
      occlude
      portal={layerRef as RefObject<HTMLElement>}
      position={mount.position}
      rotation={mount.rotation}
      scale={mount.scale}
    >
      <ScreenContent content={content} handoffRef={handoffRef} />
    </Html>
  );
}

/** `overlay` mode, rendered outside the Canvas into the layer; `GlassDriver` positions it. */
export function OverlayTerminal({
  content,
  handoffRef,
  boxRef,
  layer,
}: ScreenContentProps & { layer: HTMLElement }) {
  return createPortal(
    <ScreenContent content={content} handoffRef={handoffRef} boxRef={boxRef} />,
    layer,
  );
}

/**
 * Inside the Canvas, after the camera rig: projects the four glass corners with the live camera
 * and fits the terminal box onto them with a perspective matrix, every frame.
 */
export function GlassDriver({ boxRef }: { boxRef: RefObject<HTMLDivElement | null> }) {
  const corners = useMemo(() => screenCorners(), []);
  const scratch = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }) => {
    const box = boxRef.current;
    if (!box) return;
    camera.updateMatrixWorld();
    const quad = projectRect(
      corners,
      ([x, y, z]) => {
        scratch.set(x, y, z).project(camera);
        return { x: scratch.x, y: scratch.y };
      },
      size,
    );
    box.style.transform = matrix3dCss(quadToMatrix3d(mount.cssWidth, mount.cssHeight, quad));
    box.dataset.placed = '';
  });
  return null;
}
