import type { ShoppingListSummary } from "../types";

export function HistoryScreen({
  history,
  onOpen,
}: {
  history: ShoppingListSummary[];
  onOpen: (listId: string) => void;
}) {
  return (
    <div className="screen">
      <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>History</h2>
      {history.length === 0 && <p className="empty-state">No past lists yet.</p>}
      {history.map((h) => (
        <div key={h.id} className="card history-item" onClick={() => onOpen(h.id)}>
          <span className="mono">{h.id}</span>
          <span>{new Date(h.created_at).toLocaleDateString()}</span>
        </div>
      ))}
    </div>
  );
}
