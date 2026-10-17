/**
 * The canvas frame during the scroll zoom (pure, three-free). The copy fades out over the first
 * part of the zoom and the frame, which starts as the right-hand column, grows leftward to the
 * whole stage width so the monitor ends centered with no empty column beside it.
 *
 * The canvas itself never resizes: it is as wide as the final frame from the moment the zoom is
 * active and the unrevealed left part is clipped, so R3F has nothing to re-measure while the frame
 * grows. The camera frames only the visible part (`cameraView`).
 */
import { easeInOutCubic, zoomProgress } from './zoom';

/** The hero copy is gone by this much of the zoom (it fades over the first part). */
export const COPY_FADE_END = 0.2;
/** The frame starts growing as the copy is almost gone, so it never wipes over visible text. */
export const FRAME_GROW_START = 0.16;
export const FRAME_GROW_END = 0.48;

/** Copy opacity for a zoom progress: 1 at rest, 0 once the fade range ends. */
export function copyOpacity(progress: number): number {
  return 1 - zoomProgress(progress, { start: 0, end: COPY_FADE_END });
}

/** Viewport-space x positions (px) of the stage content box and of the scene column. */
export interface FrameBounds {
  stageLeft: number;
  sceneLeft: number;
  sceneWidth: number;
}

export interface FrameGeometry {
  /** How far the frame may grow to the left of the scene column, px. */
  extend: number;
  /** Canvas width, px: the scene column plus everything it can grow into. */
  fullWidth: number;
  /** 0..1, eased growth of the frame. */
  grow: number;
  /** Width of the visible frame, px. */
  visibleWidth: number;
  /** Left part of the canvas that is still clipped, px. */
  hidden: number;
}

export function frameGeometry(bounds: FrameBounds, progress: number): FrameGeometry {
  const extend = Math.max(0, bounds.sceneLeft - bounds.stageLeft);
  const fullWidth = bounds.sceneWidth + extend;
  const grow = easeInOutCubic(
    zoomProgress(progress, { start: FRAME_GROW_START, end: FRAME_GROW_END }),
  );
  const visibleWidth = bounds.sceneWidth + extend * grow;
  return { extend, fullWidth, grow, visibleWidth, hidden: fullWidth - visibleWidth };
}

/** Written by the scroll zoom for the camera rig; zeros while the wide frame is not in place. */
export interface ZoomFrame {
  fullWidth: number;
  visibleWidth: number;
}

export interface CameraView {
  /** The canvas is wider than the visible frame: apply a view offset. */
  wide: boolean;
  /** Aspect of the part the camera frames. */
  aspect: number;
  /** Horizontal offset (px) of the visible part inside the full canvas, <= 0. */
  offsetX: number;
}

/**
 * What the camera should frame: the visible part of the canvas, not all of it. The wide path only
 * applies once the canvas really has the full width (its resize is asynchronous), so the camera
 * never frames a stretched buffer.
 */
export function cameraView(
  frame: ZoomFrame,
  canvasWidth: number,
  canvasHeight: number,
): CameraView {
  const plain = { wide: false, aspect: canvasWidth / canvasHeight, offsetX: 0 };
  if (frame.fullWidth <= 0 || Math.abs(canvasWidth - frame.fullWidth) > 1.5) return plain;
  const visible = Math.min(frame.visibleWidth, canvasWidth);
  return { wide: true, aspect: visible / canvasHeight, offsetX: visible - canvasWidth };
}
