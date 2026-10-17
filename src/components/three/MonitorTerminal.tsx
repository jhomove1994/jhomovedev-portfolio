// The terminal on the 3D monitor: the same <Terminal> and the same session as the 2D frame, so
// transcript, draft and history survive the swap. `TERMINAL_ON_SCREEN` picks how it reaches the
// glass: drei's <Html transform occlude> (CSS3D, its own React root) or a DOM overlay whose
// matrix3d is projected from the camera every frame. The overlay is the default: at metre scale
// the CSS3D camera sits ~2 CSS px from the content and Chrome paints and hit-tests the box about
// 150 px off its computed rect (see the apply notes), while the overlay stays pixel-exact.
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, type RefObject } from 'react';
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
  /** The sized box; the overlay driver writes its transform. */
  boxRef?: RefObject<HTMLDivElement | null>;
}

const mount = monitorMount();

function ScreenContent({ content, boxRef }: ScreenContentProps) {
  return (
    <div
      ref={boxRef}
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
      <ScreenContent content={content} />
    </Html>
  );
}

/** `overlay` mode, rendered outside the Canvas into the layer; `GlassDriver` positions it. */
export function OverlayTerminal({
  content,
  boxRef,
  layer,
}: ScreenContentProps & { layer: HTMLElement }) {
  return createPortal(<ScreenContent content={content} boxRef={boxRef} />, layer);
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
