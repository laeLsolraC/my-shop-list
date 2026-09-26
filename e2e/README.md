# Live smoke test

Drives the real deployed app (`https://laelsolrac.github.io/my-shop-list/`)
through Playwright, attached to a real browser you log into manually.

Google actively blocks sign-in attempts from an automation-launched
browser, so this can't log in for you — it attaches over the DevTools
protocol to a browser window you've already signed into.

## Setup (once per session)

```
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" \
  --remote-debugging-port=9222 \
  --user-data-dir="<repo>\e2e\.edge-profile" \
  --no-first-run --no-default-browser-check \
  "https://laelsolrac.github.io/my-shop-list/"
```

Click **Connect Google Drive** and sign in normally in that window. The
profile persists in `.edge-profile/` (git-ignored — it holds a real logged-in
session), so you only need to do this once per profile, not once per run.

## Run

```
cd e2e
npm install
npx playwright install chromium   # first time only
node smoke-test.js
```

It adds a catalog item, adds it to the active list via type-ahead, checks
it off, tests an offline add + reconnect sync, then cleans up everything it
created. Prints a PASS/CHECK line at the end plus any console errors seen.
