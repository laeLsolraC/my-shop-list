export interface CatalogItem {
  id: string;
  name_pt: string | null;
  name_en: string | null;
  default_quantity: string | null;
  default_last_price: number | null;
  favorite: boolean;
}

export interface CatalogItemCreate {
  id?: string;
  name_pt?: string | null;
  name_en?: string | null;
  default_quantity?: string | null;
  default_last_price?: number | null;
}

export interface CatalogItemUpdate {
  name_pt?: string | null;
  name_en?: string | null;
  default_quantity?: string | null;
  default_last_price?: number | null;
  favorite?: boolean;
}

export interface ListItem {
  id: string;
  catalog_item_id: string | null;
  name_pt: string | null;
  name_en: string | null;
  quantity: string | null;
  price: number | null;
  done: boolean;
}

export interface ListItemCreate {
  id?: string;
  catalog_item_id?: string | null;
  name_pt?: string | null;
  name_en?: string | null;
  quantity?: string | null;
  price?: number | null;
  add_to_catalog?: boolean;
  /** Pre-generated id for the catalog entry, used to keep offline-optimistic and synced ids identical. */
  new_catalog_item_id?: string;
}

export interface ListItemUpdate {
  name_pt?: string | null;
  name_en?: string | null;
  quantity?: string | null;
  price?: number | null;
  done?: boolean;
}

export interface ShoppingList {
  id: string;
  created_at: string;
  items: ListItem[];
}

export interface ShoppingListSummary {
  id: string;
  created_at: string;
}
