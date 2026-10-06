import "./ToastProvider.scss";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastContext, type ToastOptions } from "@/ToastContext";

interface ActiveToast extends ToastOptions {
  id: number;
  /** Falling away, to be removed once it has gone */
  leaving: boolean;
}

const MAX_TOASTS = 3;
const DEFAULT_DURATION_MS = 6000;
/** How long a toast takes to fall away, which the stylesheet's transition has to match */
const LEAVE_MS = 350;
/** How long a toast is fully there for, before it fades back to wait out the rest of its time */
const FRESH_MS = 2000;

/** Shows brief messages, some with a button (like Undo), over whatever page the app is on */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const nextId = useRef(0);

  // Toasts go by falling away first, and are removed from the list once they have
  const startLeaving = useCallback((id: number) => {
    setToasts((current) =>
      current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)),
    );
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts((current) => current.map((toast) => ({ ...toast, leaving: true })));
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    setToasts((current) => {
      const next = [...current, { ...options, id, leaving: false }];
      // When there are too many, the oldest ones fall away to make room
      let excess = next.filter((toast) => !toast.leaving).length - MAX_TOASTS;
      return next.map((toast) =>
        excess > 0 && !toast.leaving && excess-- > 0 ? { ...toast, leaving: true } : toast,
      );
    });
  }, []);

  const value = useMemo(() => ({ showToast, dismissAll }), [showToast, dismissAll]);

  return (
    <ToastContext value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <ToastView key={toast.id} toast={toast} onLeave={startLeaving} onRemove={remove} />
        ))}
      </div>
    </ToastContext>
  );
}

function ToastView({
  toast,
  onLeave,
  onRemove,
}: {
  toast: ActiveToast;
  onLeave: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  // While the pointer or the keyboard focus is on it, it stays, so that there is time to use it
  const [held, setHeld] = useState(false);
  // After a short while it fades and sinks, out of the way but still there to be used, until it goes.
  // That is only the once: after being held, it goes straight back to faded when let go of.
  const [faded, setFaded] = useState(false);
  // A touch can't hold a toast, as there is no leaving it, so it brings it back as new instead,
  // and the count is what starts its time over
  const [touches, setTouches] = useState(0);
  // Going away is a fall off the bottom of the screen, which has to finish before it is removed
  const { id, durationMs = DEFAULT_DURATION_MS, leaving } = toast;

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => onRemove(id), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [leaving, id, onRemove]);

  useEffect(() => {
    if (held || leaving) return;
    const timer = faded
      ? setTimeout(() => onLeave(id), Math.max(durationMs - FRESH_MS, 0))
      : setTimeout(() => setFaded(true), Math.min(FRESH_MS, durationMs));
    return () => clearTimeout(timer);
  }, [held, leaving, faded, touches, id, durationMs, onLeave]);

  return (
    <div className={clsx("toast-slot", { leaving })}>
      <div
        className={clsx("toast", { faded: faded && !held, leaving })}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          setFaded(false);
          setTouches((count) => count + 1);
        }}
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
              onLeave(id);
            }}
          >
            {toast.actionLabel}
          </button>
        )}
        <button className="toast-dismiss" aria-label="Dismiss" onClick={() => onLeave(id)}>
          <span className="material-symbols-outlined" aria-hidden="true">
            close
          </span>
        </button>
      </div>
    </div>
  );
}
