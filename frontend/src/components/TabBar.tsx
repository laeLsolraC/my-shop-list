export type Tab = "active" | "catalog" | "history";

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "active", label: "Active List", icon: "✓" },
    { id: "catalog", label: "Catalog", icon: "☰" },
    { id: "history", label: "History", icon: "⏱" },
  ];
  return (
    <nav className="tab-bar">
      {tabs.map((t) => (
        <button key={t.id} className={t.id === tab ? "active" : ""} onClick={() => onChange(t.id)}>
          <span className="tab-icon">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
