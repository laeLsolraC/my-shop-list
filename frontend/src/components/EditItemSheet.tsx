import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import type { ListItem, ListItemUpdate } from "../types";

export function EditItemSheet({
  item,
  onClose,
  onSave,
}: {
  item: ListItem;
  onClose: () => void;
  onSave: (patch: ListItemUpdate) => Promise<void>;
}) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity ?? "");
  const [price, setPrice] = useState(item.price != null ? String(item.price) : "");

  async function save() {
    await onSave({
      name,
      quantity: quantity.trim() || null,
      price: price.trim() ? Number(price) : null,
    });
    onClose();
  }

  return (
    <BottomSheet title="Edit item" onClose={onClose}>
      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Quantity</label>
        <input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 1L, 2x" />
      </div>
      <div className="field">
        <label>Price</label>
        <input
          type="number"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
        />
      </div>
      <div className="sheet-actions">
        <button className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={save}>
          Save
        </button>
      </div>
    </BottomSheet>
  );
}
