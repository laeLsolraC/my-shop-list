# Progress / handoff notes

Status as of 2026-09-26. Written so any model/session picking this up can
continue without re-deriving context. Update this file as work progresses;
don't let it go stale.

## What this project is

A shopping-list PWA. See `CLAUDE.md` for the full architecture (frontend
talks to Google Drive directly, a tiny Cloudflare Worker only proxies the
OAuth token exchange) and `REQUIREMENTS.md` for the full feature/UX spec.

## Decisions already made (don't re-litigate without asking the user)

- **No backend in the data path.** The original FastAPI-backend design was
  fully replaced this session after the user clarified the app must work
  from any device, offline, with zero dependency on a specific machine.
- Frontend: React + Vite + TypeScript, installable PWA, deployed to GitHub
  Pages.
- Auth: OAuth 2.0 Authorization Code + PKCE, "Web application" client type
  (reusing the client already created — id in `frontend/.env`), with a
  Cloudflare Worker (`worker/`) proxying the token exchange/refresh since
  Google requires a client secret there. No refresh-token popups after the
  first login.
- Drive access: `drive.file` scope only, same as before.
- Storage model: a `catalog.json` file plus one `shopping-list-{id}.json`
  per list (`id` = `YYYYMMDDvN`). "Active list" is derived (the
  highest-dated/versioned file), not tracked by a separate pointer.
- Offline: only the **active list** needs to fully work offline
  (view/add/check/edit/delete, queued and synced on reconnect). Catalog and
  History require connectivity. Conflict handling is last-write-wins.
- Git: local repo + private GitHub remote named `my-shop-list`. `gh` CLI
  installed, not yet authenticated — needs `gh auth login` run interactively
  by the user before an agent can create/push the remote.

## Done so far

**Retired but working** (kept in repo, unused by the shipped app):
`backend/` — full FastAPI app, verified end-to-end against real Drive
(auth, catalog CRUD, list CRUD, carry-over, price sync all confirmed
working before the architecture pivot).

**Current build:**
- `worker/` — `wrangler.toml`, `src/index.ts` (`/token/exchange`,
  `/token/refresh`), typechecks clean. **Not yet deployed** (needs
  `npx wrangler deploy` + `wrangler secret put` for
  `GOOGLE_CLIENT_SECRET`/`GOOGLE_CLIENT_ID`/`ALLOWED_ORIGIN`, and a
  Cloudflare account).
- `frontend/` — full scaffold, typechecks clean, builds clean
  (`npm run build` produces a working PWA with service worker + manifest).
  Implemented: `types.ts`, `config.ts`, `auth/` (PKCE + token flow),
  `drive/` (`driveClient`, `catalogStore`, `listStore` — ported from
  `drive_store.py`), `offline/` (IndexedDB cache + mutation queue + sync),
  `data/repo.ts` (the cache/network/offline-fallback layer the UI calls),
  and all UI (`ActiveListScreen`, `CatalogScreen`, `HistoryScreen` +
  detail, `AddItemSheet`, `EditItemSheet`, `CatalogItemSheet`, `TabBar`,
  `Toast`, `ConnectScreen`, `BottomSheet`, `ItemRow` with swipe/long-press).
- Logo regenerated with the new palette (cream/olive/berry-pink/deep
  green); PWA icon set (192/512/maskable) generated into
  `frontend/public/icons/`.
- `.github/workflows/deploy.yml` — builds and deploys `frontend/` to GitHub
  Pages on push to `master`.

## Not done yet (in rough order)

1. **Create a Cloudflare account and deploy the Worker** (`cd worker &&
   npx wrangler deploy`), set its three env values via `wrangler secret
   put`. Get the deployed Worker URL.
2. **Update the Google Cloud OAuth client**: add the GitHub Pages origin
   (and `http://localhost:5173` for dev) to Authorized JavaScript origins
   and Authorized redirect URIs.
3. Fill in `frontend/.env`'s `VITE_WORKER_URL` with the deployed Worker URL
   (client id is already filled in).
4. **End-to-end test locally**: `wrangler dev` (worker) + `npm run dev`
   (frontend) together — full login, add catalog item, add to active list,
   check off with a price change, confirm catalog synced, create new list,
   confirm carry-over, confirm history — then repeat with DevTools
   "Offline" throttling to confirm the offline queue/sync actually works.
5. **Enable GitHub Pages** on the repo (Settings → Pages → source: GitHub
   Actions) and set the `VITE_GOOGLE_CLIENT_ID`/`VITE_WORKER_URL` repo
   variables the workflow reads, then push to trigger the first deploy.
6. **Real-device test**: install the PWA (Add to Home Screen) on an actual
   phone and repeat the same scenarios in standalone mode specifically,
   since that's the mode this was built for.
7. `git init` (if not already) / commit this rewrite; push once `gh auth
   login` is done.
8. Cleanup decision (ask the user, don't do unilaterally): delete or keep
   `backend/`.

## Open questions for the user (ask if relevant, don't assume)

- None currently blocking. If requirements seem to have changed, re-confirm
  via `/grilling` rather than guessing — that's how this rewrite itself got
  surfaced (an offline requirement raised mid-session invalidated the
  original architecture).
