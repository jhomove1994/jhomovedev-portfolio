// Camera rig: holds the rest pose and, on fine pointers with motion allowed, drifts the camera a
// few centimetres toward the cursor. The maths lives in `lib/hero/parallax.ts`; this file only
// listens to the pointer and writes the camera. It replaces the static rest camera.
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { PerspectiveCamera } from 'three';
import { DESKTOP_ASPECT, restCameraFor } from '../../lib/hero/layout';
import {
  dampValue,
  normalizePointer,
  parallaxOffset,
  type ParallaxLimits,
  type PointerPosition,
} from '../../lib/hero/parallax';

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

export function CameraRig({ enabled }: { enabled: boolean }) {
  const pointer = useRef<PointerPosition>({ x: 0, y: 0 });
  const offset = useRef<PointerPosition>({ x: 0, y: 0 });
  // The framing solve is cheap but not free: redo it only when the canvas aspect changes.
  const rest = useRef({ aspect: 0, pose: restCameraFor(DESKTOP_ASPECT) });

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
    const goal = parallaxOffset(pointer.current, { limits: LIMITS, coarse: !enabled });
    offset.current = {
      x: dampValue(offset.current.x, goal.x, FOLLOW_RATE, delta),
      y: dampValue(offset.current.y, goal.y, FOLLOW_RATE, delta),
    };
    const aspect = size.width / size.height;
    if (rest.current.aspect !== aspect) rest.current = { aspect, pose: restCameraFor(aspect) };
    const { pose } = rest.current;
    const [x, y, z] = pose.position;
    const cam = camera as PerspectiveCamera;
    cam.position.set(x + offset.current.x, y + offset.current.y, z);
    cam.lookAt(...pose.target);
  });
  return null;
}
