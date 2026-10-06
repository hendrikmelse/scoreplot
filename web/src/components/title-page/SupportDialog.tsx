import { useEffect, useRef } from "react";
import type { SupportOption } from "@/config";

/** A window over the page listing the ways to support the app, closed with Escape or a tap outside */
export function SupportDialog({
  open,
  options,
  onClose,
}: {
  open: boolean;
  options: SupportOption[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="support-dialog"
      aria-labelledby="support-title"
      // Escape closes it by itself, which is told about here so that the page knows it is closed
      onClose={onClose}
      // A tap on the dimmed page behind lands on the dialog itself, rather than on what is inside it
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="support-header">
        <h2 id="support-title">Support Scoreplot</h2>
        <button className="support-close" aria-label="Close" title="Close" onClick={onClose}>
          <span className="material-symbols-outlined" aria-hidden="true">
            close
          </span>
        </button>
      </div>
      <p className="support-blurb">
        Scoreplot is free, with no ads. If you like it and would like to chip in, here are some ways
        to.
      </p>
      <ul className="support-options">
        {options.map((option) => (
          <li key={option.url}>
            <a href={option.url} target="_blank" rel="noopener noreferrer">
              <span className="support-option-name">{option.name}</span>
              <span className="support-option-description">{option.description}</span>
            </a>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
