# Reduced-motion reveal

## Objective

Visitors with "reduce motion" enabled still get the terminal feel below the hero: commands type themselves and content appears with an opacity fade. Only displacement is removed. Same behavior on phones and tablets.

## Problem / why

Today `startSectionMotion()` (`src/components/motion/sections.ts`) returns early under `prefers-reduced-motion: reduce`, so those visitors see every section fully static. The user's own Mac had this setting on and the page read as flat. Typing and opacity fades are not vestibular motion, so they are acceptable under reduced motion; translations, scroll-scrubbed growth and pulses are not.

## Scope (authorized by the user, 2026-10-17)

- Reduced motion: keep command typing and sequential opacity-only fades (sections, git-graph rows, experience entries). Remove y/x offsets, the scrubbed rail fill and graph line growth (show them fully drawn), the pulsing HEAD node, and any tilt.
- Full motion stays as it is today.
- Phones (390px) and tablets (768–1024px): both modes work and are verified.

## Constraints

- No-JS still renders the final state (nothing hidden without the `.motion` gate).
- The hero is out of scope (its reduced-motion still stays as is).
- First-view JS budget (`e2e/js-budget.spec.ts`) unchanged: gsap still loads on the first scroll.

## Delivery

Branch `feat/reduced-motion-reveal`, stacked on `feat/hero-zoom-framing`. Strategy: ask-on-risk.

## TDD

Mode: strict (orchestrator configuration). Runner: `pnpm test` (vitest); e2e `pnpm test:e2e` (playwright).

## Tasks

- [x] T1 Reduced-motion variant of the section motion: typing + opacity-only sequential fades; static rail/graph/HEAD — route: delegated (writer trigger: 2+ non-trivial files) — commit `cf21c8f` (pure `lib/motion/mode.ts` + unit tests, RED then GREEN; `.motion-reduced` class + CSS overrides; progress bar off in reduced)
- [x] T2 e2e: reduced motion types and fades without transforms; no-JS still static; 390/820/1440 in both modes — route: delegated — commit `cf21c8f`
- [x] T3 Verification: format:check, lint, check (0 errors), test 1089 passed, build, Playwright 384 passed / 76 skipped; frames captured at 390/820/1440 and reviewed

## Acceptance

- Under reduced motion a section's command types and its items fade in one by one, with no transform at any frame.
- Rail and git graph are fully drawn under reduced motion; HEAD does not pulse.
- Works at 390, 820 and 1440 px; no horizontal scroll.

## Progress

T1–T3 done. Choice: the sticky progress bar is hidden under reduced motion (it is a scaleX transform scrubbed by scroll). Open: none.
