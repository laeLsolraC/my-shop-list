# Progress / handoff notes

Status as of 2026-09-26. Written so any model/session picking this up can
continue without re-deriving context. Update this file as work progresses;
don't let it go stale.

## What this project is

Local shopping-list web app. Data source is Google Drive (a single JSON
file, `shopping-list.json`), not a database. See `CLAUDE.md` for the full
architecture/conventions — read that first.

## Decisions already made (don't re-litigate without asking the user)

- Backend: Python 3.12 + FastAPI (chosen over Node/Next.js — user prefers
  Python backend).
- Frontend: React + Vite + TypeScript, separate from backend (not a
  combined Next.js app).
- Drive access: OAuth2, `drive.file` scope only (app-created files only,
  not full Drive access).
- Storage model: shopping list = CRUD on items inside one Drive-hosted
  JSON file, NOT a generic Drive file manager.
- Git: local repo + private GitHub remote named `my-shop-list`.
- GitHub CLI installed via winget already. NOT yet authenticated —
  `gh auth login` requires an interactive browser step the agent can't do;
  user needs to run it themselves, then an agent can create the remote and
  push.

## Done so far

`backend/` package created with:
- `requirements.txt`
- `.env.example`
- `app/__init__.py`, `app/routers/__init__.py`
- `app/config.py` — env loading, `SCOPES = ["https://www.googleapis.com/auth/drive.file"]`
- `app/schemas.py` — `Item`, `ItemCreate`, `ItemUpdate`
- `app/google_auth.py` — full OAuth flow helper (auth URL, code exchange,
  credential load/refresh/save/logout), token cached to `token.json`

`CLAUDE.md` and this file created at repo root.

## Not done yet (in rough build order)

1. `backend/app/drive_store.py` — find-or-create `shopping-list.json` on
   Drive, `read_items()` / `write_items()` helpers using
   `googleapiclient.discovery.build('drive', 'v3', credentials=...)`.
2. `backend/app/routers/auth.py` — `GET /auth/login` (redirect to Google
   consent), `GET /auth/callback` (exchange code, redirect to
   `FRONTEND_URL`), `GET /auth/status`, `POST /auth/logout`.
3. `backend/app/routers/items.py` — `GET/POST /items`,
   `PUT/DELETE /items/{id}`, backed by `drive_store.py`.
4. `backend/app/main.py` — FastAPI app, CORS allowing `http://localhost:5173`,
   include both routers.
5. Scaffold `frontend/` — `npm create vite@latest frontend -- --template react-ts`,
   then build: auth-check on load -> "Connect Google Drive" button if not
   authenticated, else item list UI (add / check off (done) / edit / delete).
6. Root `.gitignore` (must cover: `backend/.venv`, `backend/__pycache__`,
   `backend/.env`, `backend/token.json`, `frontend/node_modules`,
   `frontend/dist`).
7. Root `README.md` — end-user setup instructions, including the Google
   Cloud Console steps (create OAuth client, enable Drive API, set
   redirect URI `http://localhost:8000/auth/callback`).
8. `git init`, first commit.
9. Once user confirms `gh auth login` is done: `gh repo create my-shop-list
   --private --source=. --remote=origin`, push.

## Open questions for the user (ask if relevant, don't assume)

- None currently blocking — the plan above was confirmed via
  AskUserQuestion earlier in the session. If requirements seem to have
  changed, re-confirm rather than guessing.
