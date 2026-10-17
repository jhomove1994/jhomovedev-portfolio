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
