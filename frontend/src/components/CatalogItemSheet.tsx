import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import type { CatalogItem, CatalogItemCreate, CatalogItemUpdate } from "../types";
import type { Lang } from "../i18n";

export function CatalogItemSheet({
  item,
  lang,
  onClose,
  onSave,
  onDelete,
}: {
  item?: CatalogItem;
  lang: Lang;
  onClose: () => void;
  onSave: (data: CatalogItemCreate | CatalogItemUpdate) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [namePt, setNamePt] = useState(item?.name_pt ?? "");
  const [nameEn, setNameEn] = useState(item?.name_en ?? "");
  const [quantity, setQuantity] = useState(item?.default_quantity ?? "");
  const [price, setPrice] = useState(item?.default_last_price != null ? String(item.default_last_price) : "");

  async function save() {
    if (!namePt.trim() && !nameEn.trim()) return;
    await onSave({
      name_pt: namePt.trim() || null,
      name_en: nameEn.trim() || null,
      default_quantity: quantity.trim() || null,
      default_last_price: price.trim() ? Number(price) : null,
    });
    onClose();
  }

  return (
    <BottomSheet title={item ? "Edit catalog item" : "Add catalog item"} onClose={onClose}>
      <div className="field">
        <label>Name (Portuguese)</label>
        <input autoFocus={lang === "pt"} value={namePt} onChange={(e) => setNamePt(e.target.value)} />
      </div>
      <div className="field">
        <label>Name (English)</label>
        <input autoFocus={lang === "en"} value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
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
