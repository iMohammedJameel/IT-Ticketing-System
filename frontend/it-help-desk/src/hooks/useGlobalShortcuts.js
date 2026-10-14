/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Global keyboard shortcuts — mounted once in the Dashboard shell.
// ⌘K / Ctrl+K / "/" opens the palette; "N" jumps to the create-ticket form.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const useGlobalShortcuts = (onOpenPalette, enabled = true) => {
  const navigate = useNavigate();
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      const inField = ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) || e.target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenPalette();
        return;
      }
      if (inField || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        onOpenPalette();
      } else if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        navigate("/tickets");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenPalette, enabled, navigate]);
};

export default useGlobalShortcuts;
