/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// CommandPalette — ⌘K global search: tickets, KB articles, actions.
// Keyboard-first: ↑/↓ navigate, Enter opens, Esc closes. Debounced search.
// MOUNTED ONLY WHILE OPEN (parent renders it conditionally) so internal
// state resets naturally on every open — no reset effects needed.
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "../../hooks";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useI18n } from "../../i18n";
import { ticketService } from "../../services/ticketService";
import { kbService } from "../../services/kbService";
import { paletteShortcutLabel } from "../../utils/platform";
import { exportDashboardReport } from "../../utils/dashboardExport";
import { Spinner } from "./Spinner";

export function CommandPalette({ onClose }) {
  const { t } = useI18n();
  const { isAdmin, isStaff } = useAuth();
  const { toggleTheme } = useTheme();
  const { toggleLang } = useI18n();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 250);
  const [tickets, setTickets] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef(null);

  // Static actions (filtered by query client-side, role-aware)
  const actions = [
    { id: "new-ticket", icon: "fa-plus", label: t("tickets.newTicket"), run: () => navigate("/tickets") },
    { id: "tickets-list", icon: "fa-list", label: t("tickets.title"), run: () => navigate("/ticketslist") },
    { id: "kb", icon: "fa-book", label: t("nav.knowledgeBase"), run: () => navigate("/kb") },
    { id: "settings", icon: "fa-gear", label: t("nav.settings"), run: () => navigate("/settings") },
    { id: "notifications", icon: "fa-bell", label: t("nav.notifications"), run: () => navigate("/notifications") },
    ...(isStaff ? [{ id: "queue", icon: "fa-inbox", label: t("nav.queue"), run: () => navigate("/queue") }] : []),
    ...(isAdmin ? [{ id: "dashboard", icon: "fa-table-cells-large", label: t("nav.dashboard"), run: () => navigate("/dashboard") }] : []),
    ...(isAdmin ? [{ id: "users", icon: "fa-users", label: t("nav.users"), run: () => navigate("/users") }] : []),
    ...(isAdmin ? [{ id: "export-report", icon: "fa-file-csv", label: t("palette.exportReport"), run: () => exportDashboardReport() }] : []),
    { id: "theme", icon: "fa-circle-half-stroke", label: t("palette.toggleTheme"), run: toggleTheme },
    { id: "lang", icon: "fa-language", label: t("palette.toggleLang"), run: toggleLang },
  ];

  // Debounced remote search — tickets + KB. Results are only SET from the
  // async callback; short queries are hidden at RENDER time (derived).
  // (setLoading(true) fires synchronously as the fetch "starts" — that's the
  // documented pattern for kicking off async work from an effect.)
  const q = query.trim();
  const searchActive = q.length >= 2;

  useEffect(() => {
    if (!searchActive) return;
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      ticketService.list({ search: q, limit: 5 }),
      kbService.list({ search: q, limit: 4 }),
    ]).then(([tk, kb]) => {
      if (cancelled) return;
      setTickets(tk.status === "fulfilled" ? tk.value.data.tickets || [] : []);
      setArticles(kb.status === "fulfilled" ? kb.value.data.articles || [] : []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [debounced, searchActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autofocus on mount
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Build the flat, visible result list (order: actions → tickets → articles).
  // Tickets/articles only show while the search is long enough.
  const ql = q.toLowerCase();
  const filteredActions = ql
    ? actions.filter((a) => a.label.toLowerCase().includes(ql))
    : actions.slice(0, 5);

  const results = [
    ...filteredActions.map((a) => ({ kind: "action", ...a })),
    ...(searchActive ? tickets : []).map((tk) => ({
      kind: "ticket",
      id: tk._id,
      icon: "fa-ticket",
      label: `${tk.ticketNumber || ""} — ${tk.subject || tk.product || ""}`.trim(),
      hint: t(`status.${tk.status}`),
      run: () => navigate(`/tickets/${tk._id}`),
    })),
    ...(searchActive ? articles : []).map((a) => ({
      kind: "article",
      id: a._id,
      icon: "fa-book-open",
      label: a.title,
      hint: t("nav.knowledgeBase"),
      run: () => navigate("/kb"),
    })),
  ];

  const moveActive = useCallback(
    (delta) => setActiveIndex((i) => Math.min(Math.max(i + delta, 0), results.length - 1)),
    [results.length]
  );

  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); moveActive(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveActive(-1); }
    else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      results[activeIndex].run();
      onClose();
    }
  };

  let lastKind = null;

  return (
    <div className="palette-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label={t("palette.title")}>
        <input
          ref={inputRef}
          className="palette-input"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
          onKeyDown={onKeyDown}
          placeholder={`${t("palette.placeholder")}…  (${paletteShortcutLabel()})`}
          aria-label={t("palette.placeholder")}
        />
        <div className="palette-list" role="listbox">
          {loading && searchActive && (
            <div className="palette-empty"><Spinner size="sm" /></div>
          )}
          {!loading && results.length === 0 && (
            <div className="palette-empty">{searchActive ? t("palette.noResults") : t("palette.typeToSearch")}</div>
          )}
          {!loading && results.map((r, i) => {
            const header = r.kind !== lastKind ? t(`palette.${r.kind === "action" ? "actions" : r.kind === "ticket" ? "tickets" : "articles"}`) : null;
            lastKind = r.kind;
            return (
              <div key={`${r.kind}-${r.id}`}>
                {header && <div className="palette-section">{header}</div>}
                <button
                  className={`palette-item ${i === activeIndex ? "active" : ""}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => { r.run(); onClose(); }}
                  role="option"
                  aria-selected={i === activeIndex}
                >
                  <i className={`fa-solid ${r.icon}`} aria-hidden="true"></i>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                  {r.hint && <span className="palette-hint">{r.hint}</span>}
                </button>
              </div>
            );
          })}
        </div>
        {/* Keyboard hint row — kbd chips matching the app's theme variables.
            Same key labels as the navbar trigger chip (shared platform helper). */}
        <div className="palette-footer">
          <span className="hint">
            <kbd className="kbd" aria-hidden="true">↑</kbd>
            <kbd className="kbd" aria-hidden="true">↓</kbd>
            {t("palette.hints.navigate")}
          </span>
          <span className="hint">
            <kbd className="kbd" aria-hidden="true">Enter</kbd>
            {t("palette.hints.open")}
          </span>
          <span className="hint">
            <kbd className="kbd" aria-hidden="true">Esc</kbd>
            {t("palette.hints.close")}
          </span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;

