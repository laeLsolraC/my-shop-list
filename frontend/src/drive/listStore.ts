import { createJson, listFiles, readJson, writeJson } from "./driveClient";
import { getCatalog, addCatalogItem, updateCatalogItem } from "./catalogStore";
import type {
  CatalogItem,
  ListItem,
  ListItemCreate,
  ListItemUpdate,
  ShoppingList,
  ShoppingListSummary,
} from "../types";

const LIST_PREFIX = "shopping-list-";
const LIST_ID_RE = /^(\d{8})v(\d+)$/;

export class NotFound extends Error {}

function listIdFromFilename(name: string): string | null {
  const stripped = name.startsWith(LIST_PREFIX) ? name.slice(LIST_PREFIX.length) : name;
  const id = stripped.endsWith(".json") ? stripped.slice(0, -".json".length) : stripped;
  return LIST_ID_RE.test(id) ? id : null;
}

async function listAllListFiles(): Promise<{ id: string; fileId: string }[]> {
  const files = await listFiles(LIST_PREFIX);
  const results: { id: string; fileId: string }[] = [];
  for (const f of files) {
    const id = listIdFromFilename(f.name);
    if (id) results.push({ id, fileId: f.id });
  }
  return results;
}

function sortKey(listId: string): [number, number] {
  const m = LIST_ID_RE.exec(listId)!;
  return [Number(m[1]), Number(m[2])];
}

function compareDesc(a: string, b: string): number {
  const [ad, av] = sortKey(a);
  const [bd, bv] = sortKey(b);
  return bd - ad || bv - av;
}

function listFilename(listId: string): string {
  return `${LIST_PREFIX}${listId}.json`;
}

function serializeList(list: ShoppingList): unknown {
  return list;
}

function nextListIdForToday(existingIds: string[]): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const todayStr = `${y}${m}${d}`;

  const versions = existingIds
    .map((id) => LIST_ID_RE.exec(id)!)
    .filter((m) => m[1] === todayStr)
    .map((m) => Number(m[2]));
  const nextVersion = (versions.length > 0 ? Math.max(...versions) : 0) + 1;
  return `${todayStr}v${nextVersion}`;
}

async function createEmptyList(listId: string): Promise<ShoppingList> {
  const list: ShoppingList = { id: listId, created_at: new Date().toISOString(), items: [] };
  await createJson(listFilename(listId), serializeList(list));
  return list;
}

async function getActiveListFile(): Promise<{ id: string; fileId: string }> {
  const files = await listAllListFiles();
  if (files.length === 0) {
    const list = await createEmptyList(nextListIdForToday([]));
    const refreshed = await listAllListFiles();
    return refreshed.find((f) => f.id === list.id)!;
  }
  return files.reduce((best, cur) => (compareDesc(cur.id, best.id) < 0 ? cur : best));
}

export async function getActiveList(): Promise<ShoppingList> {
  const { fileId } = await getActiveListFile();
  return readJson<ShoppingList>(fileId);
}

export async function createNewList(): Promise<ShoppingList> {
  const current = await getActiveList();
  const carriedItems: ListItem[] = current.items
    .filter((i) => !i.done)
    .map((i) => ({
      id: crypto.randomUUID(),
      catalog_item_id: i.catalog_item_id,
      name_pt: i.name_pt,
      name_en: i.name_en,
      quantity: i.quantity,
      price: i.price,
      done: false,
    }));

  const allIds = (await listAllListFiles()).map((f) => f.id);
  const newId = nextListIdForToday(allIds);
  const newList: ShoppingList = { id: newId, created_at: new Date().toISOString(), items: carriedItems };
  await createJson(listFilename(newId), serializeList(newList));
  return newList;
}

export async function getListHistory(): Promise<ShoppingListSummary[]> {
  const files = await listAllListFiles();
  if (files.length === 0) return [];
  const active = files.reduce((best, cur) => (compareDesc(cur.id, best.id) < 0 ? cur : best));
  const summaries: ShoppingListSummary[] = [];
  for (const f of files) {
    if (f.id === active.id) continue;
    const data = await readJson<ShoppingList>(f.fileId);
    summaries.push({ id: data.id, created_at: data.created_at });
  }
  summaries.sort((a, b) => compareDesc(a.id, b.id));
  return summaries;
}

export async function getList(listId: string): Promise<ShoppingList> {
  const files = await listAllListFiles();
  const match = files.find((f) => f.id === listId);
  if (!match) throw new NotFound(`list ${listId} not found`);
  return readJson<ShoppingList>(match.fileId);
}

export async function addItem(
  item: ListItemCreate,
): Promise<{ list: ShoppingList; catalogChange?: CatalogItem }> {
  const { fileId } = await getActiveListFile();
  const list = await readJson<ShoppingList>(fileId);

  let catalogItemId = item.catalog_item_id ?? null;
  let namePt = item.name_pt ?? null;
  let nameEn = item.name_en ?? null;
  let quantity = item.quantity ?? null;
  let price = item.price ?? null;
  let catalogChange: CatalogItem | undefined;

  if (catalogItemId) {
    // A catalog entry created moments ago (e.g. via the add-to-catalog
    // confirm flow, then immediately referenced here) can race Drive's own
    // read-after-write propagation delay for catalog.json — retry briefly
    // before treating it as genuinely missing.
    let catalogItem;
    for (let attempt = 0; attempt < 4 && !catalogItem; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 1000));
      const catalog = await getCatalog();
      catalogItem = catalog.find((c) => c.id === catalogItemId);
    }
    if (!catalogItem) throw new NotFound(`catalog item ${catalogItemId} not found`);
    namePt = namePt ?? catalogItem.name_pt;
    nameEn = nameEn ?? catalogItem.name_en;
    quantity = quantity ?? catalogItem.default_quantity;
    price = price ?? catalogItem.default_last_price;
  } else if (item.add_to_catalog) {
    const created = await addCatalogItem({
      id: item.new_catalog_item_id,
      name_pt: namePt,
      name_en: nameEn,
      default_quantity: quantity,
      default_last_price: price,
    });
    catalogItemId = created.id;
    catalogChange = created;
  }

  const newItem: ListItem = {
    id: item.id ?? crypto.randomUUID(),
    catalog_item_id: catalogItemId,
    name_pt: namePt,
    name_en: nameEn,
    quantity,
    price,
    done: false,
  };
  list.items.push(newItem);
  await writeJson(fileId, serializeList(list));
  return { list, catalogChange };
}

export async function updateItem(
  itemId: string,
  patch: ListItemUpdate,
): Promise<{ list: ShoppingList; catalogChange?: CatalogItem }> {
  const { fileId } = await getActiveListFile();
  const list = await readJson<ShoppingList>(fileId);

  const target = list.items.find((i) => i.id === itemId);
  if (!target) throw new NotFound(`item ${itemId} not found`);

  Object.assign(target, patch);

  let catalogChange: CatalogItem | undefined;
  if (patch.done === true && target.catalog_item_id) {
    const catalog = await getCatalog();
    const catalogItem = catalog.find((c) => c.id === target.catalog_item_id);
    if (catalogItem && catalogItem.default_last_price !== target.price) {
      catalogChange = await updateCatalogItem(target.catalog_item_id, { default_last_price: target.price });
    }
  }

  await writeJson(fileId, serializeList(list));
  return { list, catalogChange };
}

export async function deleteItem(itemId: string): Promise<ShoppingList> {
  const { fileId } = await getActiveListFile();
  const list = await readJson<ShoppingList>(fileId);
  list.items = list.items.filter((i) => i.id !== itemId);
  await writeJson(fileId, serializeList(list));
  return list;
}
