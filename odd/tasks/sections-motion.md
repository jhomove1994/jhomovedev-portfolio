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
- [x] T3 Experience scroll-drawn timeline (2) — route: delegated — commit `a2a35a1`
- [x] T4 TechLeadPath traced path + pulsing current stage (3) — route: delegated — commit `e52a121`
- [x] T5 Sticky heading + section progress bar on desktop (6) — route: delegated — commit `76bee6a`
- [x] T6 Verification: format:check, lint, check (0 errors), test (1052 passed, parent re-ran), build, Playwright 374 passed / 70 skipped; captures at 1440/390 reviewed. Review: risk medium, user declined this candidate (assess --base-ref 8d73cdb)

### Round 2 (user feedback 2026-10-17: "se ve todo de una, muy plano")

Probe on the dev server showed motion does run (typing, fades), but it is too subtle: a 13px command and a quick fade read as static. The user wants each section to type its command visibly and the git graph to load commit by commit with the scroll.

- [x] T7 Prominent terminal typing per section: larger command line (prompt muted, text colour, accent caret), ~50ms/char with jitter, the section body appears as the command's "output" item by item (150ms steps) after typing — route: delegated — commit `0fb2f86`
- [x] T8 TechLeadPath as a `git log --graph`: graph rail + one commit row per milestone (decorative hash from the slug, `(HEAD -> tech-lead)` ref from ui.ts), revealed one by one with the scroll, line grows to each dot, header typed at ~20ms/char then body fades in — route: delegated — commit `e0de45b`
- [x] T9 Experience entries revealed one by one as the rail fill reaches each node — route: delegated — commit `92d1325`
- [x] T10 Verification + frame captures proving progressive reveal (also fixed a smooth-scroll race in the rail e2e, commit `79125ca`; format:check, lint, check, test 1068, build, Playwright 377+ green, frames in the scratchpad shots2)

## Acceptance

- Each section animates on enter once; reduced-motion shows the final state immediately.
- No layout shift; no horizontal scroll at 390px.
- `pnpm verify` green.

## Progress

T1–T10 done. Open: command strings live in `src/i18n/ui.ts` (not `src/content/`), invented by the writer; awaiting user decision. "Current stage" = last non-placeholder milestone.
