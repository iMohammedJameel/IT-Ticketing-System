/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// TicketFormFields — left column of the create-ticket form
// (product / company / category / priority / tags / read-only employee).
// Extracted from Tickets.jsx.
import { useI18n } from "../../../i18n";
import {
  PRODUCTS,
  CATEGORIES,
  PRIORITIES,
  PRIORITY_COLORS,
  PRIORITY_INKS,
  parseTags,
} from "../ticketsFormConfig";
import styles from "../Tickets.module.css";

export default function TicketFormFields({
  form,
  setForm,
  companyNames,
  tagsInput,
  setTagsInput,
  userName,
  onCompanyChange,
  disabled,
}) {
  const { t } = useI18n();

  return (
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
          onChange={(e) => setForm({ ...form, product: e.target.value })}
          required
          disabled={disabled}
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
          onChange={onCompanyChange}
          required
          disabled={disabled}
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
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          disabled={disabled}
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
        <div className={`${styles.pillWrap} d-flex gap-2 flex-wrap`}>
          {PRIORITIES.map((p) => (
            <button
              type="button"
              key={p}
              className={`${styles.priorityBtn} ${form.priority === p ? styles.priorityActive : ""}`}
              onClick={() => setForm({ ...form, priority: p })}
              disabled={disabled}
              style={{
                borderColor: form.priority === p ? PRIORITY_COLORS[p] : undefined,
                /* QA-uiux (WCAG 1.4.3): tinted chip + theme-aware ink (was
                   solid vivid bg + white text at 2.1:1) — matches the badges. */
                background:
                  form.priority === p
                    ? `color-mix(in srgb, ${PRIORITY_COLORS[p]} 15%, transparent)`
                    : undefined,
                color: form.priority === p ? PRIORITY_INKS[p] : undefined,
              }}
              aria-pressed={form.priority === p}
            >
              {t(`priority.${p}`)}
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
          disabled={disabled}
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
          value={userName || ""}
          disabled
          aria-describedby="employeeHelp"
        />
        <small id="employeeHelp" className={`${styles.formHint} text-muted`} style={{ fontSize: "0.75rem" }}>
          {t("tickets.autoFilled")}
        </small>
      </div>
    </div>
  );
}
