import type { ShoppingList } from "../types";
import { formatPrice } from "../format";

export function HistoryDetailScreen({ list, onBack }: { list: ShoppingList; onBack: () => void }) {
  return (
    <div>
      <div className="detail-header">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          ←
        </button>
        <span className="mono">{list.id}</span>
      </div>
      <div className="screen">
        {list.items.length === 0 && <p className="empty-state">This list was empty.</p>}
        {list.items.map((item) => (
          <div key={item.id} className={`item-row${item.done ? " done" : ""}`}>
            <span className={`checkbox${item.done ? " checked" : ""}`}>{item.done ? "✓" : ""}</span>
            <div className="item-main">
              <div className="item-name">{item.name}</div>
              {(item.quantity || item.price != null) && (
                <div className="item-meta mono">
                  {item.quantity && <span>{item.quantity}</span>}
                  {item.price != null && <span>{formatPrice(item.price)}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
