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
