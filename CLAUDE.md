# My Shop List

A shopping-list web app. The list itself is NOT stored in a database — it's
persisted as a single JSON file (`shopping-list.json`) in the user's Google
Drive, accessed via the Google Drive API (OAuth2, `drive.file` scope only:
the app can only see files it created itself, not the user's whole Drive).

## Architecture

Two separate local services, no shared code:

- `backend/` — Python 3.12, FastAPI. Owns the Google OAuth flow and all
  Drive read/write calls. Runs on `http://localhost:8000`.
- `frontend/` — React + Vite + TypeScript (not yet scaffolded). Talks to the
  backend over HTTP. Runs on `http://localhost:5173`.

Data flow: frontend calls backend REST endpoints -> backend loads/refreshes
stored Google credentials -> backend reads/writes `shopping-list.json` on
Drive via `googleapiclient` -> backend returns plain JSON to frontend. There
is no database; Drive is the datastore.

## Backend layout (`backend/app/`)

- `config.py` — loads env vars (`.env`, see `.env.example`), defines the
  OAuth scope list.
- `google_auth.py` — builds the OAuth `Flow`, generates the consent URL,
  exchanges the auth code, loads/refreshes/saves credentials to
  `token.json` (git-ignored, lives in `backend/`), `logout()` deletes it.
- `schemas.py` — Pydantic models: `Item`, `ItemCreate`, `ItemUpdate`.
- `drive_store.py` — **not yet written**. Will find-or-create
  `shopping-list.json` on Drive and read/write the item list as JSON.
- `routers/items.py` — **not yet written**. CRUD endpoints for list items.
- `routers/auth.py` — **not yet written**. `/auth/login`, `/auth/callback`,
  `/auth/status`, `/auth/logout`.
- `main.py` — **not yet written**. FastAPI app instance, CORS for the Vite
  dev origin, mounts the routers.

See `PROGRESS.md` for exact build status and the next steps.

## Auth model

This is a single-user local app, not a multi-tenant service. Credentials
are refreshed and cached to a local file (`token.json`), not a session
store or database. Don't add multi-user auth/session infrastructure unless
the project's scope actually changes — this is deliberately simple.

## Conventions

- Backend: standard FastAPI + Pydantic idioms, one router module per
  resource, business logic (Drive calls) lives in `*_store.py` modules, not
  in route handlers.
- Keep the `drive.file` scope. Don't widen it to `drive` or
  `drive.readonly` — the narrower scope is intentional so the app can never
  see the rest of the user's Drive.
- No database. If a feature seems to need one, that's a signal to stop and
  re-check the design with the user rather than adding one unilaterally.
- Secrets (`backend/.env`, `backend/token.json`) must never be committed —
  both are git-ignored; only `.env.example` is tracked.

## Running locally (once scaffolding is complete)

```
# backend
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env   # then fill in Google OAuth client id/secret
uvicorn app.main:app --reload

# frontend
cd frontend
npm install
npm run dev
```

Google Cloud setup needed before first run: an OAuth 2.0 Client ID (Web
application type) in Google Cloud Console, Drive API enabled, authorized
redirect URI `http://localhost:8000/auth/callback`.

## Git / GitHub

Repo is meant to be local + a private GitHub remote (`my-shop-list`).
GitHub CLI (`gh`) is installed but not yet authenticated on this machine —
run `gh auth login` interactively before asking an agent to create/push the
remote.
