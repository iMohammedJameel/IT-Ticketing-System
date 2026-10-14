/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// TicketsList — orchestrator. Row clicks open the real detail PAGE
// (/tickets/:id) instead of the old cramped modal. Search is debounced,
// staff get queue views (mine / unassigned / at-risk), pagination has
// page numbers + page-size, and the table works with keyboard + mobile cards.
import { useState, useEffect, useCallback } from "react";
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
  const [filters, setFilters] = useState({
    view: "all", // all | mine | unassigned | at-risk (staff)
    status: "",
    priority: "",
    category: "",
    company: "",
    tag: "",
    search: searchParams.get("search") || "",
    page: 1,
    limit: 20,
  });

  // Debounce the raw search text — one API call per pause, not per keystroke
  const debouncedSearch = useDebounce(filters.search, 350);

  // Staff lists
  const [staffList, setStaffList] = useState([]);
  const [companies, setCompanies] = useState(FALLBACK_COMPANIES);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  usePageTitle(t("tickets.title"));

  // -------------------------------------------------------------------
  // Data fetching — view → queue filters, debounced search
  // -------------------------------------------------------------------
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: filters.page, limit: filters.limit };
      ["status", "priority", "category", "company", "tag"].forEach((k) => {
        if (filters[k]) params[k] = filters[k];
      });
      if (debouncedSearch) params.search = debouncedSearch;
      // Queue views
      if (isStaff && filters.view === "mine") params.assignedTo = "me";
      if (isStaff && filters.view === "unassigned") params.unassigned = true;
      if (isStaff && filters.view === "at-risk") params.slaAtRisk = true;

      const res = await ticketService.list(params);
      setTickets(res.data.tickets || []);
      setPagination(res.data.pagination || EMPTY_PAGINATION);
    } catch (err) {
      toast.error(err.message || t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [filters, debouncedSearch, isStaff, t]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Staff list for assignment dropdown (admins + agents)
  useEffect(() => {
    if (!isStaff) return;
    authService
      .getAllUsers({ role: "admin,agent", limit: 100, status: "active" })
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
    if (selectedIds.size === tickets.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(tickets.map((tk) => tk._id)));
  };

  const afterBulk = () => {
    setSelectedIds(new Set());
    fetchTickets();
  };

  const handleBulkStatus = async (status) => {
    if (selectedIds.size === 0) return;
    try {
      await ticketService.bulkStatus([...selectedIds], status);
      toast.success(`${selectedIds.size} ${t("common.selected")} → ${t(`status.${status}`)}`);
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
    if (!window.confirm(t("tickets.confirmBulkDelete", { a: selectedIds.size }))) return;
    try {
      await ticketService.bulkDelete([...selectedIds]);
      toast.success(`${selectedIds.size} ${t("tickets.deletedToast")}`);
      afterBulk();
    } catch (err) {
      toast.error(err.message || t("common.error"));
    }
  };

  const handleExportCsv = async () => {
    try {
      const blob = await ticketService.exportCsv({
        status: filters.status,
        priority: filters.priority,
        category: filters.category,
        company: filters.company,
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
            <span className="badge bg-secondary ms-2">{pagination.total}</span>
          </div>
          <div className="d-flex gap-2">
            {isAdmin && (
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
        />

        {/* Bulk actions (staff) */}
        {isStaff && (
          <BulkActionBar
            selectedCount={selectedIds.size}
            admins={staffList}
            onBulkStatus={handleBulkStatus}
            onBulkAssign={handleBulkAssign}
            onBulkDelete={handleBulkDelete}
            onCancel={() => setSelectedIds(new Set())}
            canDelete={isAdmin}
          />
        )}

        {/* Table — row click opens the ticket PAGE */}
        <TicketsTable
          tickets={tickets}
          loading={loading}
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
