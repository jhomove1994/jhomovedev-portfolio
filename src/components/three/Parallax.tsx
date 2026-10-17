// Camera rig: holds the rest pose and, on fine pointers with motion allowed, drifts the camera a
// few centimetres toward the cursor. The maths lives in `lib/hero/parallax.ts`; this file only
// listens to the pointer and writes the camera. It replaces the static rest camera. While the
// page scrolls (desktop 3D) it also dollies from the rest pose to a head-on view of the monitor.
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { PerspectiveCamera } from 'three';
import { cameraView } from '../../lib/hero/frame';
import { DESKTOP_ASPECT, restCameraFor, stillCameraFor } from '../../lib/hero/layout';
import { monitorZoomPose } from '../../lib/hero/monitor';
import {
  dampValue,
  normalizePointer,
  parallaxOffset,
  type ParallaxLimits,
  type PointerPosition,
} from '../../lib/hero/parallax';
import { easeInOutCubic, interpolatePose, type ZoomStore } from '../../lib/hero/zoom';

/** How far the camera may slide from the rest pose, metres: slight, never a swing. */
const LIMITS: ParallaxLimits = { x: 0.07, y: 0.035 };

/** Follow rate in 1/s: roughly a third of a second to settle. */
const FOLLOW_RATE = 5;

/** Parallax needs a hovering pointer and a visitor who accepts motion. */
export function useParallaxEnabled(): boolean {
  const [enabled] = useState(
    () =>
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  return enabled;
}

/**
 * `still` parks the camera at the capture pose (`stillCameraFor`) with no parallax and no zoom:
 * only `?capture=1` runs use it, to photograph the committed static hero still.
 */
export function CameraRig({
  enabled,
  zoom,
  still = false,
}: {
  enabled: boolean;
  zoom: ZoomStore;
  still?: boolean;
}) {
  const pointer = useRef<PointerPosition>({ x: 0, y: 0 });
  const offset = useRef<PointerPosition>({ x: 0, y: 0 });
  // The framing solve is cheap but not free: redo it only when the canvas aspect changes.
  const rest = useRef({
    aspect: 0,
    pose: restCameraFor(DESKTOP_ASPECT),
    end: restCameraFor(DESKTOP_ASPECT),
  });

  useEffect(() => {
    if (!enabled) return;
    const onMove = (event: PointerEvent) => {
      pointer.current = normalizePointer(
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight,
      );
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [enabled]);

  useFrame(({ camera, size }, delta) => {
    const goal = parallaxOffset(pointer.current, {
      limits: LIMITS,
      weight: 1 - zoom.progress,
      coarse: !enabled,
    });
    offset.current = {
      x: dampValue(offset.current.x, goal.x, FOLLOW_RATE, delta),
      y: dampValue(offset.current.y, goal.y, FOLLOW_RATE, delta),
    };
    // While the frame grows the canvas is wider than what shows: frame the visible part only.
    const view = cameraView(zoom.frame, size.width, size.height);
    const aspect = view.aspect;
    const visibleWidth = aspect * size.height;
    if (rest.current.aspect !== aspect) {
      const pose = still ? stillCameraFor(aspect) : restCameraFor(aspect);
      rest.current = { aspect, pose, end: monitorZoomPose(aspect, pose.fov) };
    }
    const { pose, end } = rest.current;
    const framed =
      zoom.progress > 0 ? interpolatePose(pose, end, easeInOutCubic(zoom.progress)) : pose;
    const [x, y, z] = framed.position;
    const cam = camera as PerspectiveCamera;
    if (view.wide) {
      cam.aspect = aspect;
      cam.setViewOffset(visibleWidth, size.height, view.offsetX, 0, size.width, size.height);
    } else if (cam.view?.enabled) {
      cam.clearViewOffset();
      cam.aspect = aspect;
      cam.updateProjectionMatrix();
    }
    cam.position.set(x + offset.current.x, y + offset.current.y, z);
    cam.lookAt(...framed.target);
  });
  return null;
}
