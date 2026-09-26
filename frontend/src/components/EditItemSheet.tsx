import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import type { ListItem, ListItemUpdate } from "../types";
import type { Lang } from "../i18n";

export function EditItemSheet({
  item,
  lang,
  onClose,
  onSave,
}: {
  item: ListItem;
  lang: Lang;
  onClose: () => void;
  onSave: (patch: ListItemUpdate) => Promise<void>;
}) {
  const [namePt, setNamePt] = useState(item.name_pt ?? "");
  const [nameEn, setNameEn] = useState(item.name_en ?? "");
  const [quantity, setQuantity] = useState(item.quantity ?? "");
  const [price, setPrice] = useState(item.price != null ? String(item.price) : "");

  async function save() {
    await onSave({
      name_pt: namePt.trim() || null,
      name_en: nameEn.trim() || null,
      quantity: quantity.trim() || null,
      price: price.trim() ? Number(price) : null,
    });
    onClose();
  }

  return (
    <BottomSheet title="Edit item" onClose={onClose}>
      <div className="field">
        <label>Name (Portuguese)</label>
        <input
          value={namePt}
          onChange={(e) => setNamePt(e.target.value)}
          autoFocus={lang === "pt"}
        />
      </div>
      <div className="field">
        <label>Name (English)</label>
        <input
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          autoFocus={lang === "en"}
        />
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
