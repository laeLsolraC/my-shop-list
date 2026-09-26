import { enqueueMutation, getQueuedMutations, removeMutation, setCache, type MutationOp } from "./db";
import * as listStore from "../drive/listStore";
import * as catalogStore from "../drive/catalogStore";
import type {
  CatalogItemCreate,
  CatalogItemUpdate,
  ListItemCreate,
  ListItemUpdate,
} from "../types";

export function isOnline(): boolean {
  return navigator.onLine;
}

/** Queues a mutation for later sync. Call this from optimistic UI actions when offline. */
export async function queueMutation(op: MutationOp): Promise<void> {
  await enqueueMutation(op);
}

async function applyMutation(op: MutationOp): Promise<void> {
  switch (op.kind) {
    case "addItem":
      await listStore.addItem(op.payload as ListItemCreate);
      return;
    case "updateItem":
      await listStore.updateItem(op.itemId, op.payload as ListItemUpdate);
      return;
    case "deleteItem":
      await listStore.deleteItem(op.itemId);
      return;
    case "addCatalogItem":
      await catalogStore.addCatalogItem(op.payload as CatalogItemCreate);
      return;
    case "updateCatalogItem":
      await catalogStore.updateCatalogItem(op.itemId, op.payload as CatalogItemUpdate);
      return;
    case "deleteCatalogItem":
      await catalogStore.deleteCatalogItem(op.itemId);
      return;
    case "createNewList":
      await listStore.createNewList();
      return;
  }
}

/** Replays queued mutations in order, then refreshes caches. Stops at the first failure so order is preserved. */
export async function flushQueue(): Promise<{ flushed: number; failed: boolean }> {
  const queued = await getQueuedMutations();
  let flushed = 0;
  for (const mutation of queued) {
    try {
      await applyMutation(mutation.op);
      await removeMutation(mutation.id);
      flushed++;
    } catch (err) {
      return { flushed, failed: true };
    }
  }
  await refreshCaches();
  return { flushed, failed: false };
}

export async function refreshCaches(): Promise<void> {
  const [catalog, activeList, history] = await Promise.all([
    catalogStore.getCatalog(),
    listStore.getActiveList(),
    listStore.getListHistory(),
  ]);
  await Promise.all([
    setCache("catalog", catalog),
    setCache("activeList", activeList),
    setCache("history", history),
  ]);
}

let listenersAttached = false;
export function attachOnlineListener(onFlushed: (result: { flushed: number; failed: boolean }) => void): void {
  if (listenersAttached) return;
  listenersAttached = true;
  window.addEventListener("online", () => {
    flushQueue().then(onFlushed);
  });
}
