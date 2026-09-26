import { useState } from "react";
import { CatalogItemSheet } from "./CatalogItemSheet";
import type { CatalogItem, CatalogItemCreate, CatalogItemUpdate } from "../types";
import { formatPrice } from "../format";
import { displayName, secondaryName, type Lang } from "../i18n";

export function CatalogScreen({
  catalog,
  lang,
  onAdd,
  onUpdate,
  onDelete,
}: {
  catalog: CatalogItem[];
  lang: Lang;
  onAdd: (data: CatalogItemCreate) => Promise<void>;
  onUpdate: (id: string, patch: CatalogItemUpdate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);

  return (
    <div className="screen">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Catalog</h2>
        <button className="edit-btn" onClick={() => setAdding(true)}>
          + Add
        </button>
      </div>

      {catalog.length === 0 && <p className="empty-state">No catalog items yet.</p>}

      {catalog.map((item) => {
        const secondary = secondaryName(item, lang);
        return (
          <div key={item.id} className="item-row" onClick={() => setEditing(item)} style={{ cursor: "pointer" }}>
            <div className="item-main">
              <div className="item-name">{displayName(item, lang)}</div>
              {(secondary || item.default_quantity || item.default_last_price != null) && (
                <div className="item-meta mono">
                  {secondary && <span>{secondary}</span>}
                  {item.default_quantity && <span>{item.default_quantity}</span>}
                  {item.default_last_price != null && <span>{formatPrice(item.default_last_price)}</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {adding && (
        <CatalogItemSheet
          lang={lang}
          onClose={() => setAdding(false)}
          onSave={(data) => onAdd(data as CatalogItemCreate)}
        />
      )}

      {editing && (
        <CatalogItemSheet
          item={editing}
          lang={lang}
          onClose={() => setEditing(null)}
          onSave={(data) => onUpdate(editing.id, data)}
          onDelete={() => onDelete(editing.id)}
        />
      )}
    </div>
  );
}
