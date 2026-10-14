/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Platform detection — ONE source of truth for OS-dependent shortcut labels,
// shared by the Navbar palette-trigger chip and the command palette itself.
// The key label must depend on the OPERATING SYSTEM (macOS ⌘ vs Ctrl
// elsewhere), never on the UI language — the old code showed "⌘K" in Arabic
// but "Ctrl K" in English for the exact same keyboard (fix-5, item A2).
export const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent || "");

/** "⌘ K" on macOS, "Ctrl K" everywhere else — language-neutral. */
export const paletteShortcutLabel = () => (isMac ? "⌘ K" : "Ctrl K");
