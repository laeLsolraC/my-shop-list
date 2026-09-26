import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import type { CatalogItem, CatalogItemCreate, CatalogItemUpdate } from "../types";

export function CatalogItemSheet({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item?: CatalogItem;
  onClose: () => void;
  onSave: (data: CatalogItemCreate | CatalogItemUpdate) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [quantity, setQuantity] = useState(item?.default_quantity ?? "");
  const [price, setPrice] = useState(item?.default_last_price != null ? String(item.default_last_price) : "");

  async function save() {
    if (!name.trim()) return;
    await onSave({
      name: name.trim(),
      default_quantity: quantity.trim() || null,
      default_last_price: price.trim() ? Number(price) : null,
    });
    onClose();
  }

  return (
    <BottomSheet title={item ? "Edit catalog item" : "Add catalog item"} onClose={onClose}>
      <div className="field">
        <label>Name</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Default quantity</label>
        <input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 1L, 2x" />
      </div>
      <div className="field">
        <label>Last price</label>
        <input
          type="number"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
        />
      </div>
      <div className="sheet-actions">
        {item && onDelete && (
          <button
            className="btn btn-danger"
            onClick={async () => {
              await onDelete();
              onClose();
            }}
          >
            Delete
          </button>
        )}
        <button className="btn btn-primary" onClick={save}>
          Save
        </button>
      </div>
    </BottomSheet>
  );
}
