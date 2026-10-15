# JhomoveDev — Cortes para el flujo SDD (gentle-ai)

gentle-ai se encarga de proponer, especificar, diseñar, generar las tareas, aplicar y verificar. Este archivo solo propone **cómo partir el trabajo en cambios SDD independientes**, cada uno desplegable por sí mismo. Pásale a cada cambio la sección indicada de `docs/REQUERIMIENTOS.md`.

## Setup (una sola vez)
```bash
pnpm create cloudflare@latest jhomovedev --framework=astro
cd jhomovedev && mkdir docs
# mover CLAUDE.md a la raíz y REQUERIMIENTOS.md + PLAN.md a docs/
```
Skills adicionales: **solo `frontend-design`**. Context7 (incluido en gentle-ai) ya da documentación actualizada de Astro, Three/R3F y GSAP, así que no hacen falta paquetes de skills 3D.
```text
/plugin marketplace add anthropics/claude-code
/plugin install frontend-design@claude-code-plugins
```
> Opcional: si en el corte 3 notas que Claude se equivoca seguido con R3F/drei, ahí sí agrega `CloudAI-X/threejs-skills`. No antes.

En Cloudflare: crear la cuenta y definir el subdominio de workers.dev como `jhomovedev`.

## Cortes

| # | Cambio SDD | Secciones de REQUERIMIENTOS | Resultado desplegable |
|---|-----------|-----------------------------|-----------------------|
| 1 | **base-contenido-admin** | §4 RF-01, RF-07–RF-11 · §6 · §7 · §8 | Sitio ES/EN sin 3D, todo el contenido en colecciones, `/admin` funcionando, deploy automático desde GitHub |
| 2 | **hero-3d-terminal** | §3 pasos 1–2 · RF-02 · RF-03 · RNF-01/02 | Escritorio 3D + terminal + fallback |
| 3 | **arquitectura-viva** | RF-04 · RF-06 | Grafo derivado del contenido + casos de estudio |
| 4 | **asistente-ia** | RF-05 · RNF-05/06 | Comando `ask` con Workers AI |
| 5 | **pulido-qa** | RNF-03/04 · §10 | Lighthouse, a11y, OG, README del repo |

**Hoy:** cortes 1 y 2. El 1 va primero a propósito: el admin y el contenido son la base de todo. Además, desde el primer día ya puedes actualizar el portafolio sin código.

## Lo que haces tú
- **Corte 1:** revisar el copy (sobre todo el EN y el bloque "Camino a Tech Lead") y subir el CV desde `/admin` para probar el flujo de punta a punta.
- **Corte 2:** descargar los GLB (escritorio, monitor, teclado y 2–3 props) desde Poly Pizza o Kenney, preferiblemente CC0, y ponerlos en `public/models/raw/`.
- **Corte 4:** crear el widget de Turnstile en Cloudflare.
