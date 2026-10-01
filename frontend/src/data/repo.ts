import { getCache, setCache, enqueueMutation } from "../offline/db";
import * as listStore from "../drive/listStore";
import * as catalogStore from "../drive/catalogStore";
import { isOnline } from "../offline/sync";

/**
 * Only genuine network unreachability should fall back to the offline queue.
 * A logical error (e.g. NotFound from a stale/racy read) means we ARE
 * connected and something is actually wrong — that must surface as a real
 * error, not get silently absorbed into a queued mutation with missing data.
 * Browsers throw TypeError specifically when fetch() can't complete a
 * request at all (offline, DNS, connection refused); anything else is a
 * real HTTP response or application error.
 */
function isNetworkFailure(err: unknown): boolean {
  return err instanceof TypeError;
}
import type {
  CatalogItem,
  CatalogItemCreate,
  CatalogItemUpdate,
  ListItem,
  ListItemCreate,
  ListItemUpdate,
  ShoppingList,
  ShoppingListSummary,
} from "../types";

// --- reads (cache-first when offline, network-first + cache refresh when online) ---

export async function loadActiveList(): Promise<ShoppingList> {
  if (isOnline()) {
    try {
      const list = await listStore.getActiveList();
      await setCache("activeList", list);
      return list;
    } catch {
      /* fall through to cache */
    }
  }
  const cached = await getCache<ShoppingList>("activeList");
  if (cached) return cached;
  throw new Error("No cached active list available offline");
}

export async function loadCatalog(): Promise<CatalogItem[]> {
  if (isOnline()) {
    try {
      const catalog = await catalogStore.getCatalog();
      await setCache("catalog", catalog);
      return catalog;
    } catch {
      /* fall through to cache */
    }
  }
  return (await getCache<CatalogItem[]>("catalog")) ?? [];
}

export async function loadHistory(): Promise<ShoppingListSummary[]> {
  if (isOnline()) {
    try {
      const history = await listStore.getListHistory();
      await setCache("history", history);
      return history;
    } catch {
      /* fall through to cache */
    }
  }
  return (await getCache<ShoppingListSummary[]>("history")) ?? [];
}

export async function loadListDetail(listId: string): Promise<ShoppingList> {
  // History is read-only and only needs to work online, per agreed scope.
  return listStore.getList(listId);
}

// --- local (offline-safe) mutation mirrors of listStore's logic ---

function applyLocalAdd(
  list: ShoppingList,
  catalog: CatalogItem[],
  create: ListItemCreate,
): { list: ShoppingList; catalogChange?: CatalogItem } {
  let catalogItemId = create.catalog_item_id ?? null;
  let namePt = create.name_pt ?? null;
  let nameEn = create.name_en ?? null;
  let quantity = create.quantity ?? null;
  let price = create.price ?? null;
  let catalogChange: CatalogItem | undefined;

  if (catalogItemId) {
    const catalogItem = catalog.find((c) => c.id === catalogItemId);
    if (catalogItem) {
      namePt = namePt ?? catalogItem.name_pt;
      nameEn = nameEn ?? catalogItem.name_en;
      quantity = quantity ?? catalogItem.default_quantity;
      price = price ?? catalogItem.default_last_price;
    }
  } else if (create.add_to_catalog) {
    catalogChange = {
      id: create.new_catalog_item_id ?? crypto.randomUUID(),
      name_pt: namePt,
      name_en: nameEn,
      default_quantity: quantity,
      default_last_price: price,
      favorite: false,
    };
    catalogItemId = catalogChange.id;
  }

  const newItem: ListItem = {
    id: create.id ?? crypto.randomUUID(),
    catalog_item_id: catalogItemId,
    name_pt: namePt,
    name_en: nameEn,
    quantity,
    price,
    done: false,
  };
  return { list: { ...list, items: [...list.items, newItem] }, catalogChange };
}

function applyLocalUpdate(
  list: ShoppingList,
  catalog: CatalogItem[],
  itemId: string,
  patch: ListItemUpdate,
): { list: ShoppingList; catalogChange?: CatalogItem } {
  const items = list.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i));
  const target = items.find((i) => i.id === itemId);
  let catalogChange: CatalogItem | undefined;

  if (patch.done === true && target?.catalog_item_id) {
    const catalogItem = catalog.find((c) => c.id === target.catalog_item_id);
    if (catalogItem && catalogItem.default_last_price !== target.price) {
      catalogChange = { ...catalogItem, default_last_price: target.price };
    }
  }
  return { list: { ...list, items }, catalogChange };
}

// --- writes: try network when online, fall back to optimistic cache + queue when not ---

async function patchCatalogCache(catalogChange: CatalogItem, isNew: boolean): Promise<void> {
  const cachedCatalog = (await getCache<CatalogItem[]>("catalog")) ?? [];
  const next = isNew
    ? [...cachedCatalog, catalogChange]
    : cachedCatalog.map((c) => (c.id === catalogChange.id ? catalogChange : c));
  await setCache("catalog", next);
}

export async function addItemToActiveList(
  create: ListItemCreate,
): Promise<{ list: ShoppingList; catalogChange?: CatalogItem }> {
  const finalized: ListItemCreate = {
    ...create,
    id: create.id ?? crypto.randomUUID(),
    new_catalog_item_id:
      !create.catalog_item_id && create.add_to_catalog ? create.new_catalog_item_id ?? crypto.randomUUID() : undefined,
  };

  if (isOnline()) {
    try {
      const { list, catalogChange } = await listStore.addItem(finalized);
      await setCache("activeList", list);
      if (catalogChange) await patchCatalogCache(catalogChange, true);
      return { list, catalogChange };
    } catch (err) {
      if (!isNetworkFailure(err)) throw err;
      /* else fall through to offline path */
    }
  }

  const cachedList = (await getCache<ShoppingList>("activeList")) ?? {
    id: "pending",
    created_at: new Date().toISOString(),
    items: [],
  };
  const cachedCatalog = (await getCache<CatalogItem[]>("catalog")) ?? [];
  const { list, catalogChange } = applyLocalAdd(cachedList, cachedCatalog, finalized);
  await setCache("activeList", list);
  if (catalogChange) await setCache("catalog", [...cachedCatalog, catalogChange]);
  await enqueueMutation({ kind: "addItem", payload: finalized });
  return { list, catalogChange };
}

export async function updateActiveListItem(
  itemId: string,
  patch: ListItemUpdate,
): Promise<{ list: ShoppingList; catalogChange?: CatalogItem }> {
  if (isOnline()) {
    try {
      const { list, catalogChange } = await listStore.updateItem(itemId, patch);
      await setCache("activeList", list);
      if (catalogChange) await patchCatalogCache(catalogChange, false);
      return { list, catalogChange };
    } catch (err) {
      if (!isNetworkFailure(err)) throw err;
      /* else fall through to offline path */
    }
  }

  const cachedList = await getCache<ShoppingList>("activeList");
  if (!cachedList) throw new Error("No cached active list available offline");
  const cachedCatalog = (await getCache<CatalogItem[]>("catalog")) ?? [];
  const { list, catalogChange } = applyLocalUpdate(cachedList, cachedCatalog, itemId, patch);
  await setCache("activeList", list);
  if (catalogChange) {
    await setCache(
      "catalog",
      cachedCatalog.map((c) => (c.id === catalogChange.id ? catalogChange : c)),
    );
  }
  await enqueueMutation({ kind: "updateItem", itemId, payload: patch });
  return { list, catalogChange };
}

export async function deleteActiveListItem(itemId: string): Promise<ShoppingList> {
  if (isOnline()) {
    try {
      const list = await listStore.deleteItem(itemId);
      await setCache("activeList", list);
      return list;
    } catch (err) {
      if (!isNetworkFailure(err)) throw err;
      /* else fall through to offline path */
    }
  }

  const cachedList = await getCache<ShoppingList>("activeList");
  if (!cachedList) throw new Error("No cached active list available offline");
  const list = { ...cachedList, items: cachedList.items.filter((i) => i.id !== itemId) };
  await setCache("activeList", list);
  await enqueueMutation({ kind: "deleteItem", itemId });
  return list;
}

export async function createNewActiveList(): Promise<ShoppingList> {
  if (isOnline()) {
    try {
      const list = await listStore.createNewList();
      await setCache("activeList", list);
      return list;
    } catch (err) {
      if (!isNetworkFailure(err)) throw err;
      /* else fall through to offline path */
    }
  }

  const cachedList = await getCache<ShoppingList>("activeList");
  const carriedItems: ListItem[] = (cachedList?.items ?? [])
    .filter((i) => !i.done)
    .map((i) => ({ ...i, id: crypto.randomUUID() }));
  const list: ShoppingList = { id: "pending", created_at: new Date().toISOString(), items: carriedItems };
  await setCache("activeList", list);
  await enqueueMutation({ kind: "createNewList" });
  return list;
}

// --- catalog writes (require connectivity, per agreed scope) ---

export async function addCatalogItem(item: CatalogItemCreate): Promise<CatalogItem> {
  const created = await catalogStore.addCatalogItem(item);
  await patchCatalogCache(created, true);
  return created;
}

export async function updateCatalogItem(itemId: string, patch: CatalogItemUpdate): Promise<CatalogItem> {
  const updated = await catalogStore.updateCatalogItem(itemId, patch);
  await patchCatalogCache(updated, false);
  return updated;
}

export async function deleteCatalogItem(itemId: string): Promise<void> {
  await catalogStore.deleteCatalogItem(itemId);
  const cachedCatalog = (await getCache<CatalogItem[]>("catalog")) ?? [];
  await setCache(
    "catalog",
    cachedCatalog.filter((c) => c.id !== itemId),
  );
}
