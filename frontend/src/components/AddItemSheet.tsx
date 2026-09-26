import { useMemo, useState } from "react";
import { BottomSheet } from "./BottomSheet";
import type { CatalogItem, ListItemCreate } from "../types";
import { displayName, secondaryName, type Lang } from "../i18n";

function matchesQuery(item: CatalogItem, q: string): boolean {
  return (item.name_pt ?? "").toLowerCase().includes(q) || (item.name_en ?? "").toLowerCase().includes(q);
}

export function AddItemSheet({
  catalog,
  lang,
  onClose,
  onAdd,
}: {
  catalog: CatalogItem[];
  lang: Lang;
  onClose: () => void;
  onAdd: (create: ListItemCreate) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [confirmName, setConfirmName] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return catalog.filter((c) => matchesQuery(c, q)).slice(0, 8);
  }, [query, catalog]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.find((c) => (c.name_pt ?? "").toLowerCase() === q || (c.name_en ?? "").toLowerCase() === q);
  }, [query, catalog]);

  async function pick(item: CatalogItem) {
    await onAdd({ catalog_item_id: item.id });
    onClose();
  }

  async function submitQuery() {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (exactMatch) {
      await pick(exactMatch);
      return;
    }
    setConfirmName(trimmed);
  }

  async function confirmAdd(addToCatalog: boolean) {
    if (!confirmName) return;
    await onAdd({
      name_pt: lang === "pt" ? confirmName : undefined,
      name_en: lang === "en" ? confirmName : undefined,
      add_to_catalog: addToCatalog,
    });
    onClose();
  }

  return (
    <BottomSheet title="Add item" onClose={onClose}>
      {confirmName ? (
        <div>
          <p>
            "{confirmName}" isn't in your catalog yet. Add it so it's easy to find next time?
          </p>
          <div className="sheet-actions">
            <button className="btn btn-secondary" onClick={() => confirmAdd(false)}>
              Just this once
            </button>
            <button className="btn btn-primary" onClick={() => confirmAdd(true)}>
              Add to catalog
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="field">
            <input
              autoFocus
              placeholder="Search in Portuguese or English…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitQuery();
              }}
            />
          </div>
          {matches.length > 0 && (
            <div className="suggestion-list">
              {matches.map((m) => {
                const secondary = secondaryName(m, lang);
                return (
                  <button key={m.id} className="suggestion-item" onClick={() => pick(m)}>
                    {displayName(m, lang)}
                    {secondary ? ` · ${secondary}` : ""}
                    {m.default_quantity ? ` · ${m.default_quantity}` : ""}
                  </button>
                );
              })}
            </div>
          )}
          <div className="sheet-actions">
            <button className="btn btn-primary" disabled={!query.trim()} onClick={submitQuery}>
              Add
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}
