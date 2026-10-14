/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// TicketsFilters — queue views (staff) + search + filter selects.
// Shows an active-filter count on Clear so users see what they're resetting.
import styles from "./TicketsList.module.css";
import { useI18n } from "../../i18n";
import { STATUS_OPTIONS, PRIORITY_OPTIONS, CATEGORIES } from "./ticketConstants";

const VIEWS = [
  { value: "all", icon: "fa-layer-group" },
  { value: "mine", icon: "fa-user-check" },
  { value: "unassigned", icon: "fa-inbox" },
  { value: "at-risk", icon: "fa-triangle-exclamation" },
];

function TicketsFilters({ filters, setFilters, onRefresh, companies, isStaff }) {
  const { t } = useI18n();

  const set = (key) => (e) =>
    setFilters({ ...filters, [key]: e.target.value, page: 1 });

  const activeFilterCount = ["status", "priority", "category", "company", "tag", "search"].filter(
    (k) => filters[k]
  ).length + (isStaff && filters.view !== "all" ? 1 : 0);

  return (
    <div className="mb-3">
      {/* Queue views — staff only. Employees already only see their own tickets. */}
      {isStaff && (
        <div className={`${styles.viewTabs} d-flex gap-1 mb-3 flex-wrap`} role="tablist" aria-label={t("tickets.view")}>
          {VIEWS.map((v) => (
            <button
              key={v.value}
              className={`${styles.viewTab} ${filters.view === v.value ? styles.viewTabActive : ""}`}
              onClick={() => setFilters({ ...filters, view: v.value, page: 1 })}
              role="tab"
              aria-selected={filters.view === v.value}
            >
              <i className={`fa-solid ${v.icon}`} aria-hidden="true"></i>
              {t(`tickets.view_${v.value.replace("-", "_")}`)}
            </button>
          ))}
        </div>
      )}

      <div className="d-flex gap-2 flex-wrap">
        <input
          type="search"
          className="form-control"
          style={{ maxWidth: "240px" }}
          placeholder={t("tickets.searchPlaceholder")}
          value={filters.search}
          onChange={set("search")}
          aria-label={t("tickets.searchPlaceholder")}
        />
        <select className="form-select w-auto" value={filters.status} onChange={set("status")} aria-label={t("common.filterStatus")}>
          <option value="">{t("common.allStatuses")}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{t(`status.${s.value}`)}</option>
          ))}
        </select>
        <select className="form-select w-auto" value={filters.priority} onChange={set("priority")} aria-label={t("common.filterPriority")}>
          <option value="">{t("common.allPriorities")}</option>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{t(`status.${p.value}`)}</option>
          ))}
        </select>
        <select className="form-select w-auto" value={filters.category} onChange={set("category")} aria-label={t("common.filterCategory")}>
          <option value="">{t("common.allCategories")}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{t(`category.${c}`)}</option>
          ))}
        </select>
        <select className="form-select w-auto" value={filters.company} onChange={set("company")} aria-label={t("common.filterCompany")}>
          <option value="">{t("common.allCompanies")}</option>
          {companies.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {/* Tag filter — exact, lowercase (indexed on the backend) */}
        <input
          type="search"
          className="form-control"
          style={{ maxWidth: "160px" }}
          placeholder={t("tickets.tags")}
          value={filters.tag || ""}
          onChange={set("tag")}
          aria-label={t("tickets.tags")}
        />
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() =>
            setFilters({
              ...filters,
              view: "all",
              status: "", priority: "", category: "", company: "", search: "", tag: "", page: 1,
            })
          }
        >
          {t("common.clear")}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
        <button className="btn btn-outline-primary btn-sm" onClick={onRefresh}>
          <i className="fa-solid fa-rotate-right" aria-hidden="true"></i> {t("common.refresh")}
        </button>
      </div>
    </div>
  );
}

export default TicketsFilters;
