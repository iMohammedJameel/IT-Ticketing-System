/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Create Ticket page — priority/category, file attachments, loading state,
// accessible form, sonner toasts. Uses useAuth() instead of localStorage.
// NEW:
//   - Tags input (comma separated → lowercase array)
//   - Company select loads the STAFF company directory when available
//   - SLA notice shows the LIVE configured policy hours (not hardcoded 72/48/24/4)
//   - KB deflection: while typing the description, matching published help
//     articles appear so requesters may solve it without a ticket
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n";
import { usePageTitle } from "../../hooks";
import { ticketService } from "../../services/ticketService";
import { companyService } from "../../services/companyService";
import { kbService } from "../../services/kbService";
import Spinner from "../../components/common/Spinner";
import styles from "./Tickets.module.css";

const PRODUCTS = [
  "E-Invoice", "E-Receipt", "POS System", "Accounting Software",
  "Inventory Management", "CRM System", "Other",
];

const FALLBACK_COMPANIES = [
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

// Default SLA hours (mirror of backend fallbacks) — replaced by live policies
const DEFAULT_SLA_HOURS = { low: "72h", medium: "48h", high: "24h", urgent: "4h" };

// Parse "Comma, separated,tags" → clean lowercase array (max 10)
const parseTags = (raw) =>
  [...new Set(
    raw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length >= 2 && t.length <= 30)
  )].slice(0, 10);

function Tickets() {
  const { user, isStaff } = useAuth();
  const { t } = useI18n();
  usePageTitle(t("tickets.formTitle"));

  // Draft autosave — a half-filled form survives a refresh / accidental nav.
  // Restored on mount, cleared on submit. "Has draft" is DERIVED at render
  // time (no extra state → no sync setState in effects).
  const EMPTY_FORM = { product: "", company: "", subject: "", category: "other", priority: "medium", description: "" };
  const [form, setForm] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ticket_draft") || "null");
      return saved && typeof saved === "object" ? { ...EMPTY_FORM, ...saved } : EMPTY_FORM;
    } catch {
      return EMPTY_FORM;
    }
  });
  const hasDraft = !!(form.product || form.company || form.subject || form.description);

  // Persist draft — external system write, only when it actually changed
  useEffect(() => {
    if (hasDraft) localStorage.setItem("ticket_draft", JSON.stringify(form));
    else localStorage.removeItem("ticket_draft");
  }, [form, hasDraft]);

  const [tagsInput, setTagsInput] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [companies, setCompanies] = useState([]); // staff: [{_id, name}]
  const [slaHours, setSlaHours] = useState(DEFAULT_SLA_HOURS);
  const [kbSuggestions, setKbSuggestions] = useState([]);
  const [fetchingKb, setFetchingKb] = useState(false);
  const fileInputRef = useRef(null);

  // Staff: load the company directory (users keep the static list)
  useEffect(() => {
    if (!isStaff) return;
    companyService
      .list({ active: "true" })
      .then((res) => setCompanies(res.data.companies || []))
      .catch(() => {});
  }, [isStaff]);

  // Staff: live SLA policies for the notice under the form
  useEffect(() => {
    if (!isStaff) return;
    ticketService
      .getSlaPolicies()
      .then((res) => {
        const policies = res.data.policies || [];
        const next = {};
        policies.forEach((p) => {
          next[p.priority] = `${p.hours}h${p.businessHoursOnly ? " (business)" : ""}`;
        });
        if (Object.keys(next).length) setSlaHours(next);
      })
      .catch(() => {});
  }, [isStaff]);

  // KB deflection — debounce 600ms on description/product typing
  useEffect(() => {
    const query = `${form.product} ${form.description}`.trim();
    if (query.length < 6) {
      setKbSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setFetchingKb(true);
      try {
        const res = await kbService.list({ search: form.product || form.description.slice(0, 60), limit: 3 });
        setKbSuggestions(res.data.articles || []);
      } catch {
        setKbSuggestions([]);
      } finally {
        setFetchingKb(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.product, form.description]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCompanyChange = (e) => {
    const name = e.target.value;
    setForm({ ...form, company: name });
    // Link the company directory id when the staff picks a known company
    const match = companies.find((c) => c.name === name);
    setCompanyId(match ? match._id : "");
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(t("tickets.fileTooLarge", { a: f.name }));
        return false;
      }
      return true;
    });
    setAttachments((prev) => [...prev, ...valid]);
    // Reset the native input so picking the SAME file again (e.g. after
    // removing it from the list) still fires onChange.
    e.target.value = "";
  };

  const removeAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setForm({ product: "", company: "", subject: "", category: "other", priority: "medium", description: "" });
    setTagsInput("");
    setCompanyId("");
    setAttachments([]);
    localStorage.removeItem("ticket_draft");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const { product, company, description } = form;
    if (!product || !company || !description.trim()) {
      toast.error(t("tickets.fillRequired"));
      return;
    }
    if (description.trim().length < 5) {
      toast.error(t("tickets.descMinLength"));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        description: description.trim(),
        tags: parseTags(tagsInput),
        ...(companyId ? { companyId } : {}),
        startDate: new Date().toISOString(),
      };
      const res = await ticketService.create(payload);
      const ticket = res.data.ticket;

      if (attachments.length > 0) {
        toast.info(t("tickets.uploadingN", { a: attachments.length }));
        let uploaded = 0;
        for (const file of attachments) {
          try {
            await ticketService.uploadAttachment(ticket._id, file);
            uploaded++;
          } catch {
            toast.error(t("tickets.uploadFailed", { a: file.name }));
          }
        }
        if (uploaded > 0) toast.success(t("tickets.uploadedN", { a: uploaded }));
      }

      toast.success(t("tickets.createdToast", { a: ticket.ticketNumber }));
      resetForm();
    } catch (err) {
      toast.error(err.message || t("tickets.createFailed"));
      if (err.details) {
        err.details.forEach((d) => toast.error(d.message || d));
      }
    } finally {
      setLoading(false);
    }
  };

  const companyNames = companies.length ? companies.map((c) => c.name) : FALLBACK_COMPANIES;

  return (
    <section className="p-4">
      <div className="container-fluid">
        <div className={styles.tabBar}>
          <div className="d-flex align-items-center gap-2">
            <i className="fa-solid fa-ticket" aria-hidden="true"></i>
            <span>{t("tickets.formTitle")}</span>
            {hasDraft && (
              <span className="badge text-bg-light border" style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                <i className="fa-solid fa-floppy-disk me-1" aria-hidden="true"></i>
                {t("tickets.draftRestored")}
              </span>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>{t("tickets.ticketInfo")}</div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-0">
              <div className="col-12 col-lg-6">
                {/* Product */}
                <div className={styles.formRow}>
                  <label htmlFor="product" className={styles.formLabel}>
                    {t("tickets.product")} <span className="text-danger">*</span>
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
                    <option value="">{t("tickets.selectProduct")}</option>
                    {PRODUCTS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Company (staff: live directory with ids) */}
                <div className={styles.formRow}>
                  <label htmlFor="company" className={styles.formLabel}>
                    {t("tickets.company")} <span className="text-danger">*</span>
                  </label>
                  <select
                    id="company"
                    className="form-select"
                    name="company"
                    value={form.company}
                    onChange={handleCompanyChange}
                    required
                    disabled={loading}
                  >
                    <option value="">{t("tickets.selectCompany")}</option>
                    {companyNames.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div className={styles.formRow}>
                  <label htmlFor="category" className={styles.formLabel}>
                    {t("tickets.category")}
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
                        {t(`category.${c}`)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div className={styles.formRow}>
                  <label htmlFor="priority" className={styles.formLabel}>
                    {t("tickets.priority")}
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
                        {t(`status.${p}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className={styles.formRow}>
                  <label htmlFor="tags" className={styles.formLabel}>
                    <i className="fa-solid fa-tags me-1" aria-hidden="true"></i>
                    {t("tickets.tags")}
                  </label>
                  <input
                    id="tags"
                    type="text"
                    className="form-control"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder={t("tickets.tagHint")}
                    disabled={loading}
                    maxLength={200}
                  />
                  {tagsInput && (
                    <div className="d-flex gap-1 flex-wrap mt-2">
                      {parseTags(tagsInput).map((tag) => (
                        <span key={tag} className="badge bg-light text-dark border" style={{ fontSize: "0.7rem" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Employee (read-only, derived from auth) */}
                <div className={styles.formRow}>
                  <label htmlFor="employee" className={styles.formLabel}>
                    {t("tickets.employee")}
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
                    {t("tickets.autoFilled")}
                  </small>
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <div style={{ padding: "1.25rem 2rem", height: "100%", display: "flex", flexDirection: "column" }}>
                  {/* Subject — short title shown in lists & search results */}
                  <div className="mb-3">
                    <label htmlFor="subject" className="form-label fw-bold" style={{ color: "var(--text-dark)" }}>
                      {t("tickets.subject")}
                    </label>
                    <input
                      id="subject"
                      type="text"
                      className="form-control"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      placeholder={t("tickets.subjectPlaceholder")}
                      maxLength={140}
                      disabled={loading}
                    />
                  </div>

                  <label htmlFor="description" className="form-label fw-bold" style={{ color: "var(--text-dark)" }}>
                    {t("tickets.problemDescription")} <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="description"
                    className={`${styles.customTextarea} form-control flex-grow-1`}
                    rows="9"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder={t("tickets.descriptionPlaceholder")}
                    style={{ resize: "none" }}
                    required
                    disabled={loading}
                    minLength={5}
                    maxLength={5000}
                  />
                  <small className="text-muted mt-1" style={{ fontSize: "0.75rem" }}>
                    {form.description.length}/5000
                  </small>
                </div>
              </div>
            </div>

            {/* Attachments — custom picker control (BUG-qa6-7): the native
                <input type="file"> chrome ("Choose Files" / "No file chosen")
                is browser-locale text we can't translate, so the input is
                visually hidden and a styled localized button drives it. */}
            <div className={styles.attachmentSection}>
              <label htmlFor="attachments" className={styles.formLabel}>
                <i className="fa-solid fa-paperclip me-1" aria-hidden="true"></i>
                {t("tickets.attachments")}
              </label>
              <div className={styles.filePickerRow}>
                <input
                  ref={fileInputRef}
                  id="attachments"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  disabled={loading}
                  accept="image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip"
                  className="visually-hidden"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className={styles.fileBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <i className="fa-solid fa-folder-open" aria-hidden="true"></i>
                  <span>{t("tickets.chooseFiles")}</span>
                </button>
                {attachments.length > 0 && (
                  <span className={styles.fileCount}>
                    {t("tickets.fileCount", { a: attachments.length })}
                  </span>
                )}
              </div>
              <small className="text-muted d-block mt-1" style={{ fontSize: "0.75rem" }}>
                {t("tickets.fileHint")}
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
                        aria-label={t("tickets.removeFile", { a: file.name })}
                        disabled={loading}
                      >
                        <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* KB deflection panel */}
            {(fetchingKb || kbSuggestions.length > 0) && !loading && (
              <div className={styles.kbSuggestBox}>
                <strong>
                  <i className="fa-solid fa-lightbulb me-1" aria-hidden="true"></i>
                  {t("tickets.relatedArticles")}
                </strong>
                <p className="text-muted mb-2" style={{ fontSize: "0.78rem" }}>
                  {t("tickets.relatedHint")}
                </p>
                <ul className="mb-0" style={{ listStyle: "none", padding: 0 }}>
                  {kbSuggestions.map((a) => (
                    <li key={a._id} className="mb-1">
                      <a href={`/kb?id=${a._id}`} target="_blank" rel="noopener noreferrer">
                        <i className="fa-solid fa-book me-1" aria-hidden="true"></i>
                        {a.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* SLA info notice — live policy hours for staff, defaults otherwise */}
            <div className={styles.slaNotice}>
              <i className="fa-solid fa-clock me-2" aria-hidden="true"></i>
              <span>
                {t("tickets.slaNotice")}:{" "}
                <strong style={{ color: PRIORITY_COLORS[form.priority] }}>
                  {t(`status.${form.priority}`)}
                </strong>{" "}
                ({slaHours[form.priority]})
              </span>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.btnClose} onClick={resetForm} disabled={loading}>
                {t("tickets.reset")}
              </button>
              <button type="submit" className={styles.btnSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Spinner size="sm" label={t("tickets.creating")} />
                    <span style={{ marginLeft: "8px" }}>{t("tickets.creating")}</span>
                  </>
                ) : (
                  t("tickets.createTicket")
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
