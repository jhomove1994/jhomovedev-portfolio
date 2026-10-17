# Hero zoom framing

## Objective

Make the desktop scroll zoom into the monitor feel composed: no empty column on the left, and no oversized terminal at the end of the zoom.

## Problem / why

User feedback (2026-10-17), after seeing the live 3D hero for the first time: it looks "abultado". Observed in `src/components/three/scroll/ScrollZoom.ts`: the hero copy fades out over the first 40% of the zoom (`COPY_FADE_END`), but the canvas frame stays in its right-hand column, leaving an empty black area on the left. The camera's end pose (`zoomEndPose` in `src/lib/hero/zoom.ts`) gets so close that the terminal fills the frame and reads huge.

## Scope (authorized by the user)

1. The canvas frame grows toward the full container width while the copy fades, ending with the monitor centered and no empty column.
2. End the zoom earlier: the monitor bezel and some desk stay visible at the end.

Out of scope: the low-poly desk props (lamp, cabinet); a later task.

## Constraints

- Desktop zoom path only (`ZOOM_MEDIA`: >=768px, fine pointer, motion allowed). Phones, reduced motion and the static still are unchanged.
- No layout shift outside the pinned hero; no horizontal scroll.
- Frame growth must stay smooth: prefer transform/clip-path over width/left; if the canvas must resize, keep R3F resize cost bounded (dpr [1,1.5], PerformanceMonitor).
- Hero text paints before 3D (unchanged).

## Delivery

Branch `feat/hero-zoom-framing`, stacked on `feat/sections-motion`. Strategy: ask-on-risk.

## TDD

Mode: strict (orchestrator configuration). Runner: `pnpm test` (vitest); e2e `pnpm test:e2e` (playwright).

## Tasks

- [x] T1 Frame grows to full width as the copy fades (pure progress → frame geometry mapping, tested) — delegated (writer trigger) — `8ab5af3`
- [x] T2 Earlier zoom end pose with bezel and desk visible (tested end-pose bounds) — delegated — `99a9b98` (+ e2e adaptation commit for the full-width canvas)
- [x] T3 Verification: format, lint, check, test, build, e2e; frame captures at 1440 across zoom progress — delegated

- [x] T4 User feedback: monitor too small at max zoom — raise `ZOOM_FRACTION` 0.7 → 0.9 (terminal text ~24 px at 1440, bezel still visible) — inline (one constant + doc) — unit 1084 passed, hero e2e 52 passed

## Acceptance

- At every zoom progress there is no empty column beside the frame at 1440px.
- At the end of the zoom the monitor bezel is visible on all sides.
- `pnpm verify` green; existing hero e2e specs pass.

## Progress

T1-T3 done. RED observed first (frame module missing; zoomEndPose bezel/fraction tests NaN), then GREEN.
Design: canvas stays full stage width while zoom is active (`.hero-zoom`), the still's box grows leftward by `--frame-grow` (eased progress 0.12..0.48), the camera frames only the visible part via `setViewOffset` (`cameraView`). End pose: glass+bezel (2 cm) <= 70% of the frame on both axes (`ZOOM_FRACTION`).
Decisions to confirm: the old S10 rule (terminal >= 60% of viewport width at zoom end) is replaced by the bezel rule (terminal ~45% of the frame, ~19 px text at 1440); the `hero-3d` e2e asserting 60% was rewritten accordingly. Copy is partly covered by the growing frame mid-zoom (curtain wipe).
Captures: scratchpad hero-zoom/f1440-p000..p100.png, f1280-p100.png.
