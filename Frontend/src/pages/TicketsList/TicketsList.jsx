// TicketsList — full rewrite using services, accessible Modal, bulk actions, CSV export,
// useSearchParams for deep links from notifications, status labels (not color-only),
// attachments display, audit history, sonner toasts.
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { ticketService } from "../../services/ticketService";
import { authService } from "../../services/authService";
import { Modal } from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { Skeleton } from "../../components/common/Skeleton";
import styles from "./TicketsList.module.css";

const STATUS_OPTIONS = [
  { value: "open", label: "Open", color: "#ef4444" },
  { value: "in-progress", label: "In Progress", color: "#f97316" },
  { value: "resolved", label: "Resolved", color: "#22c55e" },
  { value: "closed", label: "Closed", color: "#9ca3af" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "#22c55e" },
  { value: "medium", label: "Medium", color: "#f59e0b" },
  { value: "high", label: "High", color: "#f97316" },
  { value: "urgent", label: "Urgent", color: "#ef4444" },
];

const COMPANIES = [
  "Burger King", "McDonald's", "KFC", "Pizza Hut",
  "Subway", "Starbucks", "Domino's Pizza", "Other",
];

const CATEGORIES = ["hardware", "software", "network", "access", "other"];

const getStatusInfo = (status) =>
  STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];

const getPriorityInfo = (priority) =>
  PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[1];

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
};

function TicketsList() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    category: "",
    company: "",
    search: searchParams.get("search") || "",
    page: 1,
    limit: 20,
  });

  // Detail modal state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState("details"); // details | comments | history
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [admins, setAdmins] = useState([]);
  const [saving, setSaving] = useState(false);

  // Bulk action state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkBar, setShowBulkBar] = useState(false);

  // ---------------------------------------------------------------------
  // Fetch tickets — uses ticketService.list with new envelope
  // ---------------------------------------------------------------------
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: filters.page, limit: filters.limit };
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.category) params.category = filters.category;
      if (filters.company) params.company = filters.company;
      if (filters.search) params.search = filters.search;

      const res = await ticketService.list(params);
      setTickets(res.data.tickets || []);
      setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (err) {
      toast.error(err.message || "Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Fetch admin list for assignment dropdown
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const res = await authService.getAllUsers({ role: "admin" });
        setAdmins(res.data.users || []);
      } catch {
        // silent
      }
    })();
  }, [isAdmin]);

  // Deep link: if ?id= is in URL, fetch that ticket and open modal
  useEffect(() => {
    const focusId = searchParams.get("id");
    if (!focusId) return;
    (async () => {
      try {
        const res = await ticketService.getById(focusId);
        if (res.data.ticket) openTicketDetails(res.data.ticket);
      } catch {
        // silent — ticket may not be accessible
      } finally {
        // Clear the param so refresh doesn't re-open
        searchParams.delete("id");
        setSearchParams(searchParams, { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------
  // Ticket detail modal
  // ---------------------------------------------------------------------
  const openTicketDetails = async (ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setNewPriority(ticket.priority);
    setSelectedAdmin(ticket.assignedTo?._id || "");
    setNewComment("");
    setModalTab("details");
    setShowModal(true);
    await fetchComments(ticket._id);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTicket(null);
    setComments([]);
  };

  const fetchComments = async (ticketId) => {
    setLoadingComments(true);
    try {
      const res = await ticketService.getComments(ticketId);
      setComments(res.data.comments || []);
    } catch (err) {
      toast.error(err.message || "Failed to load comments");
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket) return;
    try {
      const res = await ticketService.addComment(selectedTicket._id, {
        text: newComment.trim(),
      });
      setComments((prev) => [...prev, res.data.comment]);
      setNewComment("");
      toast.success("Comment added");
    } catch (err) {
      toast.error(err.message || "Failed to add comment");
    }
  };

  const handleSaveChanges = async () => {
    if (!isAdmin || !selectedTicket) return;
    setSaving(true);
    try {
      // Update status if changed
      if (newStatus !== selectedTicket.status) {
        await ticketService.updateStatus(selectedTicket._id, { status: newStatus });
        toast.success(`Status changed to ${newStatus}`);
      }
      // Update priority if changed
      if (newPriority !== selectedTicket.priority) {
        await ticketService.updatePriority(selectedTicket._id, { priority: newPriority });
        toast.success(`Priority changed to ${newPriority}`);
      }
      // Assign if changed
      if (selectedAdmin !== (selectedTicket.assignedTo?._id || "")) {
        if (selectedAdmin) {
          await ticketService.assign(selectedTicket._id, { assignedTo: selectedAdmin });
          toast.success("Ticket assigned");
        }
      }
      closeModal();
      fetchTickets();
    } catch (err) {
      toast.error(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------
  // Bulk actions
  // ---------------------------------------------------------------------
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setShowBulkBar(next.size > 0);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === tickets.length) {
      setSelectedIds(new Set());
      setShowBulkBar(false);
    } else {
      setSelectedIds(new Set(tickets.map((t) => t._id)));
      setShowBulkBar(true);
    }
  };

  const handleBulkStatus = async (status) => {
    if (selectedIds.size === 0) return;
    try {
      await ticketService.bulkStatus([...selectedIds], status);
      toast.success(`${selectedIds.size} tickets updated`);
      setSelectedIds(new Set());
      setShowBulkBar(false);
      fetchTickets();
    } catch (err) {
      toast.error(err.message || "Bulk update failed");
    }
  };

  const handleBulkAssign = async (adminId) => {
    if (!adminId || selectedIds.size === 0) return;
    try {
      await ticketService.bulkAssign([...selectedIds], adminId);
      toast.success(`${selectedIds.size} tickets assigned`);
      setSelectedIds(new Set());
      setShowBulkBar(false);
      fetchTickets();
    } catch (err) {
      toast.error(err.message || "Bulk assign failed");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} tickets? This cannot be undone.`)) return;
    try {
      await ticketService.bulkDelete([...selectedIds]);
      toast.success(`${selectedIds.size} tickets deleted`);
      setSelectedIds(new Set());
      setShowBulkBar(false);
      fetchTickets();
    } catch (err) {
      toast.error(err.message || "Bulk delete failed");
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
      toast.success("CSV exported");
    } catch (err) {
      toast.error(err.message || "Export failed");
    }
  };

  const clearFilters = () => {
    setFilters({ ...filters, status: "", priority: "", category: "", company: "", search: "", page: 1 });
  };

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------
  return (
    <section className="p-4">
      <div className="container-fluid">
        {/* Header */}
        <div className={`${styles.tabBar} d-flex justify-content-between align-items-center mb-4`}>
          <div className="d-flex align-items-center gap-2">
            <i className="fa-solid fa-list" aria-hidden="true"></i>
            <span className="fs-5 fw-semibold">Tickets List</span>
            <span className="badge bg-secondary ms-2">{pagination.total}</span>
          </div>
          <div className="d-flex gap-2">
            {isAdmin && (
              <button className="btn btn-outline-primary btn-sm" onClick={handleExportCsv}>
                <i className="fa-solid fa-download me-1" aria-hidden="true"></i>
                Export CSV
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/tickets")}>
              <i className="fa-solid fa-plus me-1" aria-hidden="true"></i>
              New Ticket
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="d-flex gap-2 mb-3 flex-wrap">
          <input
            type="search"
            className="form-control"
            style={{ maxWidth: "240px" }}
            placeholder="Search tickets..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            aria-label="Search tickets"
          />
          <select
            className="form-select w-auto"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            className="form-select w-auto"
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value, page: 1 })}
            aria-label="Filter by priority"
          >
            <option value="">All Priorities</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select
            className="form-select w-auto"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <select
            className="form-select w-auto"
            value={filters.company}
            onChange={(e) => setFilters({ ...filters, company: e.target.value, page: 1 })}
            aria-label="Filter by company"
          >
            <option value="">All Companies</option>
            {COMPANIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>
            Clear
          </button>
          <button className="btn btn-outline-primary btn-sm" onClick={fetchTickets}>
            <i className="fa-solid fa-rotate-right" aria-hidden="true"></i> Refresh
          </button>
        </div>

        {/* Bulk action bar */}
        {showBulkBar && isAdmin && (
          <div className={styles.bulkBar}>
            <span><strong>{selectedIds.size}</strong> selected</span>
            <select
              className="form-select form-select-sm w-auto"
              onChange={(e) => { if (e.target.value) handleBulkStatus(e.target.value); e.target.value = ""; }}
              defaultValue=""
              aria-label="Bulk status"
            >
              <option value="">Change status...</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <select
              className="form-select form-select-sm w-auto"
              onChange={(e) => { if (e.target.value) handleBulkAssign(e.target.value); e.target.value = ""; }}
              defaultValue=""
              aria-label="Bulk assign"
            >
              <option value="">Assign to...</option>
              {admins.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <button className="btn btn-sm btn-danger" onClick={handleBulkDelete}>
              <i className="fa-solid fa-trash me-1" aria-hidden="true"></i>
              Delete
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => { setSelectedIds(new Set()); setShowBulkBar(false); }}>
              Cancel
            </button>
          </div>
        )}

        {/* Table */}
        <div className={styles.card}>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  {isAdmin && (
                    <th style={{ width: "40px" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.size === tickets.length && tickets.length > 0}
                        onChange={toggleSelectAll}
                        aria-label="Select all tickets"
                      />
                    </th>
                  )}
                  <th>Ticket #</th>
                  <th>Created By</th>
                  <th>Product</th>
                  <th>Company</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>SLA</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={isAdmin ? 10 : 9}>
                        <Skeleton height="1.5rem" />
                      </td>
                    </tr>
                  ))
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 10 : 9}>
                      <EmptyState
                        icon="🎫"
                        title="No tickets found"
                        description="Try adjusting your filters or create a new ticket."
                        action={
                          <button className="btn btn-primary btn-sm" onClick={() => navigate("/tickets")}>
                            Create Ticket
                          </button>
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => {
                    const statusInfo = getStatusInfo(ticket.status);
                    const priorityInfo = getPriorityInfo(ticket.priority);
                    const isSelected = selectedIds.has(ticket._id);
                    const slaOverdue = ticket.slaDueDate && new Date(ticket.slaDueDate) < new Date() && ticket.status !== "resolved" && ticket.status !== "closed";
                    return (
                      <tr
                        key={ticket._id}
                        onClick={() => openTicketDetails(ticket)}
                        style={{ cursor: "pointer" }}
                        className={isSelected ? styles.selectedRow : ""}
                      >
                        {isAdmin && (
                          <td onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(ticket._id)}
                              aria-label={`Select ticket ${ticket.ticketNumber}`}
                            />
                          </td>
                        )}
                        <td className="fw-semibold">{ticket.ticketNumber || `#${ticket._id.slice(-5)}`}</td>
                        <td>{ticket.user?.name || ticket.employee || "—"}</td>
                        <td>{ticket.product}</td>
                        <td>{ticket.company}</td>
                        <td>
                          <span className={styles.categoryBadge}>{ticket.category}</span>
                        </td>
                        <td>
                          <span
                            className={styles.priorityBadge}
                            style={{
                              backgroundColor: priorityInfo.color,
                              opacity: 0.15,
                              color: priorityInfo.color,
                            }}
                          >
                            {priorityInfo.label}
                          </span>
                        </td>
                        <td>
                          <span className={styles.statusBadge} style={{ backgroundColor: statusInfo.color }}>
                            <span className="visually-hidden">{statusInfo.label}</span>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td>
                          {ticket.slaDueDate ? (
                            <span className={slaOverdue ? styles.slaOverdue : styles.slaOk}>
                              <i className="fa-solid fa-clock me-1" aria-hidden="true"></i>
                              {slaOverdue ? "Overdue" : "On track"}
                            </span>
                          ) : "—"}
                          {ticket.slaBreached && (
                            <span className={styles.slaBreachedBadge} title="SLA breached">⚠</span>
                          )}
                        </td>
                        <td>{formatDate(ticket.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className={`d-flex justify-content-between align-items-center p-3 ${styles.pagination}`}>
              <span className="text-muted" style={{ fontSize: "0.85rem" }}>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={!pagination.hasPrev}
                  onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                >
                  ← Previous
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={!pagination.hasNext}
                  onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ticket detail modal — uses accessible Modal component */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={selectedTicket ? `Ticket ${selectedTicket.ticketNumber}` : ""}
        size="lg"
      >
        {selectedTicket && (
          <div>
            {/* Tabs */}
            <ul className="nav nav-tabs mb-3" role="tablist">
              <li className="nav-item">
                <button
                  className={`nav-link ${modalTab === "details" ? "active" : ""}`}
                  onClick={() => setModalTab("details")}
                  role="tab"
                  aria-selected={modalTab === "details"}
                >
                  Details
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${modalTab === "comments" ? "active" : ""}`}
                  onClick={() => setModalTab("comments")}
                  role="tab"
                  aria-selected={modalTab === "comments"}
                >
                  Comments {comments.length > 0 && `(${comments.length})`}
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${modalTab === "history" ? "active" : ""}`}
                  onClick={() => setModalTab("history")}
                  role="tab"
                  aria-selected={modalTab === "history"}
                >
                  History
                </button>
              </li>
              {selectedTicket.attachments?.length > 0 && (
                <li className="nav-item">
                  <button
                    className={`nav-link ${modalTab === "attachments" ? "active" : ""}`}
                    onClick={() => setModalTab("attachments")}
                    role="tab"
                    aria-selected={modalTab === "attachments"}
                  >
                    Attachments ({selectedTicket.attachments.length})
                  </button>
                </li>
              )}
            </ul>

            {/* Details Tab */}
            {modalTab === "details" && (
              <div>
                <div className="row mb-3">
                  <div className="col-12 col-md-6">
                    <p><strong>Created By:</strong> {selectedTicket.user?.name || "Unknown"}</p>
                    <p><strong>Product:</strong> {selectedTicket.product}</p>
                    <p><strong>Company:</strong> {selectedTicket.company}</p>
                    <p><strong>Category:</strong> {selectedTicket.category}</p>
                    <p><strong>Assigned To:</strong> {selectedTicket.assignedTo?.name || "Not Assigned"}</p>
                    {selectedTicket.resolvedBy && (
                      <p><strong>Resolved By:</strong> {selectedTicket.resolvedBy?.name}</p>
                    )}
                  </div>
                  <div className="col-12 col-md-6">
                    <p><strong>Created:</strong> {formatDateTime(selectedTicket.createdAt)}</p>
                    <p><strong>SLA Due:</strong> {formatDateTime(selectedTicket.slaDueDate)}</p>
                    {selectedTicket.endDate && (
                      <p><strong>Resolved:</strong> {formatDateTime(selectedTicket.endDate)}</p>
                    )}
                    <p>
                      <strong>Priority:</strong>{" "}
                      <span style={{ color: getPriorityInfo(selectedTicket.priority).color, fontWeight: 600 }}>
                        {getPriorityInfo(selectedTicket.priority).label}
                      </span>
                    </p>
                    <p>
                      <strong>Status:</strong>{" "}
                      <span style={{ color: getStatusInfo(selectedTicket.status).color, fontWeight: 600 }}>
                        {getStatusInfo(selectedTicket.status).label}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="mb-3">
                  <strong>Description:</strong>
                  <p className="text-muted mt-1" style={{ whiteSpace: "pre-wrap" }}>
                    {selectedTicket.description}
                  </p>
                </div>

                {/* Admin controls */}
                {isAdmin && (
                  <div className={styles.adminControls}>
                    <h6 className="fw-semibold mb-3">Admin Controls</h6>
                    <div className="row g-2">
                      <div className="col-12 col-md-4">
                        <label htmlFor="modal-status" className="form-label">Status</label>
                        <select
                          id="modal-status"
                          className="form-select"
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 col-md-4">
                        <label htmlFor="modal-priority" className="form-label">Priority</label>
                        <select
                          id="modal-priority"
                          className="form-select"
                          value={newPriority}
                          onChange={(e) => setNewPriority(e.target.value)}
                        >
                          {PRIORITY_OPTIONS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 col-md-4">
                        <label htmlFor="modal-assign" className="form-label">Assign To</label>
                        <select
                          id="modal-assign"
                          className="form-select"
                          value={selectedAdmin}
                          onChange={(e) => setSelectedAdmin(e.target.value)}
                        >
                          <option value="">Not Assigned</option>
                          {admins.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Comments Tab */}
            {modalTab === "comments" && (
              <div>
                <div className={styles.commentsList}>
                  {loadingComments ? (
                    <div className="text-center py-3">
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Loading comments...</span>
                      </div>
                    </div>
                  ) : comments.length === 0 ? (
                    <EmptyState icon="💬" title="No comments yet" description="Start the conversation." />
                  ) : (
                    comments.map((comment) => (
                      <div key={comment._id} className={styles.commentItem}>
                        <div className={styles.commentAvatar}>
                          {comment.user?.profileImage ? (
                            <img src={comment.user.profileImage} alt="" />
                          ) : (
                            (comment.user?.name || "?").charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className={styles.commentContent}>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <strong className={styles.commentAuthor}>{comment.user?.name || "Unknown"}</strong>
                            {comment.user?.role === "admin" && (
                              <span className={styles.adminBadge}>Admin</span>
                            )}
                            <span className={styles.commentTime}>{formatDateTime(comment.createdAt)}</span>
                            {comment.editedAt && <small className="text-muted">(edited)</small>}
                          </div>
                          <p className={styles.commentText}>{comment.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className={styles.commentInput}>
                  <textarea
                    className="form-control mb-2"
                    rows="2"
                    placeholder="Write a comment... (Enter to send, Shift+Enter for new line)"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                  >
                    <i className="fa-solid fa-paper-plane me-1" aria-hidden="true"></i>
                    Send
                  </button>
                </div>
              </div>
            )}

            {/* History Tab */}
            {modalTab === "history" && (
              <div className={styles.historyList}>
                {(selectedTicket.history || []).length === 0 ? (
                  <EmptyState icon="📜" title="No history" description="Activity log will appear here." />
                ) : (
                  (selectedTicket.history || []).slice().reverse().map((h, idx) => (
                    <div key={idx} className={styles.historyItem}>
                      <div className={styles.historyDot}></div>
                      <div>
                        <strong>{h.by?.name || "System"}</strong>{" "}
                        <span className="text-muted">{h.action.replace(/_/g, " ")}</span>
                        {h.field && <span> on <strong>{h.field}</strong></span>}
                        {h.oldValue && <span> from <code>{String(h.oldValue)}</code></span>}
                        {h.newValue && <span> to <code>{String(h.newValue)}</code></span>}
                        {h.note && <div className="text-muted small">{h.note}</div>}
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                          {formatDateTime(h.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Attachments Tab */}
            {modalTab === "attachments" && (
              <div className={styles.attachmentsList}>
                {(selectedTicket.attachments || []).map((att, idx) => (
                  <div key={idx} className={styles.attachmentItem}>
                    <i className="fa-solid fa-file me-2" aria-hidden="true"></i>
                    <a
                      href={att.url}
                      download={att.filename}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.attachmentLink}
                    >
                      {att.filename}
                    </a>
                    <span className="text-muted ms-2" style={{ fontSize: "0.75rem" }}>
                      ({(att.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Modal actions */}
            <div className="d-flex gap-2 justify-content-end mt-4 pt-3 border-top">
              <button className="btn btn-outline-secondary" onClick={closeModal}>
                Close
              </button>
              {isAdmin && (
                <button
                  className="btn btn-primary"
                  onClick={handleSaveChanges}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

export default TicketsList;
