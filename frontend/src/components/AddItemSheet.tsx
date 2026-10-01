import { useMemo, useState } from "react";
import { BottomSheet } from "./BottomSheet";
import type { CatalogItem, ListItemCreate } from "../types";
import { displayName, secondaryName, type Lang } from "../i18n";

function matchesQuery(item: CatalogItem, q: string): boolean {
  return (item.name_pt ?? "").toLowerCase().includes(q) || (item.name_en ?? "").toLowerCase().includes(q);
}

export function AddItemSheet({
  catalog,
  alreadyOnListIds,
  lang,
  onClose,
  onAdd,
}: {
  catalog: CatalogItem[];
  alreadyOnListIds: Set<string>;
  lang: Lang;
  onClose: () => void;
  onAdd: (create: ListItemCreate) => Promise<void>;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [confirmName, setConfirmName] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const pickable = useMemo(
    () => catalog.filter((c) => !alreadyOnListIds.has(c.id)),
    [catalog, alreadyOnListIds],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? pickable.filter((c) => matchesQuery(c, q)) : pickable;
    return [...filtered].sort((a, b) => displayName(a, lang).localeCompare(displayName(b, lang)));
  }, [pickable, query, lang]);

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addSelected() {
    setAdding(true);
    try {
      // Sequential, not concurrent: each add reads-modifies-writes the same
      // Drive file, so running them in parallel risks one overwriting another.
      for (const item of catalog.filter((c) => selected.has(c.id))) {
        await onAdd({ catalog_item_id: item.id });
      }
      onClose();
    } finally {
      setAdding(false);
    }
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

  if (confirmName) {
    return (
      <BottomSheet title="Add item" onClose={onClose}>
        <p>"{confirmName}" isn't in your catalog yet. Add it so it's easy to find next time?</p>
        <div className="sheet-actions">
          <button className="btn btn-secondary" onClick={() => confirmAdd(false)}>
            Just this once
          </button>
          <button className="btn btn-primary" onClick={() => confirmAdd(true)}>
            Add to catalog
          </button>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet title="Add items" onClose={onClose}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {searchOpen ? (
          <input
            autoFocus
            placeholder="Search in Portuguese or English…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1 }}
          />
        ) : (
          <button
            className="btn btn-secondary"
            style={{ flex: "none" }}
            onClick={() => setSearchOpen(true)}
          >
            🔍 Search
          </button>
        )}
        {searchOpen && (
          <button
            className="edit-btn"
            onClick={() => {
              setSearchOpen(false);
              setQuery("");
            }}
            aria-label="Close search"
          >
            ✕
          </button>
        )}
      </div>

      {visible.length === 0 && query.trim() && (
        <div style={{ marginBottom: 10 }}>
          <p className="empty-state" style={{ padding: "8px 0" }}>
            No catalog match for "{query.trim()}".
          </p>
          <button className="btn btn-primary" onClick={() => setConfirmName(query.trim())}>
            Add "{query.trim()}" as a new item
          </button>
        </div>
      )}

      <div className="suggestion-list" style={{ maxHeight: "50vh" }}>
        {visible.map((item) => {
          const secondary = secondaryName(item, lang);
          const checked = selected.has(item.id);
          return (
            <button
              key={item.id}
              className="suggestion-item"
              onClick={() => toggle(item.id)}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <span className={`checkbox${checked ? " checked" : ""}`} style={{ flex: "none" }}>
                {checked ? "✓" : ""}
              </span>
              <span>
                {displayName(item, lang)}
                {secondary ? ` · ${secondary}` : ""}
                {item.default_quantity ? ` · ${item.default_quantity}` : ""}
              </span>
            </button>
          );
        })}
      </div>

      <div className="sheet-actions">
        <button className="btn btn-primary" disabled={selected.size === 0 || adding} onClick={addSelected}>
          Add ({selected.size})
        </button>
      </div>
    </BottomSheet>
  );
}
