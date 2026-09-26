import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { CatalogItem, ShoppingList, ShoppingListSummary } from "../types";

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
}

export type MutationOp =
  | { kind: "addItem"; payload: unknown }
  | { kind: "updateItem"; itemId: string; payload: unknown }
  | { kind: "deleteItem"; itemId: string }
  | { kind: "addCatalogItem"; payload: unknown }
  | { kind: "updateCatalogItem"; itemId: string; payload: unknown }
  | { kind: "deleteCatalogItem"; itemId: string }
  | { kind: "createNewList" };

export interface QueuedMutation {
  id: string;
  createdAt: number;
  op: MutationOp;
}

interface ShopListDB extends DBSchema {
  auth: {
    key: "tokens";
    value: StoredTokens;
  };
  cache: {
    key: string; // "catalog" | "activeList" | "history"
    value: CatalogItem[] | ShoppingList | ShoppingListSummary[];
  };
  mutationQueue: {
    key: string;
    value: QueuedMutation;
  };
}

let dbPromise: Promise<IDBPDatabase<ShopListDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<ShopListDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ShopListDB>("my-shop-list", 1, {
      upgrade(db) {
        db.createObjectStore("auth");
        db.createObjectStore("cache");
        db.createObjectStore("mutationQueue");
      },
    });
  }
  return dbPromise;
}

export async function getTokens(): Promise<StoredTokens | undefined> {
  const db = await getDB();
  return db.get("auth", "tokens");
}

export async function setTokens(tokens: StoredTokens): Promise<void> {
  const db = await getDB();
  await db.put("auth", tokens, "tokens");
}

export async function clearTokens(): Promise<void> {
  const db = await getDB();
  await db.delete("auth", "tokens");
}

export async function getCache<T>(key: "catalog" | "activeList" | "history"): Promise<T | undefined> {
  const db = await getDB();
  return db.get("cache", key) as Promise<T | undefined>;
}

export async function setCache(key: "catalog" | "activeList" | "history", value: unknown): Promise<void> {
  const db = await getDB();
  await db.put("cache", value as never, key);
}

export async function enqueueMutation(op: MutationOp): Promise<void> {
  const db = await getDB();
  const id = crypto.randomUUID();
  await db.put("mutationQueue", { id, createdAt: Date.now(), op }, id);
}

export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  const db = await getDB();
  const all = await db.getAll("mutationQueue");
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeMutation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("mutationQueue", id);
}
