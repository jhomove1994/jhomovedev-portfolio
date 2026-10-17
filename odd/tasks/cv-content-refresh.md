# CV content refresh

## Objective

Publish the author's current CVs as downloads and bring the site content in line with them.

## Problem / why

The author supplied updated CVs (ES and EN). The terminal `cv` command and the CV button were hidden because no CV was uploaded, and the content collections may be out of date relative to the CVs.

## Scope (authorized by the user, 2026-10-17)

- Copy `~/Downloads/CV_Jhonatan_Moreno_Velasquez_actualizado.pdf` (ES) and `~/Downloads/CV_Jhonatan_Moreno_Velasquez_EN.pdf` (EN) into `public/uploads/` and reference them from `src/content/media/{es,en}.json`.
- Update `src/content/` (profile, experience, leadership, certifications, stack, projects) from the CVs: experience and the rest. Source of truth: the two PDFs only.

## Constraints

- Never invent data: only facts stated in the CVs. Anything the site needs but the CVs lack stays or becomes `TODO(autor): ...`.
- Projects stay anonymized (no internal names, no code).
- Do not present mainframe/COBOL as a specialty anywhere.
- Positioning: Senior Full Stack Developer · path to Tech Lead. First person, natural; EN must read native.
- Zod schema changes must be mirrored in `public/admin/config.yml` in the same commit.

## Delivery

Branch `feat/cv-content-refresh`, stacked on `feat/reduced-motion-reveal`. Strategy: ask-on-risk.

## TDD

Mode: strict (orchestrator configuration). Runner: `pnpm test` (vitest); e2e `pnpm test:e2e` (playwright).

## Tasks

- [x] T1 Publish the CVs as downloads (`public/uploads/cv-jhonatan-moreno-{es,en}.pdf`, media JSON, seed test now checks the files exist, contact e2e expects the button) — inline — commit `baf39f4`
- [x] T2 Diff CV vs content and update collections (ES + EN) — delegated (preparation + writer triggers). Result: no content change needed; every CV fact (roles, dates, locations, bullets, skills, certifications, education, languages, contact, years) already matches `src/content/`. No commit. Remaining TODO(autor) (leadership mentoring, 4 project case studies) have no CV support.
- [x] T3 Verification: format:check, lint, check (0 errors), test (1089 passed), build, e2e (384 passed, 76 skipped, port 4399) — all green

## Acceptance

- The CV button and `cv` command download the locale's PDF.
- Every content change traces to a line in the CVs; the report lists what changed and what stays TODO.

## Progress

T1-T3 done. Next: author supplies the remaining TODO(autor) fields.
