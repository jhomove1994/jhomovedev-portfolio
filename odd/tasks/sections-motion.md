# Sections motion

## Objective

Give the sections below the hero deliberate motion so they stop reading as static text, and replace the default Astro favicon.

## Problem / why

After the hero, About, Experience, TechLeadPath, Certifications and Contact render as still text. The default Astro favicon does not represent the brand.

## Scope

- Favicon: amber `>J` prompt mark (SVG + 16/32 ICO + 180 apple-touch PNG).
- Motion (chosen by the user from the proposals artifact):
  1. Typed command line (`$ cat about.md` style) above each section heading, then staggered entrance of the section content.
  2. Experience timeline rail drawn by scroll (scrub) with nodes lighting up as they are passed.
  3. TechLeadPath stages connected by a path traced on enter; the current stage pulses softly.
  4. Desktop two-column layout: sticky section heading with a per-section progress bar.

## Constraints

- GSAP + ScrollTrigger (already a dependency). Respect Lenis if it drives scroll.
- Content is complete at rest: no `opacity: 0` without JS; reduced-motion and no-JS render static.
- Accent green max ~10% of the surface; no "Matrix" look.
- No hardcoded copy: any new label (e.g. command strings) comes from `src/content/` with Zod + `public/admin/config.yml` updated in the same commit.
- Mobile 390px and desktop 1440px both verified.

## Delivery

Branch `feat/sections-motion` stacked on `feat/h3d-15-help-hire-hint`. Strategy: ask-on-risk. Forecast ~400–600 authored lines.

## TDD

Mode: strict (orchestrator configuration). Runner: `pnpm test` (vitest); e2e `pnpm test:e2e` (playwright).

## Tasks

- [x] T1 Amber `>J` favicon + ico + apple-touch icon — inline (mechanical) — commit `3862566`
- [x] T2 Shared reveal module: typed command + staggered entrance (1) — route: delegated (writer trigger: 2+ non-trivial files) — commit `ac42ac2`
- [x] T3 Experience scroll-drawn timeline (2) — route: delegated — commit: next entry records it
- [ ] T4 TechLeadPath traced path + pulsing current stage (3) — delegated
- [ ] T5 Sticky heading + section progress bar on desktop (6) — delegated
- [ ] T6 Verification: build, check, lint, test, Playwright captures at 1440/390

## Acceptance

- Each section animates on enter once; reduced-motion shows the final state immediately.
- No layout shift; no horizontal scroll at 390px.
- `pnpm verify` green.

## Progress

T1 done. Next: T2–T5 via one writer.
