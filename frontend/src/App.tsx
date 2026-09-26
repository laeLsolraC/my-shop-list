import { useEffect, useRef, useState } from "react";
import { TabBar, type Tab } from "./components/TabBar";
import { ConnectScreen } from "./components/ConnectScreen";
import { ActiveListScreen } from "./components/ActiveListScreen";
import { CatalogScreen } from "./components/CatalogScreen";
import { HistoryScreen } from "./components/HistoryScreen";
import { HistoryDetailScreen } from "./components/HistoryDetailScreen";
import { ToastHost, showToast } from "./components/Toast";
import { handleCallback, isAuthenticated, logout } from "./auth/googleAuth";
import { attachOnlineListener } from "./offline/sync";
import * as repo from "./data/repo";
import type {
  CatalogItem,
  CatalogItemCreate,
  CatalogItemUpdate,
  ListItemCreate,
  ListItemUpdate,
  ShoppingList,
  ShoppingListSummary,
} from "./types";

type Status = "loading" | "connect" | "ready";

export default function App() {
  const [status, setStatus] = useState<Status>("loading");
  const [tab, setTab] = useState<Tab>("active");
  const [activeList, setActiveList] = useState<ShoppingList | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [history, setHistory] = useState<ShoppingListSummary[]>([]);
  const [historyDetail, setHistoryDetail] = useState<ShoppingList | null>(null);
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  async function loadAll() {
    const [list, cat, hist] = await Promise.all([repo.loadActiveList(), repo.loadCatalog(), repo.loadHistory()]);
    setActiveList(list);
    setCatalog(cat);
    setHistory(hist);
  }

  useEffect(() => {
    async function init() {
      const url = new URL(window.location.href);
      if (url.searchParams.has("code")) {
        try {
          await handleCallback(url.searchParams.get("code")!);
          window.history.replaceState({}, "", import.meta.env.BASE_URL);
        } catch {
          showToast("Sign-in failed — please try connecting again.");
          setStatus("connect");
          return;
        }
      }

      if (await isAuthenticated()) {
        try {
          await loadAll();
        } catch {
          /* offline with no cache yet — screens show empty states */
        }
        setStatus("ready");
      } else {
        setStatus("connect");
      }
    }
    init();

    attachOnlineListener((result) => {
      if (result.failed) {
        showToast("Some changes couldn't sync — check your connection.");
      } else if (result.flushed > 0) {
        loadAll();
      }
    });
  }, []);

  async function handleDisconnect() {
    await logout();
    setStatus("connect");
  }

  async function handleAddItem(create: ListItemCreate) {
    try {
      const result = await repo.addItemToActiveList(create);
      setActiveList(result);
      repo.loadCatalog().then(setCatalog);
    } catch {
      showToast("Couldn't add item — check your connection.");
    }
  }

  async function handleUpdateItem(itemId: string, patch: ListItemUpdate) {
    if (!activeList) return;
    const prev = activeList;
    setActiveList({ ...activeList, items: activeList.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) });
    try {
      const result = await repo.updateActiveListItem(itemId, patch);
      setActiveList(result);
      if (patch.done === true) repo.loadCatalog().then(setCatalog);
    } catch {
      setActiveList(prev);
      showToast("Couldn't save — check your connection.");
    }
  }

  function handleDeleteItem(itemId: string) {
    if (!activeList) return;
    const item = activeList.items.find((i) => i.id === itemId);
    if (!item) return;
    const prevList = activeList;
    setActiveList({ ...activeList, items: activeList.items.filter((i) => i.id !== itemId) });

    const timer = setTimeout(async () => {
      pendingDeletes.current.delete(itemId);
      try {
        const result = await repo.deleteActiveListItem(itemId);
        setActiveList(result);
      } catch {
        setActiveList(prevList);
        showToast("Couldn't remove — check your connection.");
      }
    }, 10000);
    pendingDeletes.current.set(itemId, timer);

    showToast(`Removed "${item.name}"`, {
      durationMs: 10000,
      actionLabel: "Undo",
      onAction: () => {
        const pending = pendingDeletes.current.get(itemId);
        if (pending) {
          clearTimeout(pending);
          pendingDeletes.current.delete(itemId);
        }
        setActiveList((cur) => (cur ? { ...cur, items: [...cur.items, item] } : cur));
      },
    });
  }

  async function handleCreateNewList() {
    try {
      const result = await repo.createNewActiveList();
      setActiveList(result);
      repo.loadHistory().then(setHistory);
    } catch {
      showToast("Couldn't create a new list — check your connection.");
    }
  }

  async function handleAddCatalogItem(data: CatalogItemCreate) {
    try {
      await repo.addCatalogItem(data);
      repo.loadCatalog().then(setCatalog);
    } catch {
      showToast("Couldn't add catalog item — check your connection.");
    }
  }

  async function handleUpdateCatalogItem(id: string, patch: CatalogItemUpdate) {
    try {
      await repo.updateCatalogItem(id, patch);
      repo.loadCatalog().then(setCatalog);
    } catch {
      showToast("Couldn't save — check your connection.");
    }
  }

  async function handleDeleteCatalogItem(id: string) {
    try {
      await repo.deleteCatalogItem(id);
      repo.loadCatalog().then(setCatalog);
    } catch {
      showToast("Couldn't delete — check your connection.");
    }
  }

  async function handleOpenHistory(listId: string) {
    try {
      const detail = await repo.loadListDetail(listId);
      setHistoryDetail(detail);
    } catch {
      showToast("Couldn't load that list — you need a connection to view history.");
    }
  }

  if (status === "loading") return null;
  if (status === "connect") return <ConnectScreen />;

  return (
    <div className="app">
      <header className="header">
        <h1>My Shop List</h1>
        <button className="icon-btn" onClick={handleDisconnect} aria-label="Disconnect from Google Drive">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </header>

      {tab === "active" && activeList && (
        <ActiveListScreen
          list={activeList}
          catalog={catalog}
          onAdd={handleAddItem}
          onUpdate={handleUpdateItem}
          onDelete={(id) => {
            handleDeleteItem(id);
            return Promise.resolve();
          }}
          onCreateNewList={handleCreateNewList}
        />
      )}

      {tab === "catalog" && (
        <CatalogScreen
          catalog={catalog}
          onAdd={handleAddCatalogItem}
          onUpdate={handleUpdateCatalogItem}
          onDelete={handleDeleteCatalogItem}
        />
      )}

      {tab === "history" &&
        (historyDetail ? (
          <HistoryDetailScreen list={historyDetail} onBack={() => setHistoryDetail(null)} />
        ) : (
          <HistoryScreen history={history} onOpen={handleOpenHistory} />
        ))}

      <TabBar
        tab={tab}
        onChange={(t) => {
          setHistoryDetail(null);
          setTab(t);
        }}
      />
      <ToastHost />
    </div>
  );
}
