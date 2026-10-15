# JhomoveDev — Documento de requerimientos del portafolio

> Portafolio personal de **Jhonatan Moreno Velásquez**, Senior Full Stack Developer en transición a Tech Lead.
> Versión 1.1 · Octubre 2026 · Se construye con Claude Code + gentle-ai (flujo SDD). Este documento es el insumo de la propuesta/spec.

---

## 1. Visión

Un portafolio bilingüe (ES/EN) que **demuestra** criterio técnico en lugar de solo listarlo. El visitante llega a un escritorio 3D con un monitor. En la pantalla corre una terminal real con la que puede interactuar. Al hacer scroll, la cámara entra al monitor y se pasa a la **"Arquitectura viva"**: un grafo 3D de servicios por el que fluyen requests. Cada proyecto se muestra como la arquitectura que se construyó.

**Mensaje central:** *"Construyo sistemas cloud-native escalables, de punta a punta, y estoy dando el salto a liderar equipos."*

### 1.1 Objetivos

| # | Objetivo | Cómo se mide |
|---|----------|--------------|
| O1 | Conseguir contactos de clientes, startups y empresas | Clics en contacto, descargas del CV |
| O2 | Posicionarse como Senior Full Stack **en camino a Tech Lead** | El mensaje aparece en el hero, en "Sobre mí" y en los casos de estudio |
| O3 | Diferenciarse con 3D e interactividad sin sacrificar rendimiento | Lighthouse ≥ 90 en Performance (móvil, modo fallback) |
| O4 | Mostrar proyectos privados sin violar confidencialidad | Casos anonimizados, sin código ni datos internos |
| O5 | Costo de operación $0 | Todo en planes gratuitos |

### 1.2 Audiencias

1. **Reclutadores y empresas** (nacionales e internacionales). Escanean en 30 segundos y casi siempre desde el celular. Necesitan rol, años, stack y CV.
2. **Startups / CTOs**. Quieren ver criterio de arquitectura, autonomía y capacidad de liderar.
3. **Clientes freelance**. Quieren saber qué resuelves y cómo contactarte rápido.

Implicación: **el contenido clave tiene que poder leerse sin interactuar con el 3D.** El 3D es la capa que diferencia, no la puerta de entrada.

---

## 2. Alcance

### Incluido (v1)
- Sitio de una sola página por idioma: `/es` y `/en`, con la raíz redirigiendo según el idioma del navegador.
- Secciones: Hero 3D + terminal, Sobre mí, Arquitectura viva + casos de estudio, Experiencia, Certificaciones, Contacto, CV descargable.
- Asistente IA dentro de la terminal (comando `ask`).
- Modo fallback sin WebGL (móvil de gama baja, `prefers-reduced-motion` o sin soporte).
- Despliegue gratuito en Cloudflare Workers.
- **Panel de administración** para actualizar el contenido desde el navegador (incluso desde el celular), sin tocar código (RF-11).

### Fuera de alcance (v1)
- Blog o notas técnicas.
- Admin construido a medida (con su propia base de datos y autenticación). Se usa un CMS basado en Git; ver la justificación en RF-11.
- Dominio propio pagado (se deja preparado para conectarlo después).
- Contenido de mainframe: no se menciona como especialidad. Como mucho, una línea neutra en la experiencia si es estrictamente necesario.

---

## 3. Concepto y narrativa (scroll)

| Paso | Escena | Contenido | Interacción |
|------|--------|-----------|-------------|
| 1 | **Escritorio 3D** (hero) | Nombre, "Senior Full Stack Developer · camino a Tech Lead", CTA "Descargar CV" y "Contactar" | Rotación leve con el mouse (parallax). El monitor muestra la terminal con un `whoami` autoescrito |
| 2 | **Zoom al monitor** | Transición por scroll: la cámara entra a la pantalla | GSAP ScrollTrigger con `scrub` |
| 3 | **Sobre mí** | Bio corta y una línea de tiempo "Developer → Senior → Tech Lead (en curso)" | Aparición progresiva |
| 4 | **Arquitectura viva** | Grafo 3D del stack agrupado por dominio + 3–4 casos de estudio | Clic en un caso → se ilumina el subgrafo usado y se abre un panel con el detalle |
| 5 | **Experiencia** | Timeline de 3 empleos | — |
| 6 | **Certificaciones + formación** | Badges AWS con enlace a Credly, máster UNIR, Claude Code in Action | — |
| 7 | **Contacto** | Email, LinkedIn, WhatsApp (opcional), botón de CV | Copiar email al portapapeles |

La terminal está **siempre disponible**: incrustada en el monitor en el hero y como botón flotante `>_` en el resto del sitio.

---

## 4. Requerimientos funcionales

### RF-01 · Internacionalización
- Rutas `/es/` y `/en/` con el i18n nativo de Astro. Español por defecto.
- Selector de idioma visible en el header y comando `lang es|en` en la terminal.
- Todo el texto vive en archivos de contenido por idioma. Nada hardcodeado en componentes.
- Etiquetas `hreflang`, `<html lang>` correcto y metadatos OG por idioma.
- CV descargable en las dos versiones, ambas reemplazables desde el admin. La versión EN queda como TODO del autor si aún no existe; mientras tanto, el botón en `/en` ofrece el CV en español con la etiqueta "(Spanish)".

### RF-02 · Hero 3D (escritorio)
- Escena con un escritorio, un monitor, un teclado y 2–3 objetos de ambientación (planta, taza, lámpara). Iluminación nocturna con un acento verde suave que sale de la pantalla.
- Modelos **GLB importados** (decisión del autor: más realismo) desde fuentes con licencia libre (ver §9). Se comprimen con Draco o Meshopt.
- La pantalla del monitor renderiza la **terminal como DOM real**, usando `<Html transform occlude>` de drei para que sea accesible y seleccionable.
- Parallax leve de la cámara con el mouse. En touch no hay parallax.
- Loader con progreso real (`useProgress`), estilizado como un boot de terminal.

### RF-03 · Terminal interactiva
Comandos mínimos:

| Comando | Acción |
|---------|--------|
| `help` | Lista los comandos |
| `whoami` | Bio de 2 líneas |
| `experience` | Resumen de experiencia + scroll a la sección |
| `projects` | Lista los casos de estudio; `projects <id>` abre uno |
| `stack` | Stack agrupado por dominio |
| `certs` | Certificaciones con enlaces |
| `contact` | Datos de contacto |
| `cv` | Descarga el CV del idioma activo |
| `lang es\|en` | Cambia el idioma |
| `ask <pregunta>` | Pregunta al asistente IA (RF-05) |
| `clear` | Limpia la pantalla |

- Historial con ↑/↓, autocompletado con Tab y sugerencias clicables para quien no quiera escribir.
- Easter egg: `sudo hire-me` → mensaje con un CTA de contacto.
- Accesible: `role="log"`, `aria-live="polite"` y foco manejable con teclado.

### RF-04 · Arquitectura viva
- Grafo 3D **generado por código** (geometría procedural, no GLB) con nodos agrupados en clusters:
  - **Frontend:** Angular, React, Astro, Micro Frontends (Single-SPA / Module Federation), React Native/Ionic
  - **Backend:** Node.js, NestJS, Laravel, REST, GraphQL, WebSockets
  - **AWS Serverless:** API Gateway, Lambda, Step Functions, DynamoDB, SQS, S3, IAM, CloudWatch
  - **Datos:** PostgreSQL, MySQL, MongoDB, Redis
  - **DevOps/IaC:** Terraform, Jenkins, CI/CD, Git
  - **IA:** AWS AI Practitioner, Amazon Fraud Detector, Workers AI (este mismo sitio)
- Aristas con **partículas animadas** que simulan requests (shader o `InstancedMesh`).
- Al seleccionar un caso de estudio se resalta el subgrafo de servicios que usó, el resto se atenúa y la cámara se acerca.
- Hover sobre un nodo → tooltip con el nombre y años de experiencia.
- La fuente de verdad del grafo es **contenido editable desde el admin**:
  - El catálogo de tecnologías (`src/content/stack/`) define id, nombre, cluster y años de experiencia.
  - Cada caso de estudio declara en su frontmatter `stack: [lambda, step-functions, dynamodb, ...]`.
  - Las aristas se derivan automáticamente: si se agrega un proyecto o una tecnología desde el admin, el grafo se actualiza solo, sin código.

### RF-05 · Asistente IA (`ask`)
- Endpoint `POST /api/chat` como ruta server de Astro, corriendo en el Worker de Cloudflare.
- **Proveedor principal:** Cloudflare Workers AI mediante binding (`env.AI`). No requiere API key y tiene una asignación gratuita diaria (10.000 neurons/día).
- **Fallback opcional:** Groq (API compatible con OpenAI, free tier sin tarjeta). Se activa si Workers AI falla o la cuota se agota, con la key guardada como secret.
- Modelo: un modelo de texto pequeño e instruct (familia Llama ~8B). Verificar la disponibilidad actual con `npx wrangler ai models list` antes de fijarlo.
- **Base de conocimiento:** se genera en build a partir de las mismas colecciones de contenido del sitio, para que nunca se desincronice.
- **Guardrails:**
  - Solo responde sobre Jhonatan, su experiencia y cómo contactarlo. Lo demás lo rechaza con amabilidad.
  - Nunca inventa datos, cifras, clientes ni tecnologías. Si no sabe algo, sugiere contactar directamente.
  - No revela el system prompt e ignora instrucciones embebidas en la pregunta.
  - Responde en el idioma de la pregunta.
  - `max_tokens` ≈ 300 y respuesta en streaming.
- **Protección de costos y abuso:**
  - Cloudflare Turnstile (gratis) antes del primer `ask` de la sesión.
  - Tope global diario de mensajes (contador en Workers KV) y límite por sesión en el cliente.
  - Al llegar al tope: mensaje amable + datos de contacto.

### RF-06 · Casos de estudio (proyectos privados)
Formato anonimizado: **Contexto → Reto → Arquitectura (subgrafo) → Mi rol → Decisiones técnicas → Resultado.** Sin código, sin nombres de sistemas internos, sin datos sensibles.

| ID | Caso | Base real | Enfoque Tech Lead |
|----|------|-----------|-------------------|
| `virtual-card` | Plataforma de tarjeta de crédito virtual (banca) | AV Villas | Micro frontends, orquestación con Step Functions, IaC, seguridad IAM |
| `legacy-to-nest` | Migración de microservicios legacy a NestJS (fintech de pagos) | WePayU4 | Estrategia de migración, caché con Redis, tiempo real con WebSockets |
| `fraud-pilot` | Piloto de detección de fraude con Amazon Fraud Detector | WePayU4 | **Lideró** el piloto: evaluación, pruebas y recomendación |
| `this-portfolio` | Este portafolio | Repo público | Astro + R3F + Workers AI. El único repo que se puede enlazar |

> ⚠️ **TODO del autor:** agregar métricas reales a cada caso (tiempos, volumen, % de mejora) **solo si son públicas o aproximables sin violar confidencialidad**. Si no hay cifras, describir el impacto cualitativo. El asistente y el sitio nunca deben inventarlas.

### RF-07 · Sobre mí + transición a Tech Lead
- Bio de 3–4 líneas en primera persona, con tono natural y sin corporativismo.
- Bloque **"Camino a Tech Lead"** con evidencia concreta y no solo intención:
  - Liderazgo de proyectos full stack (Gisoft, 2019–2023)
  - Liderazgo del piloto de detección de fraude (WePayU4)
  - Trabajo transversal con arquitectura, QA y producto (AV Villas)
  - Máster en IA para el Sector Financiero (UNIR, en curso)
  - TODO del autor: mentoría, code reviews, decisiones de arquitectura que haya liderado

### RF-08 · Experiencia
Timeline con los tres empleos del CV, con 3–4 logros cada uno (no todos los bullets del CV). Formato: rol, empresa, fechas, logros, chips de stack.

### RF-09 · Certificaciones y formación
- AWS Certified AI Practitioner (AIF-C01), 2026 → enlace a Credly
- AWS Certified Cloud Practitioner (CLF-C02), 2026 → enlace a Credly
- Ingeniería Informática (2022), Técnico en Programación (SENA, 2010)
- Claude Code in Action (Anthropic, 2026), Máster IA Sector Financiero (UNIR, en curso)

### RF-10 · Contacto
- Email con botón de copiar y `mailto:`.
- LinkedIn.
- WhatsApp: **opcional**, a decidir por el autor. Publicar el número en la web aumenta el spam; se puede dejar solo en el CV.
- Sin formulario en la v1 (cero backend extra). Si se quiere uno después: Web3Forms o similar, con plan gratuito.

### RF-11 · Panel de administración (CMS basado en Git)

**Decisión:** no construir un admin propio. Uno a medida implica autenticación, base de datos, almacenamiento de archivos, seguridad y mantenimiento: es otro proyecto completo. Para un portafolio, un **CMS basado en Git** da la misma experiencia de "entro, edito, guardo" a costo $0. Funciona así: es una UI web que edita los archivos de contenido del repo y hace commit en GitHub, y ese push dispara el redeploy automático en Cloudflare.

**Herramienta recomendada: Sveltia CMS**, sucesor moderno de Decap/Netlify CMS. Se eligió por:
- i18n de primera clase: cada entrada se edita en ES y EN lado a lado. Es clave para un sitio bilingüe.
- Es una página estática en `/admin`, sin servidor, y funciona en Cloudflare sin adaptar nada.
- Soporta móvil, es open source y gratis.
- Autenticación: login con GitHub, ya sea con token personal o con un pequeño Worker de OAuth (gratis) si se prefiere el botón "Login with GitHub".

Alternativas evaluadas:

| Opción | A favor | En contra |
|--------|---------|-----------|
| **Sveltia CMS** ✅ | i18n nativo, sin servidor, gratis | Requiere configurar el login con GitHub |
| Pages CMS | Hosted gratis, cero instalación (solo un `.pages.yml`) | i18n menos cómodo y limitaciones en campos repetibles |
| Keystatic | Configuración TypeScript, muy integrado con Astro | Su ruta `/keystatic` necesita un servidor Node, lo que complica Cloudflare Workers |
| Admin propio | Control total | Semanas de trabajo, más superficie de ataque, no aporta al objetivo |

**Qué se puede editar desde el admin:**

| Colección | Campos principales |
|-----------|--------------------|
| Perfil (singleton) | Nombre, titular, bio, ubicación, disponibilidad (abierto a ofertas / freelance), enlaces de contacto |
| Camino a Tech Lead | Lista de hitos con evidencia |
| Experiencia | Rol, empresa, fechas, logros, stack, orden |
| Casos de estudio | Título, contexto, reto, mi rol, decisiones, resultado, `stack[]`, destacado sí/no, orden, publicado sí/no |
| Stack | Tecnología, cluster, años, ícono |
| Certificaciones | Nombre, emisor, año, URL de Credly, imagen del badge |
| Archivos | CV ES/EN (PDF), imágenes de badges, imagen OG |

Reglas:
- Todos los campos traducibles se editan por idioma. Si falta la traducción EN, el sitio muestra la versión ES con un aviso **solo en desarrollo**.
- Validación con los mismos esquemas Zod: si el contenido es inválido, el build falla y no se publica nada roto.
- El asistente IA toma su conocimiento de estas mismas colecciones, así que se actualiza solo al editar.
- Toggle `publicado` en los casos de estudio para preparar borradores sin mostrarlos.
- `/admin` con `noindex` y fuera del sitemap.

**Flujo de actualización esperado:** entrar a `/admin` → editar → Guardar → en 1–2 minutos el cambio está en producción. Sin abrir el editor de código.

---

## 5. Requerimientos no funcionales

### RNF-01 · Rendimiento
| Métrica | Objetivo |
|---------|----------|
| LCP (móvil, 4G) | < 2,5 s. El hero de texto se pinta antes que el canvas |
| JS inicial (sin 3D) | < 100 KB gzip |
| Escena 3D total | < 3 MB (GLB comprimidos + texturas KTX2/WebP) |
| FPS en escritorio medio | ≥ 50 |
| Lighthouse Performance | ≥ 90 móvil (fallback) / ≥ 75 escritorio (3D activo) |

Técnicas obligatorias:
- El canvas 3D es una **isla de Astro** con `client:visible` o `client:idle`. Nunca bloquea el primer render.
- `dpr={[1, 1.5]}`, `frameloop="demand"` donde aplique, `PerformanceMonitor` de drei para degradar la calidad.
- Instancing para las partículas y nodos del grafo.
- La animación se pausa cuando el canvas sale del viewport.

### RNF-02 · Fallback
Se activa el **modo estático** si se cumple cualquiera de estas condiciones:
- No hay soporte WebGL2.
- `prefers-reduced-motion: reduce`.
- Heurística de gama baja: `navigator.hardwareConcurrency <= 4` o `deviceMemory <= 4`, en móvil.

En modo estático:
- Hero con imagen pre-renderizada de la escena (captura WebP/AVIF) + terminal 2D funcional.
- Arquitectura viva como diagrama SVG 2D con el mismo comportamiento de resaltado.
- Toggle manual "Activar 3D" para quien quiera forzarlo.

### RNF-03 · Accesibilidad
- WCAG 2.1 AA: contraste del verde sobre el fondo ≥ 4.5:1 en texto.
- Todo el contenido existe en DOM semántico, no solo dentro del canvas.
- Navegación completa con teclado y foco visible.
- `aria-hidden` en el canvas decorativo y descripciones alternativas para las escenas.

### RNF-04 · SEO
- Contenido pre-renderizado (SSG) en ambos idiomas.
- Metadatos, Open Graph con imagen por idioma, JSON-LD `Person`, `sitemap.xml` y `robots.txt`.

### RNF-05 · Seguridad y privacidad
- Ningún secreto en el cliente. Las keys van como secrets de Wrangler.
- Headers: CSP, `X-Content-Type-Options` y `Referrer-Policy`.
- Sin analytics invasivos. Opcional: Cloudflare Web Analytics, que es gratis y sin cookies.

### RNF-06 · Costo
$0/mes. Si se excede la cuota gratuita de IA, el asistente se desactiva con elegancia. **Nunca se activa un plan pago automáticamente.**

---

## 6. Identidad visual

### 6.1 Mood
Terminal/neón **contenido**: oscuro, sobrio y técnico, con el verde como acento puntual. Nada de "Matrix". Pensar en un IDE de noche con buena luz ambiente, no en un sitio hacker.

### 6.2 Tokens de color (punto de partida)

| Token | Valor | Uso |
|-------|-------|-----|
| `--bg` | `#0A0E0D` | Fondo |
| `--surface` | `#111816` | Tarjetas, paneles |
| `--border` | `#1E2925` | Bordes sutiles |
| `--text` | `#D7E2DD` | Texto principal |
| `--muted` | `#7C8B85` | Texto secundario |
| `--accent` | `#3DDC97` | Verde menta fluorescente **atenuado**. Máximo ~5–10% de la superficie |
| `--accent-soft` | `rgba(61,220,151,0.12)` | Glows, fondos de chips |
| `--warn` | `#F5B454` | Estados puntuales en la terminal |

Reglas:
- El verde se usa en acentos (cursor, prompt, nodos activos, links en hover), nunca en bloques grandes.
- El glow/bloom es sutil: post-processing con intensidad baja y solo en elementos emisivos.

### 6.3 Tipografía
- Títulos: **Space Grotesk** (o una alternativa con carácter que proponga la skill `frontend-design`).
- Cuerpo: una sans legible de buena lectura.
- Terminal y detalles: **JetBrains Mono**.

### 6.4 Movimiento
- Easing suave (`power2.out` / `expo.out`) y duraciones de 0,4–0,8 s.
- Smooth scroll con Lenis, sincronizado con ScrollTrigger.
- Todo respeta `prefers-reduced-motion`.

---

## 7. Arquitectura técnica

### 7.1 Stack

| Capa | Tecnología |
|------|------------|
| Framework | **Astro** (SSG + rutas server puntuales) |
| Islas interactivas | React (solo donde se necesita) |
| 3D | Three.js + **React Three Fiber** + **drei** + `@react-three/postprocessing` |
| Animación | **GSAP** + ScrollTrigger, Lenis |
| Estilos | Tailwind CSS (o CSS con tokens) |
| Contenido | Astro Content Collections (Markdown/JSON por idioma) con validación Zod |
| Admin | **Sveltia CMS** en `/admin` (Git-based, i18n) |
| IA | Cloudflare Workers AI (binding) · fallback Groq |
| Anti-bot | Cloudflare Turnstile |
| Hosting | **Cloudflare Workers** con static assets + adapter `@astrojs/cloudflare` |
| CI/CD | GitHub → Workers Builds (deploy en cada push a `main`, previews en PRs) |
| Calidad | TypeScript estricto, ESLint, Prettier, Playwright (smoke), Lighthouse CI |

### 7.2 Por qué Cloudflare
- Astro tiene un adapter oficial de Cloudflare: genera los archivos estáticos más un Worker para las rutas server, y se despliega todo junto con `wrangler deploy`.
- El asistente IA usa el binding de Workers AI desde el mismo Worker, sin API keys externas.
- Sin dominio comprado, la URL será `jhomovedev.<subdominio>.workers.dev`. Si el subdominio de la cuenta se define como `jhomovedev`, queda algo como `portfolio.jhomovedev.workers.dev`. Más adelante se conecta un dominio propio (ej. `jhomove.dev`) sin tocar el código.

### 7.3 Estructura de carpetas

```
jhomovedev/
├── CLAUDE.md
├── docs/
│   ├── REQUERIMIENTOS.md
│   └── PLAN.md
├── public/
│   ├── admin/             # Sveltia CMS: index.html + config.yml
│   ├── models/            # GLB comprimidos
│   ├── uploads/           # archivos subidos desde el admin (CV, badges, OG)
│   └── og/
├── src/
│   ├── content/           # TODO lo editable desde el admin vive aquí
│   │   ├── config.ts      # esquemas Zod (los mismos que valida el build)
│   │   ├── profile/       # es.json, en.json
│   │   ├── leadership/    # hitos "camino a Tech Lead"
│   │   ├── experience/    # es/*.md, en/*.md
│   │   ├── projects/      # es/*.md, en/*.md (casos de estudio, con stack[])
│   │   ├── stack/         # catálogo de tecnologías y clusters
│   │   └── certifications/
│   ├── lib/graph.ts       # deriva nodos y aristas del contenido
│   ├── i18n/
│   │   └── ui.ts          # strings de UI por idioma
│   ├── components/
│   │   ├── three/         # DeskScene, ArchitectureGraph, Particles, Loader
│   │   ├── terminal/      # Terminal, commands/, useTerminal
│   │   ├── sections/      # Hero, About, Architecture, Experience, Certs, Contact
│   │   └── ui/
│   ├── lib/
│   │   ├── capabilities.ts # detección WebGL / gama baja / reduced motion
│   │   └── knowledge.ts    # genera la base de conocimiento del asistente
│   ├── pages/
│   │   ├── index.astro     # redirección por idioma
│   │   ├── [lang]/index.astro
│   │   └── api/chat.ts     # endpoint del asistente (server)
│   └── styles/tokens.css
├── astro.config.mjs
└── wrangler.jsonc
```

---

## 8. Contenido base (desde el CV)

- **Nombre:** Jhonatan Moreno Velásquez · **Marca:** JhomoveDev
- **Titular ES:** Senior Full Stack Developer · camino a Tech Lead
- **Titular EN:** Senior Full Stack Developer · on the path to Tech Lead
- **Ubicación:** Bogotá, Colombia · abierto a remoto
- **Experiencia:** 6+ años
- **Contacto:** aplicacionesjmoreno@gmail.com · linkedin.com/in/jhonatan-moreno-velasquez
- **Idiomas:** Español nativo · Inglés técnico intermedio

> El copy final se redacta en la fase de contenido, con voz natural en primera persona. La versión EN debe sonar natural y no traducida literalmente.

---

## 9. Recursos 3D y referencias

### Modelos GLB gratuitos (revisar la licencia de cada uno)
- **Poly Pizza:** la mayoría es CC0 o CC-BY y low-poly, ideal para la web.
- **Sketchfab:** filtrar por "Downloadable" + licencia CC. Atribuir si es CC-BY.
- **Kenney.nl:** assets CC0.
- Alternativa: armar la escena en **Spline** y exportarla a GLB.

Registrar las atribuciones en `public/models/CREDITS.md` y en el footer.

### Dónde buscar inspiración
- **Awwwards:** buscar "developer portfolio" y filtrar por "3D" / "WebGL".
- **Godly.website:** galería curada de sitios con mucho movimiento.
- **Codrops:** tutoriales y demos de efectos con Three.js y GSAP.
- **Portafolio de Bruno Simon:** el referente clásico de un portafolio 3D interactivo.

Tarea sugerida para el autor: guardar 3–5 capturas de cosas que le gusten (no sitios completos, detalles: una transición, una paleta, una tipografía) en `docs/refs/`.

---

## 10. Criterios de aceptación de la v1

- [ ] `/es` y `/en` completos, sin strings hardcodeados y con el selector funcionando.
- [ ] Hero 3D con la terminal funcional en el monitor y el loader estilizado.
- [ ] Transición scroll → zoom al monitor → secciones.
- [ ] Arquitectura viva con ≥ 3 casos de estudio que resaltan su subgrafo.
- [ ] Todos los comandos de terminal de RF-03 funcionando.
- [ ] `ask` responde con guardrails, tope diario y Turnstile.
- [ ] Modo fallback probado: reduced-motion, sin WebGL y móvil de gama baja.
- [ ] CV descargable (ES; EN si existe).
- [ ] Lighthouse cumple RNF-01. Sin errores de accesibilidad críticos (axe).
- [ ] Desplegado en workers.dev con deploy automático desde GitHub.
- [ ] Repo público con README que explica la arquitectura (es el caso `this-portfolio`).
- [ ] Cero menciones de mainframe como especialidad.
- [ ] Desde `/admin` se puede editar un caso de estudio en ES y EN, subir un CV nuevo y ver el cambio en producción sin tocar código.
- [ ] Agregar una tecnología a un proyecto desde el admin actualiza el grafo y el asistente.
