import "./ToastProvider.scss";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastContext, type ToastOptions } from "@/ToastContext";

interface ActiveToast extends ToastOptions {
  id: number;
}

const MAX_TOASTS = 3;
const DEFAULT_DURATION_MS = 8000;

/** Shows brief messages, some with a button (like Undo), over whatever page the app is on */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    // When there are too many, the oldest ones go
    setToasts((current) => [...current, { ...options, id }].slice(-MAX_TOASTS));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <ToastView key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext>
  );
}

function ToastView({ toast, onDismiss }: { toast: ActiveToast; onDismiss: (id: number) => void }) {
  // While the pointer or the keyboard focus is on it, it stays, so that there is time to use it
  const [held, setHeld] = useState(false);
  const { id, durationMs = DEFAULT_DURATION_MS } = toast;

  useEffect(() => {
    if (held) return;
    const timer = setTimeout(() => onDismiss(id), durationMs);
    return () => clearTimeout(timer);
  }, [held, id, durationMs, onDismiss]);

  return (
    <div
      className="toast"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHeld(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <span className="toast-message">{toast.message}</span>
      {toast.actionLabel && (
        <button
          className="toast-action"
          onClick={() => {
            toast.onAction?.();
            onDismiss(id);
          }}
        >
          {toast.actionLabel}
        </button>
      )}
      <button className="toast-dismiss" aria-label="Dismiss" onClick={() => onDismiss(id)}>
        <span className="material-symbols-outlined" aria-hidden="true">
          close
        </span>
      </button>
    </div>
  );
}
