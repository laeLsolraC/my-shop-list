import type { ShoppingList } from "../types";
import { formatPrice } from "../format";
import { displayName, secondaryName, type Lang } from "../i18n";

export function HistoryDetailScreen({ list, lang, onBack }: { list: ShoppingList; lang: Lang; onBack: () => void }) {
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
        {list.items.map((item) => {
          const secondary = secondaryName(item, lang);
          return (
            <div key={item.id} className={`item-row${item.done ? " done" : ""}`}>
              <span className={`checkbox${item.done ? " checked" : ""}`}>{item.done ? "✓" : ""}</span>
              <div className="item-main">
                <div className="item-name">{displayName(item, lang)}</div>
                {(secondary || item.quantity || item.price != null) && (
                  <div className="item-meta mono">
                    {secondary && <span>{secondary}</span>}
                    {item.quantity && <span>{item.quantity}</span>}
                    {item.price != null && <span>{formatPrice(item.price)}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
