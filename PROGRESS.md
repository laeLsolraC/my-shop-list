# Progress / handoff notes

Status as of 2026-09-26. Written so any model/session picking this up can
continue without re-deriving context. Update this file as work progresses;
don't let it go stale.

## What this project is

A shopping-list PWA. See `CLAUDE.md` for the full architecture (frontend
talks to Google Drive directly, a tiny Cloudflare Worker only proxies the
OAuth token exchange) and `REQUIREMENTS.md` for the full feature/UX spec.

**It's live and verified working**: https://laelsolrac.github.io/my-shop-list/

## Decisions already made (don't re-litigate without asking the user)

- **No backend in the data path.** The original FastAPI-backend design was
  fully replaced this session after the user clarified the app must work
  from any device, offline, with zero dependency on a specific machine.
- Frontend: React + Vite + TypeScript, installable PWA, deployed to GitHub
  Pages (the repo is public — GitHub Pages doesn't support private repos on
  the free plan, and there's nothing sensitive committed).
- Auth: OAuth 2.0 Authorization Code + PKCE, "Web application" client type
  (reusing the client already created), with a Cloudflare Worker
  (`worker/`) proxying the token exchange/refresh since Google requires a
  client secret there. No refresh-token popups after the first login.
- Drive access: `drive.file` scope only, same as before.
- Storage model: a `catalog.json` file plus one `shopping-list-{id}.json`
  per list (`id` = `YYYYMMDDvN`). "Active list" is derived (the
  highest-dated/versioned file), not tracked by a separate pointer.
- Offline: only the **active list** needs to fully work offline
  (view/add/check/edit/delete, queued and synced on reconnect). Catalog and
  History require connectivity. Conflict handling is last-write-wins.
- Git: local repo + private... now **public** GitHub remote
  (`laeLsolraC/my-shop-list`), `gh` CLI authenticated.

## Done so far — everything in the original plan is complete

- `worker/` deployed at
  `https://my-shop-list-token-proxy.my-shop-list-worker.workers.dev`,
  secrets set both there and in `worker/.dev.vars` for local dev.
- Google Cloud OAuth client updated with the GitHub Pages + localhost
  origins/redirect URIs.
- `frontend/` fully built (auth, Drive client/stores, offline queue, all
  screens), deployed via `.github/workflows/deploy.yml` to GitHub Pages.
- **Live end-to-end verification done** with a real Google account against
  the real deployed app (see `e2e/`): login, catalog add, add-to-list via
  type-ahead, check-off with price sync, and offline-add-then-reconnect-
  sync all confirmed working against real Drive data.
- Two real bugs found by that live testing and fixed:
  1. `repo.ts`'s online write paths were catching *any* error from the
     network path and silently falling back to the offline queue, even
     when genuinely connected — masking real failures as queued mutations
     with incomplete data. Now only genuine network failures (`TypeError`
     from a blocked fetch) fall back; logical errors surface as a real
     error/toast.
  2. `listStore.addItem`'s catalog lookup (used when adding an item by
     `catalog_item_id`) could race Drive's own read-after-write
     propagation delay for a catalog entry created moments earlier — added
     a short retry rather than failing immediately.
- `backend/` — retired, kept in repo unused (cleanup left to the user).
- `e2e/smoke-test.js` — a repeatable Playwright smoke test; see
  `e2e/README.md` for how to run it (requires a manually-authenticated
  browser session, since Google blocks sign-in from an automation-launched
  one).

## Not done yet

1. **Real-device test**: install the PWA (Add to Home Screen) on an actual
   phone and repeat the same scenarios in standalone mode specifically,
   since that's the mode this was built for. Only tested on desktop Edge
   so far.
2. Cleanup decision (ask the user, don't do unilaterally): delete or keep
   `backend/`.

## Notes for whoever runs the e2e test next

Drive's read-after-write propagation showed real variance during testing
— usually fast, occasionally 10s of seconds under rapid repeated requests.
`e2e/smoke-test.js` treats a drained mutation queue (no errors) as the
authoritative signal that a write succeeded, rather than re-reading Drive
immediately afterward — that re-read was flaking on its own timing, not on
anything the app does.

## Open questions for the user (ask if relevant, don't assume)

- None currently blocking.
