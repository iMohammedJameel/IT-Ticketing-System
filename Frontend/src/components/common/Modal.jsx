// Accessible modal — with focus trap, ESC to close, click-outside, ARIA roles
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export const Modal = ({
  open,
  onClose,
  title,
  children,
  size = "md",
  closeOnOverlayClick = true,
}) => {
  const modalRef = useRef(null);
  const previouslyFocused = useRef(null);

  const sizes = {
    sm: "400px",
    md: "600px",
    lg: "800px",
    xl: "1000px",
  };

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement;
    document.body.style.overflow = "hidden";

    // Focus the first focusable element
    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable?.length) focusable[0].focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        // Trap focus inside modal
        const items = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={closeOnOverlayClick ? onClose : undefined}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card, #fff)",
          borderRadius: "12px",
          maxWidth: sizes[size],
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        {title && (
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border, #e5e7eb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h2 id="modal-title" style={{ margin: 0, fontSize: "1.25rem" }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              style={{
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                padding: "4px 8px",
                color: "var(--text-muted, #6b7280)",
              }}
            >
              ×
            </button>
          </div>
        )}
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
