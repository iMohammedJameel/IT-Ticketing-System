/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Pagination — page numbers (windowed), page-size selector, "showing X–Y of Z".
// Replaces the old Previous/Next-only control.
import { useI18n } from "../../i18n";

const pageWindow = (current, total, size = 5) => {
  // Always show `size` pages when possible, sliding around the current page.
  if (total <= size) return Array.from({ length: total }, (_, i) => i + 1);
  let start = Math.max(1, current - Math.floor(size / 2));
  const end = start + size - 1;
  if (end > total) {
    start = total - size + 1;
  }
  return Array.from({ length: size }, (_, i) => start + i);
};

function Pagination({ page, limit, total, totalPages, onPageChange, onLimitChange, limitOptions = [10, 20, 50, 100] }) {
  const { t } = useI18n();
  if (!total) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3">
      <span className="text-muted" style={{ fontSize: "0.85rem" }}>
        {t("common.showingRange", { a: from, b: to, c: total })}
      </span>

      <div className="d-flex align-items-center gap-2">
        {/* Page size selector */}
        {onLimitChange && (
          <select
            className="form-select form-select-sm w-auto"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            aria-label={t("common.rowsPerPage")}
          >
            {limitOptions.map((n) => (
              <option key={n} value={n}>{n} / {t("common.pageUnit")}</option>
            ))}
          </select>
        )}

        <nav aria-label={t("common.pagination")}>
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${canPrev ? "" : "disabled"}`}>
              <button className="page-link" onClick={() => canPrev && onPageChange(page - 1)} aria-label={t("common.previous")}>
                <span aria-hidden="true">‹</span>
              </button>
            </li>
            {pageWindow(page, totalPages).map((p) => (
              <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                <button
                  className="page-link"
                  onClick={() => onPageChange(p)}
                  aria-current={p === page ? "page" : undefined}
                >
                  {p}
                </button>
              </li>
            ))}
            <li className={`page-item ${canNext ? "" : "disabled"}`}>
              <button className="page-link" onClick={() => canNext && onPageChange(page + 1)} aria-label={t("common.next")}>
                <span aria-hidden="true">›</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

export default Pagination;
