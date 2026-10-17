# Testing

## Commands

| Command             | Purpose                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `pnpm test`         | Run all unit tests once (Vitest). Pass a path to focus on a file. |
| `pnpm test:watch`   | Vitest in watch mode.                                             |
| `pnpm test:e2e`     | Playwright against the production build (`pnpm preview`).         |
| `pnpm check`        | `astro check` (types and Astro diagnostics).                      |
| `pnpm lint`         | ESLint (flat config).                                             |
| `pnpm format:check` | Prettier verification.                                            |
| `pnpm verify`       | format:check, lint, check, test and build in one go.              |

`pnpm build` stays a plain `astro build`; type checking runs through `pnpm check`.

## TDD boundary

Strict TDD applies to pure logic, which lives in `src/lib/**` and never imports `astro:*`
(only `src/lib/content/queries.ts` may, enforced by ESLint):

- Zod schemas and the schema registry
- Locale helpers (entry ids, fallback, Accept-Language picker, locale paths)
- hreflang and head metadata builders
- Published filter, order sorting, period formatting, TODO detection
- Parity between the Zod schemas and `public/admin/config.yml`

Astro markup is presentation only and is covered by Playwright (route, metadata, layout and
accessibility baselines) plus screenshots at 1440px and 390px.

Unit tests live in `tests/unit/**` and use a plain Vitest config. Loading the Astro pipeline
through `getViteConfig` is not used because it fails with Vitest 5 and Vite 8.

## Playwright prerequisite

Browsers are not installed by `pnpm install`. Install Chromium once per machine:

```sh
pnpm exec playwright install chromium
```

The suite runs two projects, `desktop` (1440x900) and `mobile` (390x844), both on Chromium.
The web server is started automatically (`pnpm build && astro preview --ignore-lock`, the foreground variant of `pnpm preview`) and reused locally when running.

## Hero modes

The hero is `static` (a still stage with the 2D terminal) or `3d`. Specs that need one of them
must force it instead of relying on the machine, because headless Chromium may or may not expose
a hardware WebGL2 context.

- **Query override**: `?3d=1` forces 3D and `?3d=0` forces static. A valid value is persisted.
  Playwright gives every test a fresh browser context, so nothing leaks between tests.
- **Stored override**: localStorage key `jhomove:hero-mode`, values `1` (on) and `0` (off).
- **Hooks**: `#hero[data-hero-mode]`, `[data-hero-reason]` and `[data-hero-state]`.
- **Reduced motion**: `await page.emulateMedia({ reducedMotion: 'reduce' })` keeps the hero
  static and removes the toggle. An override cannot bypass it.
- **WebGL2 stub**: `stubWebgl2(page, 'none' | 'software' | 'hardware')` in `e2e/helpers.ts`
  replaces `HTMLCanvasElement.prototype.getContext('webgl2')` before any script runs. Call it
  before `page.goto`. `none` is the deterministic way to land on the static hero in any
  environment, and the terminal, accent and JS-budget specs use it:

  ```ts
  await stubWebgl2(page, 'none');
  await page.goto('/es/');
  ```

### Static-path budgets

- `e2e/js-budget.spec.ts` sums the gzip size of the scripts the page actually loaded (not the
  files in `dist/`, which include lazy chunks) and fails above 100 KB, at both viewports.
- The same spec fails when a loaded script carries a three, GSAP or Lenis fingerprint. The Lenis
  marker is `lenis-smooth`/`lenis-stopped`, never the bare word, because the hero island ships
  the `data-lenis-prevent` attribute.
- `e2e/terminal-accent.spec.ts` fails when the mint accent shows up on anything but the block
  cursor, the active tmux window and the prompt chevron.

## 3D hero checks

Specs tagged `@3d` need real WebGL2. They launch Chromium with `--enable-unsafe-swiftshader`
(software GL, so no GPU is required) and skip with an explicit reason when WebGL2 is still
unavailable. They run one scene at a time on the `desktop` project with one retry: parallel
software scenes starve each other and miss the 25 s ready budget.

| Spec                                   | Covers                                                          |
| -------------------------------------- | --------------------------------------------------------------- |
| `e2e/hero-3d.spec.ts` (`@3d scene`)    | ready state, non-blank canvas, pause off screen, failure revert |
| `e2e/hero-3d.spec.ts` (`@3d terminal`) | terminal on the monitor, intro, keyboard semantics              |
| `e2e/hero-3d.spec.ts` (`@3d zoom`)     | Lenis, scroll zoom, anchors, wheel over the log                 |
| `e2e/screens.spec.ts` (`3d hero`)      | 1440 shot of the 3D hero, accent at most 15% (static: 10%)      |

Screenshots land in `test-results/screens/` (git-ignored); review them by eye, the ratio only
catches a runaway accent.

### Hero still (A10)

The static hero paints a committed render of the desk, `src/assets/hero/hero-still.jpg`, behind
the 2D terminal. Regenerate it whenever the scene, the palette or the model changes:

```sh
pnpm build && pnpm capture:hero
```

The script serves `dist/` with `astro preview` (or uses `CAPTURE_ORIGIN`), opens
`/es/?3d=1&capture=1` in a fresh context, waits for `data-hero-state="ready"` plus two frames,
hides the copy, the terminal and the readability fade with the `[data-capture]` rule, and
screenshots the 1600x1000 stage as JPEG (about 50 KB; the image budget is 150 KB). Then run
`pnpm build` again so Astro emits the AVIF/WebP variants. Never part of `pnpm build`.

- The 2D terminal frame is `src/lib/hero/still-anchor.json`. It is deliberately larger than the
  monitor of the still (the glass is about 20% of the stage, too small to type in): the script
  reads the glass from the live camera (`window.__heroCapture.screenRect()`, only with
  `capture=1`) and fails if the frame does not cover it.
- Look at the still after capturing: warm desk, lamp glow, no text, no toggle, green only on the
  glass.

### Zoom tuning

At the end of the scroll zoom the camera looks head-on at the glass. `ZOOM_HEIGHT_FRACTION`
in `src/lib/hero/monitor.ts` (0.85) is the share of the canvas height the glass may fill, and the
terminal must also cover at least 60% of the width. Today the terminal text ends near 35 px,
which reads large. Lower the fraction to get smaller text; the width rule keeps the S10 minimum.

### Manual checks (hero change)

These cannot run headless. They are the hero change's checks, not the author steps in
`docs/DEPLOY.md`. Record the date, machine and numbers next to each one.

| ID  | Check                                                                                                                         | Result                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | FPS >= 50 on a reference desktop, idle and during the zoom (Chrome DevTools, Rendering, FPS meter), plus how the scroll feels | Pending (manual).                                                                                                                                        |
| M2  | LCP < 2.5 s on the static path, mobile profile with Slow 4G and 4x CPU (Lighthouse or DevTools)                               | Pending (manual). Headless indication, 3 runs of a Playwright CDP throttle (1.6 Mbps, 150 ms, 4x CPU, 390px): 604, 604 and 612 ms.                       |
| M3  | Visual review at 1440 and 390, static and 3D: composition, warm palette, accent at most ~10%, subtle bloom, no "Matrix" look  | Pending (manual). Static and 3D shots at 1440 reviewed by eye while capturing the still: warm and contained.                                             |
| M4  | Touch device: no parallax, terminal usable, the virtual keyboard opens on tap                                                 | Pending (manual).                                                                                                                                        |
| M5  | Toggle the OS reduced-motion setting live: the hero returns to static without a reload (SHOULD)                               | Pending (manual).                                                                                                                                        |
| M6  | `whoami` schema, `public/admin/config.yml` and both seeds land in the same commit                                             | Done: schema, admin config and both seeds are in `08476cf`.                                                                                              |
| M7  | The scene loads with no third-party request (Network panel) and the GLB total stays under 3 MB                                | Pending (manual). Automated: `tests/unit/tooling/models-budget.test.ts` (GLB size) and `e2e/js-budget.spec.ts` (static path has no third-party request). |

How to run M1: open `/es/?3d=1`, enable the FPS meter, leave the page idle for 10 s, then scroll
the whole zoom range slowly and back. Note the lowest value seen in each phase. Below 50 on a
desktop GPU, check the quality tier first (`TIER_SETTINGS` in `src/lib/hero/tiers.ts`).
