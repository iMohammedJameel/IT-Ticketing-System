// Create Ticket page — uses ticketService, new schema (priority/category), file attachments,
// loading state, accessible form, sonner toasts. Uses useAuth() instead of localStorage.
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { ticketService } from "../../services/ticketService";
import Spinner from "../../components/common/Spinner";
import styles from "./Tickets.module.css";

const PRODUCTS = [
  "E-Invoice", "E-Receipt", "POS System", "Accounting Software",
  "Inventory Management", "CRM System", "Other",
];

const COMPANIES = [
  "Burger King", "McDonald's", "KFC", "Pizza Hut",
  "Subway", "Starbucks", "Domino's Pizza", "Other",
];

const CATEGORIES = ["hardware", "software", "network", "access", "other"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

const PRIORITY_COLORS = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f97316",
  urgent: "#ef4444",
};

function Tickets() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    product: "",
    company: "",
    category: "other",
    priority: "medium",
    description: "",
  });
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    // Validate file size (10 MB max per file, matching backend limit)
    const valid = files.filter((f) => {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name} is too large (max 10 MB)`);
        return false;
      }
      return true;
    });
    setAttachments((prev) => [...prev, ...valid]);
  };

  const removeAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const { product, company, description } = form;
    if (!product || !company || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (description.trim().length < 5) {
      toast.error("Description must be at least 5 characters");
      return;
    }

    setLoading(true);
    try {
      // Create the ticket
      const res = await ticketService.create({
        ...form,
        startDate: new Date().toISOString(),
      });
      const ticket = res.data.ticket;

      // Upload attachments if any
      if (attachments.length > 0) {
        toast.info(`Uploading ${attachments.length} attachment(s)...`);
        let uploaded = 0;
        for (const file of attachments) {
          try {
            await ticketService.uploadAttachment(ticket._id, file);
            uploaded++;
          } catch (err) {
            toast.error(`Failed to upload ${file.name}: ${err.message}`);
          }
        }
        if (uploaded > 0) toast.success(`${uploaded} attachment(s) uploaded`);
      }

      toast.success(`Ticket ${ticket.ticketNumber} created successfully!`);
      setForm({
        product: "",
        company: "",
        category: "other",
        priority: "medium",
        description: "",
      });
      setAttachments([]);
    } catch (err) {
      toast.error(err.message || "Failed to create ticket");
      if (err.details) {
        err.details.forEach((d) => toast.error(d.message || d));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
      product: "",
      company: "",
      category: "other",
      priority: "medium",
      description: "",
    });
    setAttachments([]);
  };

  return (
    <section className="p-4">
      <div className="container-fluid">
        <div className={styles.tabBar}>
          <div className="d-flex align-items-center gap-2">
            <i className="fa-solid fa-ticket" aria-hidden="true"></i>
            <span>Create New Ticket</span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Ticket Information</div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-0">
              <div className="col-12 col-lg-6">
                {/* Product */}
                <div className={styles.formRow}>
                  <label htmlFor="product" className={styles.formLabel}>
                    Product <span className="text-danger">*</span>
                  </label>
                  <select
                    id="product"
                    className="form-select"
                    name="product"
                    value={form.product}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  >
                    <option value="">Select Product</option>
                    {PRODUCTS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Company */}
                <div className={styles.formRow}>
                  <label htmlFor="company" className={styles.formLabel}>
                    Company <span className="text-danger">*</span>
                  </label>
                  <select
                    id="company"
                    className="form-select"
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  >
                    <option value="">Select Company</option>
                    {COMPANIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div className={styles.formRow}>
                  <label htmlFor="category" className={styles.formLabel}>
                    Category
                  </label>
                  <select
                    id="category"
                    className="form-select"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div className={styles.formRow}>
                  <label htmlFor="priority" className={styles.formLabel}>
                    Priority
                  </label>
                  <div className="d-flex gap-2 flex-wrap">
                    {PRIORITIES.map((p) => (
                      <button
                        type="button"
                        key={p}
                        className={`${styles.priorityBtn} ${form.priority === p ? styles.priorityActive : ""}`}
                        onClick={() => setForm({ ...form, priority: p })}
                        disabled={loading}
                        style={{
                          borderColor: form.priority === p ? PRIORITY_COLORS[p] : undefined,
                          background: form.priority === p ? PRIORITY_COLORS[p] : undefined,
                        }}
                        aria-pressed={form.priority === p}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Employee (read-only, derived from auth) */}
                <div className={styles.formRow}>
                  <label htmlFor="employee" className={styles.formLabel}>
                    Employee
                  </label>
                  <input
                    id="employee"
                    type="text"
                    className="form-control"
                    value={user?.name || ""}
                    disabled
                    aria-describedby="employeeHelp"
                  />
                  <small id="employeeHelp" className="text-muted" style={{ fontSize: "0.75rem" }}>
                    Auto-filled from your account
                  </small>
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <div style={{ padding: "1.25rem 2rem", height: "100%", display: "flex", flexDirection: "column" }}>
                  <label htmlFor="description" className="form-label fw-bold" style={{ color: "var(--text-dark)" }}>
                    Problem Description <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="description"
                    className="form-control flex-grow-1"
                    rows="9"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe the issue in detail..."
                    style={{ resize: "none" }}
                    required
                    disabled={loading}
                    minLength={5}
                    maxLength={5000}
                  />
                  <small className="text-muted mt-1" style={{ fontSize: "0.75rem" }}>
                    {form.description.length}/5000 characters
                  </small>
                </div>
              </div>
            </div>

            {/* Attachments */}
            <div className={styles.attachmentSection}>
              <label htmlFor="attachments" className={styles.formLabel}>
                <i className="fa-solid fa-paperclip me-1" aria-hidden="true"></i>
                Attachments
              </label>
              <input
                id="attachments"
                type="file"
                multiple
                onChange={handleFileChange}
                disabled={loading}
                accept="image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip"
                className="form-control"
              />
              <small className="text-muted d-block mt-1" style={{ fontSize: "0.75rem" }}>
                Max 10 MB per file. Allowed: images, PDF, TXT, CSV, DOC/DOCX, XLS/XLSX, ZIP
              </small>

              {attachments.length > 0 && (
                <ul className={styles.attachmentList}>
                  {attachments.map((file, idx) => (
                    <li key={idx} className={styles.attachmentItem}>
                      <span className={styles.attachmentIcon}>
                        <i className="fa-solid fa-file" aria-hidden="true"></i>
                      </span>
                      <span className={styles.attachmentName}>{file.name}</span>
                      <span className={styles.attachmentSize}>
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                      <button
                        type="button"
                        className={styles.attachmentRemove}
                        onClick={() => removeAttachment(idx)}
                        aria-label={`Remove ${file.name}`}
                        disabled={loading}
                      >
                        <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* SLA info notice */}
            <div className={styles.slaNotice}>
              <i className="fa-solid fa-clock me-2" aria-hidden="true"></i>
              <span>
                SLA deadline will be set based on priority:{" "}
                <strong style={{ color: PRIORITY_COLORS[form.priority] }}>
                  {form.priority.toUpperCase()}
                </strong>{" "}
                ({ { low: "72h", medium: "48h", high: "24h", urgent: "4h" }[form.priority] })
              </span>
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.btnClose}
                onClick={handleReset}
                disabled={loading}
              >
                Reset
              </button>
              <button
                type="submit"
                className={styles.btnSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" label="Creating..." />
                    <span style={{ marginLeft: "8px" }}>Creating...</span>
                  </>
                ) : (
                  "Create Ticket"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

export default Tickets;
