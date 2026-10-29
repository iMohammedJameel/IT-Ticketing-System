/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// History tab — the ticket's audit timeline (capped at 200 entries by the
// model's pre-save hook). Enum values localize; names and dates pass through.
import EmptyState from "../../../components/common/EmptyState";
import { useI18n } from "../../../i18n";
import { formatDateTime } from "../../../utils/format";
import styles from "../TicketsList.module.css";

const HistoryTab = ({ history }) => {
  const { t, lang } = useI18n();

  if ((history || []).length === 0) {
    return (
      <div className={styles.historyList}>
        <EmptyState icon="fa-regular fa-clock-rotate-left" title={t("tickets.noHistory")} description={t("tickets.activityHere")} />
      </div>
    );
  }

  return (
    <div className={styles.historyList}>
      {(history || []).slice().reverse().map((h, idx) => {
        // t() returns the KEY itself when a translation is missing —
        // wrap it so we can pass a real per-entry fallback.
        const tr = (key, fb) => (t(key) === key ? fb : t(key));
        // Localize enum values; names & dates pass through. A history entry's
        // old/new value can be a STATUS or a PRIORITY (both are tracked), so
        // try both namespaces before falling back to the raw value.
        const val = (v) => {
          if (v == null || v === "") return "";
          const s = String(v);
          const st = t(`status.${s}`);
          if (st !== `status.${s}`) return st;
          const pr = t(`priority.${s}`);
          if (pr !== `priority.${s}`) return pr;
          return s;
        };
        return (
          <div key={idx} className={styles.historyItem}>
            <div className={styles.historyDot}></div>
            <div>
              <strong>{h.by?.name || tr("history.system", "System")}</strong>{" "}
              <span className="text-muted">{tr(`history.${h.action}`, h.action.replace(/_/g, " "))}</span>
              {h.field && <span> · <strong>{tr(`tickets.${h.field}`, h.field)}</strong></span>}
              {h.oldValue != null && h.oldValue !== "" && <span> {tr("history.from", "from")} <code>{val(h.oldValue)}</code></span>}
              {h.newValue != null && h.newValue !== "" && <span> {tr("history.to", "to")} <code>{val(h.newValue)}</code></span>}
              {h.note && <div className="text-muted small">{h.note}</div>}
              <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                {formatDateTime(h.createdAt, lang)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoryTab;
