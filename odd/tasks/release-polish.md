# Release polish

## Objective

Close the author-facing gaps before the first release: show availability, replace the mentoring placeholder with a real milestone, and add a share image.

## Scope (authorized by the user, 2026-10-17)

1. Render the profile `availability` (`open-to-offers`) visibly: "Abierto a ofertas" / "Open to offers".
2. Replace `leadership/{es,en}/todo-mentoring-and-architecture.json` with a real Gisoft milestone from the author's own account (copy below).
3. Generate the OG share image (1200x630) for ES and EN and reference it from `src/content/media/{es,en}.json`.

Fraud Detector stays as is: it is in both CVs, and the author will edit texts from `/admin` if needed.

## Milestone copy (author's facts, 2026-10-17)

Facts given: at Gisoft the author accompanied and led a project; team of 3 devs, the other 2 entry-level; platform sold operator top-ups, bill payments and streaming subscriptions; people or businesses registered and invited others, forming a network that paid a commission on their own purchases and on purchases by anyone in their invited network; the author gathered requirements with clients, guided the new devs on technical and platform topics, and defined the system design (monolith: Laravel, Angular, Ionic). Update 2026-10-17: the project ran from late 2021 through 2022; `date` is the year only ("2021"), no month invented.

ES

- title: `Guié a dos desarrolladores junior y definí el diseño de una plataforma en Gisoft`
- evidence: `Entre finales de 2021 y 2022, en Gisoft acompañé y lideré un proyecto con un equipo de tres desarrolladores, dos de ellos empezando su carrera. Era una plataforma para vender recargas de operadores, pago de facturas y suscripciones a plataformas de streaming, donde personas y comercios se registraban e invitaban a otros: la red ganaba una comisión por sus compras y por las de todos sus invitados. Levanté los requerimientos con los clientes, guié a los nuevos desarrolladores en lo técnico y en el funcionamiento de la plataforma, y definí el diseño del sistema: un monolito con Laravel, Angular e Ionic.`

EN

- title: `Mentored two junior developers and designed a platform at Gisoft`
- evidence: `From late 2021 through 2022, I led a project at Gisoft with a team of three developers, two of them just starting out. It was a platform for mobile top-ups, bill payments and streaming subscriptions, where people and businesses signed up and invited others: the network earned a commission on their own purchases and on those of everyone they brought in. I gathered requirements with the clients, guided the new developers through the technical side and how the platform worked, and defined the system design: a monolith with Laravel, Angular and Ionic.`

## Constraints

- Content rules in CLAUDE.md. No invented data. No hardcoded copy in components (labels via `src/i18n/ui.ts`, data via `src/content/`).
- Schema changes mirrored in `public/admin/config.yml` in the same commit.

## Delivery

Branch `feat/release-polish` from `main` (`e3c4963`). Strategy: ask-on-risk.

## TDD

Mode: strict (orchestrator configuration). Runner: `pnpm test` (vitest); e2e `pnpm test:e2e` (playwright).

## Tasks

- [x] T1 Availability rendered in the hero meta line, label per enum value from `ui.ts` (`not-available` renders nothing; terminal not changed) — delegated; 293f6eb, fix 41daabe, e2e 5th commit
- [x] T2 Gisoft mentoring milestone replaces the TODO placeholder (ES + EN), order 2, date 2021 — delegated; d6f50ac, d28a2dc
- [x] T3 OG image ES + EN, 1200x630, referenced from media — delegated; 7720676
- [x] T4 Verification: format, lint, check, test (1096), build, full e2e (all pass after fixes); captures 1440/390 of the hero and of the git graph — delegated

## Progress

T1-T4 done on the branch. Next: user review, push and PR decisions.
