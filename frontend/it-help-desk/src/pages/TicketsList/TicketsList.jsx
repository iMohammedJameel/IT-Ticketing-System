/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// TicketsList — orchestrator. Row clicks open the real detail PAGE
// (/tickets/:id) instead of the old cramped modal. Search is debounced,
// staff get queue views (mine / unassigned / at-risk), pagination has
// page numbers + page-size, and the table works with keyboard + mobile cards.
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { ticketService } from "../../services/ticketService";
import { authService } from "../../services/authService";
import { companyService } from "../../services/companyService";
import { useI18n } from "../../i18n";
import { usePageTitle, useDebounce } from "../../hooks";
import TicketsFilters from "./TicketsFilters";
import BulkActionBar from "./BulkActionBar";
import TicketsTable from "./TicketsTable";
import Pagination from "../../components/common/Pagination";
import Modal from "../../components/common/Modal";
import { FALLBACK_COMPANIES } from "./ticketConstants";
import styles from "./TicketsList.module.css";

const EMPTY_PAGINATION = { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false };

function TicketsList() {
  const { isAdmin, isStaff } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(true);
  // FIX(QA-rec-2): a failed fetch used to leave a SILENT empty table that
  // looked like "no tickets". Track it so the table can show a real error
  // state with a retry action instead.
  const [loadError, setLoadError] = useState(null);
  const [filters, setFilters] = useState({
    view: "all", // all | mine | unassigned | at-risk (staff)
    status: "",
    priority: "",
    category: "",
    company: "",
    tag: "",
    // ADD(QA-rec-4): date-range filter (createdAt between from..to)
    from: "",
    to: "",
    search: searchParams.get("search") || "",
    page: 1,
    limit: 20,
  });

  // Debounce the raw search text — one API call per pause, not per keystroke
  const debouncedSearch = useDebounce(filters.search, 350);
  // ADD(QA-rec-6): true while the user has typed but the debounce hasn't
  // fired yet — drives the little spinner in the search box so the app
  // visibly reacts to every keystroke instead of feeling frozen.
  const isSearching =
    filters.search.trim() !== debouncedSearch.trim();

  // Staff lists
  const [staffList, setStaffList] = useState([]);
  const [companies, setCompanies] = useState(FALLBACK_COMPANIES);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const abortRef = useRef(null);
  // FIX(QA-rec-1): bulk delete confirmation moved from the browser's
  // window.confirm (untranslated, blocks JS, no styling/RTL handling) to the
  // app's accessible Modal — focus trap, ESC, i18n and RTL all come free.
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // FIX(QA-fix-selection): selection is page-scoped — reset it whenever the
  // result set changes (page, filters, search). Before, IDs selected on
  // page 1 silently persisted onto page 2, where "select all" compared
  // sizes across DIFFERENT pages (misleading checked state + bulk ops
  // hitting invisible tickets).
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters.page, filters.limit, filters.status, filters.priority, filters.category, filters.company, filters.tag, filters.from, filters.to, debouncedSearch, filters.view]);

  usePageTitle(t("tickets.title"));

  // -------------------------------------------------------------------
  // Data fetching — view → queue filters, debounced search.
  // FIX(QA-fix-race): AbortController cancels stale requests when filters
  // change quickly — before, a slow page-1 response could overwrite the
  // newer page-2 response (out-of-order race).
  // -------------------------------------------------------------------
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    try {
      const params = { page: filters.page, limit: filters.limit };
      ["status", "priority", "category", "company", "tag"].forEach((k) => {
        if (filters[k]) params[k] = filters[k];
      });
      // Date range — from is inclusive, to gets +1 day so it includes the
      // whole selected day (input[type=date] sends midnight).
      if (filters.from) params.from = filters.from;
      if (filters.to) {
        const dayAfter = new Date(filters.to);
        dayAfter.setDate(dayAfter.getDate() + 1);
        params.to = dayAfter.toISOString().slice(0, 10);
      }
      if (debouncedSearch) params.search = debouncedSearch;
      // Queue views
      if (isStaff && filters.view === "mine") params.assignedTo = "me";
      if (isStaff && filters.view === "unassigned") params.unassigned = true;
      if (isStaff && filters.view === "at-risk") params.slaAtRisk = true;

      const res = await ticketService.list(params, { signal: controller.signal });
      setTickets(res.data.tickets || []);
      setPagination(res.data.pagination || EMPTY_PAGINATION);
    } catch (err) {
      // cancelled (AbortController) or aborted requests carry no message —
      // the interceptor marks them with { canceled: true } so they are silent
      if (!err.canceled && err.name !== "CanceledError" && err.name !== "AbortError") {
        toast.error(err.message || t("common.error"));
        setLoadError(err.message || t("tickets.loadError"));
      }
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [filters, debouncedSearch, isStaff, t]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Staff list for assignment dropdown (admins + agents)
  // FIX(QA-004..007): /auth/users is admin-only and 403'd for agents —
  // use the new minimal staff-directory endpoint allowed for both roles.
  useEffect(() => {
    if (!isStaff) return;
    authService
      .getStaffDirectory()
      .then((res) => setStaffList(res.data.users || []))
      .catch(() => {});
  }, [isStaff]);

  // Company directory (staff) — falls back to the static list for plain users
  useEffect(() => {
    if (!isStaff) return;
    companyService
      .list({ active: "true" })
      .then((res) => {
        const names = (res.data.companies || []).map((c) => c.name);
        if (names.length) setCompanies(names);
      })
      .catch(() => {});
  }, [isStaff]);

  // -------------------------------------------------------------------
  // Bulk actions (staff)
  // -------------------------------------------------------------------
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    // FIX(QA-fix-selection): decide by the rows on THIS page, not by set
    // size — same rationale as the header-checkbox fix in TicketsTable.
    const allOnPageSelected =
      tickets.length > 0 && tickets.every((tk) => selectedIds.has(tk._id));
    if (allOnPageSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(tickets.map((tk) => tk._id)));
  };

  const afterBulk = () => {
    setSelectedIds(new Set());
    fetchTickets();
  };

  // FIX(QA-fix-rtl): "→" was hardcoded — in Arabic RTL the arrow renders
  // pointing the wrong way. Use the i18n-aware separator from the dict.
  const handleBulkStatus = async (status) => {
    if (selectedIds.size === 0) return;
    try {
      await ticketService.bulkStatus([...selectedIds], status);
      toast.success(`${selectedIds.size} ${t("common.selected")} ${t("common.arrowSep")} ${t(`status.${status}`)}`);
      afterBulk();
    } catch (err) {
      toast.error(err.message || t("common.error"));
    }
  };

  const handleBulkAssign = async (userId) => {
    if (!userId || selectedIds.size === 0) return;
    try {
      await ticketService.bulkAssign([...selectedIds], userId);
      toast.success(`${selectedIds.size} ${t("tickets.assignedToast")}`);
      afterBulk();
    } catch (err) {
      toast.error(err.message || t("common.error"));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      await ticketService.bulkDelete([...selectedIds]);
      toast.success(`${selectedIds.size} ${t("tickets.deletedToast")}`);
      afterBulk();
    } catch (err) {
      toast.error(err.message || t("common.error"));
    } finally {
      setConfirmDeleteOpen(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const blob = await ticketService.exportCsv({
        status: filters.status,
        priority: filters.priority,
        category: filters.category,
        company: filters.company,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tickets-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("tickets.csvExported"));
    } catch (err) {
      toast.error(err.message || t("common.error"));
    }
  };

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------
  return (
    <section className="p-4">
      <div className="container-fluid">
        {/* Header */}
        <div className={`${styles.tabBar} d-flex justify-content-between align-items-center mb-4`}>
          <div className="d-flex align-items-center gap-2">
            <i className="fa-solid fa-list" aria-hidden="true"></i>
            <span className="fs-5 fw-semibold">{t("tickets.title")}</span>
            {/* QA-uiux (WCAG 1.4.3): bootstrap bg-secondary measured 3.5:1 —
                replaced with the theme-aware countBadge (6.5:1 light / 7:1 dark). */}
            <span className={`${styles.countBadge} ms-2`}>{pagination.total}</span>
          </div>
          <div className="d-flex gap-2">
            {/* ADD(QA-rec-3): CSV export opened up to AGENTS too — they see
                the exact same tickets in the UI, so exporting the same rows
                leaks nothing new. Destructive bulk-delete stays admin-only. */}
            {isStaff && (
              <button className="btn btn-outline-primary btn-sm" onClick={handleExportCsv}>
                <i className="fa-solid fa-download me-1" aria-hidden="true"></i>
                {t("common.exportCsv")}
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/tickets")}>
              <i className="fa-solid fa-plus me-1" aria-hidden="true"></i>
              {t("tickets.newTicket")}
            </button>
          </div>
        </div>

        {/* Filters + queue views */}
        <TicketsFilters
          filters={filters}
          setFilters={setFilters}
          onRefresh={fetchTickets}
          companies={companies}
          isStaff={isStaff}
          searching={isSearching}
        />

        {/* Bulk actions (staff) */}
        {isStaff && (
          <BulkActionBar
            selectedCount={selectedIds.size}
            admins={staffList}
            onBulkStatus={handleBulkStatus}
            onBulkAssign={handleBulkAssign}
            onBulkDelete={() => setConfirmDeleteOpen(true)}
            onCancel={() => setSelectedIds(new Set())}
            canDelete={isAdmin}
          />
        )}

        {/* Bulk-delete confirmation — accessible modal (FIX Qa-rec-1) */}
        {/* FIX(QA-grammar): Arabic plural rules — 1 => "تذكرة واحدة" (not "1 تذاكر"),
            2 => "تذكرتان", else "{n} تذاكر". English keeps its own {one/two/many} keys. */}
        <Modal
          open={confirmDeleteOpen}
          onClose={() => setConfirmDeleteOpen(false)}
          title={(() => {
            const n = selectedIds.size;
            if (n === 1) return t("tickets.deleteConfirmTitleOne");
            if (n === 2) return t("tickets.deleteConfirmTitleTwo");
            return t("tickets.deleteConfirmTitle", { a: n });
          })()}
          size="sm"
        >
          <p style={{ color: "var(--text-secondary)", margin: "0 0 20px" }}>
            {t("tickets.deleteConfirmBody")}
          </p>
          <div className="d-flex gap-2 justify-content-end">
            <button
              className="btn btn-outline-secondary"
              onClick={() => setConfirmDeleteOpen(false)}
            >
              {t("common.cancel")}
            </button>
            <button className="btn btn-danger" onClick={handleBulkDelete}>
              <i className="fa-solid fa-trash me-1" aria-hidden="true"></i>
              {t("tickets.deleteForever")}
            </button>
          </div>
        </Modal>

        {/* Table — row click opens the ticket PAGE */}
        <TicketsTable
          tickets={tickets}
          loading={loading}
          error={loadError}
          onRetry={fetchTickets}
          isStaff={isStaff}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onOpenTicket={(tk) => navigate(`/tickets/${tk._id}`)}
          onCreateClick={() => navigate("/tickets")}
        />

        {/* Advanced pagination */}
        {pagination.total > 0 && (
          <div className={styles.card}>
            <Pagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setFilters({ ...filters, page })}
              onLimitChange={(limit) => setFilters({ ...filters, limit, page: 1 })}
            />
          </div>
        )}
      </div>
    </section>
  );
}

export default TicketsList;
