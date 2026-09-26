import { useRef, useState } from "react";
import type { ListItem } from "../types";

const SWIPE_THRESHOLD = 64;
const LONG_PRESS_MS = 500;

export function ItemRow({
  item,
  onToggle,
  onDelete,
  onEdit,
}: {
  item: ListItem;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggingRef = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    draggingRef.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!draggingRef.current) onEdit();
    }, LONG_PRESS_MS);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (startX.current == null) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 8) {
      draggingRef.current = true;
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }
    setDragX(Math.min(0, delta));
  }

  function onPointerUp() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (dragX < -SWIPE_THRESHOLD) {
      onDelete();
    }
    setDragX(0);
    startX.current = null;
  }

  return (
    <div
      className={`item-row${item.done ? " done" : ""}`}
      style={{ transform: `translateX(${dragX}px)`, transition: dragX === 0 ? "transform .15s" : "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <span className={`checkbox${item.done ? " checked" : ""}`}>{item.done ? "✓" : ""}</span>
      <button
        className="item-main"
        onClick={() => {
          if (!draggingRef.current) onToggle();
        }}
      >
        <div className="item-name">{item.name}</div>
        {(item.quantity || item.price != null) && (
          <div className="item-meta mono">
            {item.quantity && <span>{item.quantity}</span>}
            {item.price != null && <span>${item.price.toFixed(2)}</span>}
          </div>
        )}
      </button>
      <button className="edit-btn" onClick={onEdit} aria-label="Edit item">
        ✎
      </button>
    </div>
  );
}
