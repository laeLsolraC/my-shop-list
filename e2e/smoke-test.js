// End-to-end smoke test against the live app, driven through an already
// logged-in Edge session (Google blocks sign-in from an automation-launched
// browser, so login must happen in a real, manually-driven window first —
// see README.md in this directory).
const { chromium } = require("playwright");

const CDP_URL = "http://localhost:9222";

function log(msg) {
  console.log(`\n=== ${msg} ===`);
}

async function swipeDelete(page, row) {
  const box = await row.boundingBox();
  const startX = box.x + box.width * 0.6; // clear of the edit-icon button
  const y = box.y + box.height / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(startX - i * 15, y);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
}

async function main() {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const page = browser.contexts()[0].pages()[0];

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  const isLoggedIn = await page.locator(".tab-bar").isVisible().catch(() => false);
  if (!isLoggedIn) {
    throw new Error("Not logged in in the attached browser — see README.md to set that up first.");
  }
  log("Logged in, starting smoke test");

  const testItemName = `Smoke Test Item ${Date.now()}`;

  log("Add a catalog item");
  await page.locator(".tab-bar button", { hasText: "Catalog" }).click();
  await page.locator("text=+ Add").click();
  await page.locator(".sheet input").first().fill(testItemName);
  await page.locator(".sheet input").nth(1).fill("1L");
  await page.locator(".sheet input").nth(2).fill("3.50");
  await page.locator(".btn-primary", { hasText: "Save" }).click();
  // Real Drive round-trips observed to occasionally take 10s+ in this
  // environment — wait for the actual effect (sheet closing), not a guess.
  await page.locator(".sheet").waitFor({ state: "hidden", timeout: 45000 });

  log("Add it to the active list via type-ahead search");
  await page.locator(".tab-bar button", { hasText: "Active List" }).click();
  await page.locator(".fab").click();
  await page.locator('input[placeholder*="Search"]').fill(testItemName.slice(0, 12));
  await page.locator(".suggestion-item").first().waitFor({ state: "visible", timeout: 10000 });
  await page.locator(".suggestion-item").first().click();
  const onActiveList = await page
    .locator(`.item-row .item-name:has-text("${testItemName}")`)
    .waitFor({ state: "visible", timeout: 45000 })
    .then(() => true)
    .catch(() => false);
  log(`On active list: ${onActiveList}`);

  log("Check it off");
  await page.locator(`.item-row:has-text("${testItemName}")`).locator(".item-main").click({ timeout: 45000 });
  const inDoneSection = await page
    .locator(`.item-row.done:has-text("${testItemName}")`)
    .waitFor({ state: "visible", timeout: 45000 })
    .then(() => true)
    .catch(() => false);
  log(`Moved to Done section: ${inDoneSection}`);

  log("Offline add + reconnect sync");
  const client = await browser.contexts()[0].newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });

  const offlineItemName = `Smoke Offline ${Date.now()}`;
  await page.locator(".fab").click();
  await page.locator('input[placeholder*="Search"]').fill(offlineItemName);
  await page.locator("button", { hasText: "Add" }).click();
  await page.locator("button", { hasText: "Just this once" }).click();
  const offlineOptimistic = await page
    .locator(`text=${offlineItemName}`)
    .waitFor({ state: "visible", timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  log(`Offline item appears immediately (optimistic UI): ${offlineOptimistic}`);

  await client.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.evaluate(() => window.dispatchEvent(new Event("online")));

  log("Waiting for the mutation queue to actually drain (real Drive round-trips, not a guessed timeout)");
  const queueDrained = await page
    .waitForFunction(
      () =>
        new Promise((resolve) => {
          const req = indexedDB.open("my-shop-list");
          req.onsuccess = () => {
            const tx = req.result.transaction("mutationQueue", "readonly");
            tx.objectStore("mutationQueue").count().onsuccess = (e) => resolve(e.target.result === 0);
          };
          req.onerror = () => resolve(false);
        }),
      { timeout: 60000, polling: 1000 },
    )
    .then(() => true)
    .catch(() => false);
  log(`Mutation queue drained within 60s: ${queueDrained}`);

  // Check Drive directly rather than re-rendering the UI after reload — this
  // tests the thing we actually care about (did it really persist) without
  // also depending on React's post-reload render timing, which is a separate
  // and much less interesting thing to flake on. A successful write response
  // from Drive doesn't always mean an immediate subsequent read reflects it
  // (observed directly: same content, a few seconds apart, differed) — so
  // this retries briefly rather than treating one read as ground truth.
  const offlineSynced = await page.evaluate(async (itemName) => {
    const tokens = await new Promise((resolve, reject) => {
      const req = indexedDB.open("my-shop-list");
      req.onsuccess = () => {
        req.result.transaction("auth", "readonly").objectStore("auth").get("tokens").onsuccess = (e) =>
          resolve(e.target.result);
      };
      req.onerror = () => reject(req.error);
    });
    const headers = { Authorization: `Bearer ${tokens.access_token}` };
    for (let attempt = 0; attempt < 10; attempt++) {
      const listResp = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=" +
          encodeURIComponent("name contains 'shopping-list-' and trashed = false") +
          "&fields=files(id,name)",
        { headers },
      );
      const { files } = await listResp.json();
      const activeFile = files.sort((a, b) => (a.name < b.name ? 1 : -1))[0];
      const contentResp = await fetch(`https://www.googleapis.com/drive/v3/files/${activeFile.id}?alt=media`, { headers });
      const content = await contentResp.json();
      if (content.items.some((i) => i.name === itemName)) return true;
      await new Promise((r) => setTimeout(r, 2000));
    }
    return false;
  }, offlineItemName);
  log(`Offline item really persisted in Drive: ${offlineSynced}`);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  log("Cleaning up test data this run created");
  await page.locator(".tab-bar button", { hasText: "Active List" }).click();
  await page.waitForTimeout(500);
  for (const name of [testItemName, offlineItemName]) {
    const row = page.locator(`.item-row:has-text("${name}")`).first();
    if ((await row.count()) > 0) {
      await swipeDelete(page, row);
      await page.waitForTimeout(500);
    }
  }
  await page.waitForTimeout(11000); // undo window

  await page.locator(".tab-bar button", { hasText: "Catalog" }).click();
  await page.waitForTimeout(500);
  const catalogRow = page.locator(`.item-row:has-text("${testItemName}")`).first();
  if ((await catalogRow.count()) > 0) {
    await catalogRow.click();
    await page.waitForTimeout(300);
    await page.locator(".btn-danger", { hasText: "Delete" }).click();
    await page.waitForTimeout(1500);
  }

  log("Console errors captured during the run");
  console.log(consoleErrors.length ? consoleErrors : "(none)");

  log(`Result: ${onActiveList && inDoneSection && offlineOptimistic && offlineSynced ? "PASS" : "CHECK OUTPUT ABOVE"}`);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
