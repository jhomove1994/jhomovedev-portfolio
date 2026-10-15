# JhomoveDev — Portafolio de Jhonatan Moreno

Portafolio bilingüe (ES/EN) con escena 3D, terminal interactiva, asistente IA y admin Git-based.
Especificación: `docs/REQUERIMIENTOS.md` (insumo del flujo SDD de gentle-ai).
El flujo de trabajo, la memoria y las docs (Context7) los maneja gentle-ai. Aquí solo van las reglas propias del proyecto.

## Stack
Astro (SSG) + islas React · R3F + drei · GSAP/ScrollTrigger + Lenis · Tailwind · Content Collections + Zod · Sveltia CMS en `/admin` · Cloudflare Workers (+ Workers AI) · pnpm · TS strict.
Consulta las docs actualizadas de Astro, R3F, drei y GSAP vía Context7 antes de usar APIs que no conozcas con certeza.

## Reglas de contenido (no negociables)
1. **Todo contenido vive en `src/content/`** y es editable desde `/admin`. Nada de texto ni datos hardcodeados en componentes: ni bio, ni experiencia, ni stack, ni enlaces.
2. Cualquier cambio a un esquema Zod **debe** reflejarse en `public/admin/config.yml` en el mismo commit.
3. **Nunca inventes datos** sobre Jhonatan (cifras, clientes, logros). Si falta algo: `TODO(autor): ...`.
4. Los proyectos son privados: casos anonimizados, sin código ni nombres internos.
5. **No presentes mainframe/COBOL como especialidad** en ninguna parte.
6. Posicionamiento: *Senior Full Stack Developer · camino a Tech Lead*, respaldado con evidencia.
7. Voz en primera persona, natural, sin corporativismo. El EN debe sonar nativo.

## Reglas visuales
- Terminal/neón **contenido**: el verde `#3DDC97` es acento, máximo ~10% de la superficie. Bloom sutil. Nada estilo "Matrix".
- Space Grotesk para títulos y JetBrains Mono para la terminal. Usa la skill `frontend-design` para layout y tipografía.

## Reglas 3D y rendimiento
- Los canvas son islas `client:visible`/`client:idle`. El texto del hero se pinta antes que el 3D.
- `dpr={[1,1.5]}`, `PerformanceMonitor`, pausa fuera del viewport, instancing.
- GLB comprimidos < 3 MB en total, con créditos en `public/models/CREDITS.md`.
- Fallback obligatorio (`src/lib/capabilities.ts`): sin WebGL2, reduced-motion o gama baja → imagen estática + SVG 2D.
- El grafo se deriva del contenido (`src/lib/graph.ts`), nunca de datos hardcodeados.

## Asistente (`/api/chat`)
Su conocimiento se genera desde las colecciones de contenido. Solo habla de Jhonatan, resiste prompt injection, usa Turnstile y tope diario en KV. Nunca activa planes pagos.

## Verificación
Antes de dar algo por terminado: build, typecheck, lint y capturas con Playwright en 1440px y 390px.

## Comandos
`pnpm dev` · `pnpm build` · `pnpm wrangler dev` (prueba `/api/chat` y el binding de IA) · `pnpm wrangler deploy`
