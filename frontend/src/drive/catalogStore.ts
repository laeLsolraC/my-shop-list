import { createJson, findFile, readJson, writeJson } from "./driveClient";
import type { CatalogItem, CatalogItemCreate, CatalogItemUpdate } from "../types";

const CATALOG_FILENAME = "catalog.json";

export class NotFound extends Error {}

async function getCatalogFileId(): Promise<string> {
  const existing = await findFile(CATALOG_FILENAME);
  if (existing) return existing;
  return createJson(CATALOG_FILENAME, []);
}

export async function getCatalog(): Promise<CatalogItem[]> {
  const fileId = await getCatalogFileId();
  const items = await readJson<CatalogItem[]>(fileId);
  return items.map((item) => ({ ...item, favorite: item.favorite ?? false }));
}

async function saveCatalog(fileId: string, items: CatalogItem[]): Promise<void> {
  await writeJson(fileId, items);
}

export async function addCatalogItem(item: CatalogItemCreate): Promise<CatalogItem> {
  const fileId = await getCatalogFileId();
  const items = await getCatalog();
  const newItem: CatalogItem = {
    id: item.id ?? crypto.randomUUID(),
    name_pt: item.name_pt ?? null,
    name_en: item.name_en ?? null,
    default_quantity: item.default_quantity ?? null,
    default_last_price: item.default_last_price ?? null,
    favorite: false,
  };
  items.push(newItem);
  await saveCatalog(fileId, items);
  return newItem;
}

export async function updateCatalogItem(itemId: string, patch: CatalogItemUpdate): Promise<CatalogItem> {
  const fileId = await getCatalogFileId();
  const items = await getCatalog();
  const idx = items.findIndex((i) => i.id === itemId);
  if (idx === -1) throw new NotFound(`catalog item ${itemId} not found`);
  const updated = { ...items[idx], ...patch };
  items[idx] = updated;
  await saveCatalog(fileId, items);
  return updated;
}

export async function deleteCatalogItem(itemId: string): Promise<void> {
  const fileId = await getCatalogFileId();
  const items = (await getCatalog()).filter((i) => i.id !== itemId);
  await saveCatalog(fileId, items);
}
