import { useState } from "react";
import { ItemRow } from "./ItemRow";
import { AddItemSheet } from "./AddItemSheet";
import { EditItemSheet } from "./EditItemSheet";
import type { CatalogItem, ListItem, ListItemCreate, ListItemUpdate, ShoppingList } from "../types";
import type { Lang } from "../i18n";
import { useBackableClose } from "../nav";

export function ActiveListScreen({
  list,
  catalog,
  lang,
  onAdd,
  onUpdate,
  onDelete,
  onCreateNewList,
}: {
  list: ShoppingList;
  catalog: CatalogItem[];
  lang: Lang;
  onAdd: (create: ListItemCreate) => Promise<void>;
  onUpdate: (itemId: string, patch: ListItemUpdate) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onCreateNewList: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ListItem | null>(null);
  const closeAdd = useBackableClose(adding, () => setAdding(false));
  const closeEdit = useBackableClose(editing !== null, () => setEditing(null));

  const unchecked = list.items.filter((i) => !i.done);
  const checked = list.items.filter((i) => i.done);

  return (
    <div className="screen">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>
          {list.id}
        </span>
        <button className="edit-btn" onClick={onCreateNewList}>
          New list
        </button>
      </div>

      {list.items.length === 0 && <p className="empty-state">Nothing on your list yet. Tap + to add something.</p>}

      {unchecked.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          lang={lang}
          onToggle={() => onUpdate(item.id, { done: true })}
          onDelete={() => onDelete(item.id)}
          onEdit={() => setEditing(item)}
        />
      ))}

      {checked.length > 0 && (
        <>
          <div className="section-label">Done ({checked.length})</div>
          {checked.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              lang={lang}
              onToggle={() => onUpdate(item.id, { done: false })}
              onDelete={() => onDelete(item.id)}
              onEdit={() => setEditing(item)}
            />
          ))}
        </>
      )}

      <button className="fab" onClick={() => setAdding(true)} aria-label="Add item">
        +
      </button>

      {adding && (
        <AddItemSheet
          catalog={catalog}
          lang={lang}
          onClose={closeAdd}
          onAdd={(create) => onAdd(create)}
        />
      )}

      {editing && (
        <EditItemSheet
          item={editing}
          lang={lang}
          onClose={closeEdit}
          onSave={(patch) => onUpdate(editing.id, patch)}
        />
      )}
    </div>
  );
}
