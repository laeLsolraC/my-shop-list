# My Shop List

A shopping-list PWA. There is no database and no app-owned server holding
data: everything (a catalog of known items, and one JSON file per shopping
list) is stored as JSON files in the user's own Google Drive, read and
written directly from the browser via the Drive REST API (OAuth2,
`drive.file` scope only — the app can only see files it created itself,
never the rest of the user's Drive).

**This is a rewrite of the original architecture** (a local FastAPI backend
mediating Drive access). That design assumed the app would always run next
to a specific always-on machine; the actual requirement is "works from any
device, offline-capable, no dependency on any one computer being on," which
a `localhost`-bound backend can't satisfy. See "Retired backend" below.

## Architecture

- `frontend/` — React + Vite + TypeScript, built as an installable PWA
  (`vite-plugin-pwa`), deployed as static files to **GitHub Pages**. Talks
  directly to `www.googleapis.com/drive/v3` with a bearer token — no
  backend in the data path.
- `worker/` — a tiny, stateless Cloudflare Worker with exactly two
  endpoints (`/token/exchange`, `/token/refresh`). Its only job is holding
  `GOOGLE_CLIENT_SECRET` server-side and forwarding the OAuth token
  exchange/refresh to Google — a step the frontend cannot do itself because
  Google requires a client secret there even when using PKCE. No business
  logic, no data, no state.
- `backend/` — retired, unused by the shipped app. See below.

Data flow: frontend generates a PKCE challenge -> redirects to Google for
consent -> Google redirects back with an auth code -> frontend POSTs the
code to the Worker's `/token/exchange` -> Worker attaches the client secret
and forwards to Google -> frontend stores `{access_token, refresh_token,
expires_at}` in IndexedDB. From then on, `getValidAccessToken()`
transparently calls the Worker's `/token/refresh` (a plain background
fetch, no popup) whenever the access token is stale. All Drive reads/writes
go through `frontend/src/drive/*`.

## Frontend layout (`frontend/src/`)

- `config.ts` — client id, Worker URL, redirect URI, scope (all read from
  Vite env vars, see `.env.example`).
- `auth/pkce.ts`, `auth/googleAuth.ts` — PKCE generation, login redirect,
  callback handling, token refresh, `getValidAccessToken()`.
- `drive/driveClient.ts` — low-level Drive REST calls (`findFile`,
  `listFiles`, `readJson`, `writeJson`, `createJson`).
- `drive/catalogStore.ts`, `drive/listStore.ts` — the actual business logic
  (find-or-create files, catalog CRUD, list CRUD, carry-over of unchecked
  items on "create new list" using a `YYYYMMDDvN` id scheme, price sync
  from a checked-off item back to its catalog entry). This is a
  function-for-function port of what used to be `backend/app/drive_store.py`.
- `offline/db.ts` — IndexedDB: cached tokens, cached catalog/active
  list/history, and a mutation queue.
- `offline/sync.ts` — replays the mutation queue on reconnect.
- `data/repo.ts` — the layer the UI actually calls: cache-first reads,
  network-first-with-offline-fallback writes. Only the **active list**
  needs to keep working fully offline (view/add/check/edit/delete); Catalog
  and History require connectivity.
- `components/` — screens and bottom sheets (see `REQUIREMENTS.md` for the
  full UX spec agreed with the user).

## Retired backend (`backend/`)

The original FastAPI app (`drive_store.py`, `routers/auth.py`,
`routers/catalog.py`, `routers/lists.py`, `main.py`) was built and verified
working end-to-end against real Google Drive before this rewrite. It is
left in the repo, unused by the shipped app. Deleting it (or keeping it as
a reference/local-dev tool) is a cleanup decision for the user, not done
unilaterally.

## Auth model

Single-user, personal app. The OAuth client is registered as a **Web
application** type (required for a real HTTPS redirect URI — a "Desktop
app" client type only supports `localhost`/loopback redirects and does not
work for a hosted page). The client secret lives only in the Cloudflare
Worker's environment, never in frontend code or a committed file.

## Conventions

- Keep the `drive.file` scope. Don't widen it — the narrowness is
  intentional so the app can never see the rest of the user's Drive.
- No database, anywhere in the stack. Drive is the sole datastore. If a
  feature seems to need one, stop and re-check the design with the user.
- The Worker (`worker/`) must stay stateless and secret-only — no business
  logic belongs there. If a feature seems to need server-side logic beyond
  "hold a secret," that's an architecture decision for the user, not
  something to add unilaterally.
- Conflict handling for concurrent edits (e.g. two devices offline at once)
  is deliberately last-write-wins, no detection/merge — an accepted
  tradeoff for a single-user app, not an oversight.

## Running locally

```
# worker (needed for login/refresh to work, even in local dev)
cd worker
npm install
npx wrangler dev   # serves /token/exchange, /token/refresh locally
# secrets: npx wrangler secret put GOOGLE_CLIENT_SECRET (and GOOGLE_CLIENT_ID, ALLOWED_ORIGIN)

# frontend
cd frontend
npm install
copy .env.example .env   # fill in VITE_GOOGLE_CLIENT_ID, VITE_WORKER_URL
npm run dev
```

Google Cloud setup: the existing "Web application" OAuth client (already
created) needs the frontend's dev origin (`http://localhost:5173`) and the
deployed GitHub Pages origin added to both Authorized JavaScript origins
and Authorized redirect URIs.

Deployment: pushing to `master` under `frontend/**` triggers
`.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages.
The Worker deploys separately via `npx wrangler deploy` from `worker/`.

## Git / GitHub

Repo is meant to be local + a private GitHub remote (`my-shop-list`).
GitHub CLI (`gh`) is installed but not yet authenticated on this machine —
run `gh auth login` interactively before asking an agent to create/push the
remote.
