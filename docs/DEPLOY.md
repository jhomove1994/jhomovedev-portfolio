# Deploy and author checklist

The site is code-complete for the content base. Going live needs six manual steps (M1-M6) that only the author can do. Do them in order; M1 unblocks the live admin and Workers Builds.

## Quick path

1. M1: create the GitHub repository and push `main`.
2. M2: create a fine-grained PAT and log in at `/admin`.
3. M3: connect Cloudflare Workers Builds.
4. M4-M6: upload files, review copy, confirm the pending decisions below.
5. Verify: the production URL serves the new CV within ~2 minutes of saving in `/admin`.

## Scope of the first release

The AI assistant (`/api/chat`) is not part of the first release (author decision, 2026-10-17). The site ships without it; `wrangler.jsonc` has only the ASSETS binding.

## Manual steps

| Step | Owner  | Action                                                                                                                                                                         | Blocks                                                  |
| ---- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| M1   | Author | Create the public GitHub repo and push `main`. Repo: `jhomove1994/jhomovedev-portfolio` (already set in `public/admin/config.yml`).                                            | Live `/admin`, Workers Builds                           |
| M2   | Author | Create a fine-grained PAT (see below). Use it to log in at `/admin`. Never commit it.                                                                                          | Editing content from `/admin`                           |
| M3   | Author | Connect Workers Builds (see below). Confirm the workers.dev subdomain and update `SITE_URL` if it differs (G3).                                                                | Production deploys, correct canonical and hreflang URLs |
| M4   | Author | CV ES and CV EN and the OG images (1200x630, ES and EN) are in `public/uploads/` and set in the Media entries. Replace the OG image from `/admin` if you want a different one. | Share previews                                          |
| M5   | Author | Review ES/EN copy and replace every `TODO(autor)` (inventory below). Confirm each `published` flag.                                                                            | Honest public content                                   |
| M6   | Author | Decide G1 to G5 (next section).                                                                                                                                                | Final copy and URLs                                     |

### M2: fine-grained PAT

- Resource owner: your account. Repository access: **only this repository**.
- Permission: **Contents: Read and write**. Nothing else.
- The OAuth Worker (GitHub login without a PAT) is **deferred** to a later change. Until then `/admin` authenticates with the PAT.

### M3: Workers Builds settings

| Setting           | Value                 |
| ----------------- | --------------------- |
| Production branch | `main`                |
| Build command     | `pnpm build`          |
| Deploy command    | `npx wrangler deploy` |

Every save in `/admin` is a commit to `main`, which triggers a build. A save that breaks the content schema fails the build and leaves the previous deployment live.

## Pending decisions to confirm

| ID  | Decision                   | Current default                                                                                                                                                      | Where                              |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| G1  | `TODO(autor)` placeholders | Hidden in production, drawn with a dashed outline in dev. One helper owns this.                                                                                      | `src/lib/content/todo.ts`          |
| G2  | Profile `availability`     | Confirmed by the author (2026-10-17): `open-to-offers`, rendered in the hero meta line (`not-available` renders nothing).                                            | `src/content/profile/{es,en}.json` |
| G3  | Site URL                   | Confirmed: `https://jhomove.dev` (custom domain; workers.dev still serves it). Regenerate the OG images if it changes. `astro.config.mjs` `site` reads it.           | `src/lib/site.ts`                  |
| G4  | 3D on software rendering   | Machines without a GPU (software renderer) get the static hero plus a visible "Enable 3D" toggle; their explicit choice forces 3D. Drop the signal to default to 3D. | `src/lib/capabilities.ts`          |
| G5  | GSAP license               | GSAP is under its "Standard no-charge license", not MIT (noted in the credits). Confirm it is acceptable for this site.                                              | `public/models/CREDITS.md`         |

## `TODO(autor)` inventory

| Area       | What is missing                                                                                                                                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leadership | Resolved (2026-10-17): `gisoft-mentoring-and-system-design` replaced the placeholder. Nothing missing.                                                                                                                     |
| Projects   | Case-study narratives for 4 drafts, all `published: false`: `fraud-pilot`, `legacy-to-nest`, `this-portfolio`, `virtual-card` (ES and EN). Publish each only after writing it, anonymized, with no code or internal names. |

## Copy review notes

- ES experience bullets are condensed first-person paraphrases of the CV (for example "Desarrollé de punta a punta..."). Check them for overstatement.
- The AV Villas Scrum bullet was omitted on purpose. Add it back only if you want it.
- Do not present mainframe/COBOL as a specialty, and do not add a phone number anywhere.

## Verify before and after deploy

```sh
pnpm verify                      # format, lint, typecheck, unit tests, build
E2E_PORT=4399 pnpm test:e2e      # browser checks at 1440px and 390px
pnpm wrangler deploy --dry-run   # expect only the ASSETS binding
```

## After deploy: Search Console

1. In Google Search Console add a **URL-prefix** property for the production origin (`SITE_URL` in `src/lib/site.ts`) and verify it.
2. Under Sitemaps, submit `sitemap.xml`. It lists `/es/` and `/en/` with hreflang alternates, and `robots.txt` points to it.
3. Optionally inspect both locale URLs and request indexing.

## Checklist

- [ ] M1 repo created and `main` pushed
- [ ] M2 PAT created (this repo only, Contents read/write) and `/admin` login works
- [ ] M3 Workers Builds connected, `SITE_URL` matches the real subdomain
- [x] M4 OG image and CV uploaded (ES and EN)
- [ ] M5 every `TODO(autor)` resolved, `published` flags confirmed
- [ ] M6 G1 to G5 decided
- [ ] A CV uploaded in `/admin` is served by production within ~2 minutes and the CV button points to it
- [ ] A deliberately invalid save fails the build and the previous deployment stays live
