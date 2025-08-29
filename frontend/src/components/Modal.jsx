// src/components/Modal.jsx
import { useEffect } from "react";

export default function Modal({
  open = false,
  onClose = () => {},
  title = "",
  size = "md", // "sm" | "md"
  children,
  closeOnBackdrop = true,
}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget && closeOnBackdrop) onClose?.();
  }

  return (
    <div className="modal-backdrop" onMouseDown={handleBackdropClick}>
      <div
        className={`modal ${size === "sm" ? "modal-sm" : "modal-md"}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className="modal-header">
            <h3>{title}</h3>
            <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
          </div>
        ) : (
          <button className="modal-x floating" onClick={onClose} aria-label="Close">×</button>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
