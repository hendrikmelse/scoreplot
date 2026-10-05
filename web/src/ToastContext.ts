import { createContext, useContext } from "react";

export interface ToastOptions {
  message: string;
  /** The label of a button on the toast, like "Undo" */
  actionLabel?: string;
  /** Called when that button is pressed */
  onAction?: () => void;
  /** How long it stays before going away by itself */
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (value === null) throw new Error("useToast must be used inside a ToastProvider");
  return value;
}
