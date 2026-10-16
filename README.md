# JhomoveDev

Bilingual (ES/EN) portfolio of Jhonatan Moreno. Astro static site with React islands, content in `src/content/` edited from `/admin` (Sveltia CMS, Git-based), served by Cloudflare Workers.

## Quick path

```sh
pnpm install
pnpm dev        # http://localhost:4321
pnpm verify     # format, lint, typecheck, unit tests, build
```

## Commands

| Command                         | Action                                         |
| ------------------------------- | ---------------------------------------------- |
| `pnpm dev`                      | Local dev server                               |
| `pnpm build`                    | Production build to `dist/`                    |
| `pnpm test`                     | Unit tests (Vitest)                            |
| `E2E_PORT=4399 pnpm test:e2e`   | Browser tests and screenshots (Playwright)     |
| `pnpm wrangler deploy --dry-run` | Validate the Worker without deploying          |

## Docs

- [`docs/DEPLOY.md`](docs/DEPLOY.md): author checklist to go live and pending decisions.
- [`docs/REQUERIMIENTOS.md`](docs/REQUERIMIENTOS.md): product requirements.
- [`docs/TESTING.md`](docs/TESTING.md): testing approach.
