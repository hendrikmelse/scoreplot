import clsx from "clsx";
import { useEffect, useId, useRef, useState } from "react";
import type { SupportOption } from "@/config";

/** A window over the page listing the ways to support the app, closed with Escape or a tap outside */
export function SupportDialog({
  open,
  options,
  onClose: onClosed,
}: {
  open: boolean;
  options: SupportOption[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The option whose QR code is showing. Only one at a time, so that opening another closes it.
  const [qrOpenFor, setQrOpenFor] = useState<string | null>(null);

  // However it is closed (the button, Escape, a tap outside), it opens next time with no code showing
  function onClose() {
    setQrOpenFor(null);
    onClosed();
  }

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
        Scoreplot has no ads and is free to use, but it costs money to run! Thank you for supporting
        scoreplot.
      </p>
      <ul className="support-options">
        {options.map((option) => (
          <SupportOptionItem
            key={option.url}
            option={option}
            showingQr={qrOpenFor === option.url}
            onToggleQr={() => setQrOpenFor(qrOpenFor === option.url ? null : option.url)}
          />
        ))}
      </ul>
    </dialog>
  );
}

/** One way to support the app: a link out, and where it has one, a QR code that can be shown */
function SupportOptionItem({
  option,
  showingQr,
  onToggleQr,
}: {
  option: SupportOption;
  showingQr: boolean;
  onToggleQr: () => void;
}) {
  const qrId = useId();

  return (
    <li>
      {/* The button is beside the link, over its right end, as a button can't go inside a link */}
      <div className="support-option-row">
        <a
          className={clsx({ "has-qr": option.qrCode })}
          href={option.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="support-option-name">{option.name}</span>
          <span className="support-option-description">{option.description}</span>
        </a>
        {option.qrCode && (
          <button
            className="support-qr-toggle"
            aria-label={showingQr ? "Hide QR code" : "Show QR code"}
            title={showingQr ? "Hide QR code" : "Show QR code"}
            aria-expanded={showingQr}
            aria-controls={qrId}
            onClick={onToggleQr}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              qr_code_2
            </span>
          </button>
        )}
      </div>
      {option.qrCode && showingQr && (
        <figure id={qrId} className="support-qr">
          <img src={option.qrCode} alt={`QR code for ${option.name}`} />
          <figcaption>Scan with your phone's camera</figcaption>
        </figure>
      )}
    </li>
  );
}
