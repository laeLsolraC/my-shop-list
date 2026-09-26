import { useEffect, useState } from "react";

interface ToastState {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs: number;
}

type Listener = (toast: ToastState) => void;
const listeners = new Set<Listener>();
let nextId = 1;

export function showToast(message: string, opts?: { actionLabel?: string; onAction?: () => void; durationMs?: number }) {
  const toast: ToastState = {
    id: nextId++,
    message,
    actionLabel: opts?.actionLabel,
    onAction: opts?.onAction,
    durationMs: opts?.durationMs ?? 4000,
  };
  listeners.forEach((l) => l(toast));
}

export function ToastHost() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const listener: Listener = (t) => setToast(t);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="toast" role="status">
      <span>{toast.message}</span>
      {toast.actionLabel && (
        <button
          onClick={() => {
            toast.onAction?.();
            setToast(null);
          }}
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  );
}
