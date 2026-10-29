/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// BulkActionBar — appears when staff selects tickets; status/assign/delete.
import styles from "./TicketsList.module.css";
import { useI18n } from "../../i18n";
import { STATUS_OPTIONS } from "./ticketConstants";

function BulkActionBar({ selectedCount, admins, onBulkStatus, onBulkAssign, onBulkDelete, onCancel, canDelete }) {
  const { t } = useI18n();
  if (selectedCount === 0) return null;

  return (
    <div className={styles.bulkBar}>
      <span>
        <strong>{selectedCount}</strong> {t("common.selected")}
      </span>
      <select
        className="form-select form-select-sm w-auto"
        onChange={(e) => {
          if (e.target.value) onBulkStatus(e.target.value);
          e.target.value = "";
        }}
        defaultValue=""
        aria-label={t("common.changeStatus")}
      >
        <option value="">{t("common.changeStatus")}</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>{t(`status.${s.value}`)}</option>
        ))}
      </select>
      <select
        className="form-select form-select-sm w-auto"
        onChange={(e) => {
          if (e.target.value) onBulkAssign(e.target.value);
          e.target.value = "";
        }}
        defaultValue=""
        aria-label={t("common.assignTo")}
      >
        <option value="">{t("common.assignTo")}</option>
        {admins.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}{a.team ? ` (${a.team})` : ""}
          </option>
        ))}
      </select>
      {canDelete && (
        <button className="btn btn-sm btn-danger" onClick={onBulkDelete}>
          <i className="fa-solid fa-trash me-1" aria-hidden="true"></i>
          {t("common.delete")}
        </button>
      )}
      <button className="btn btn-sm btn-outline-secondary" onClick={onCancel}>
        {t("common.cancel")}
      </button>
    </div>
  );
}

export default BulkActionBar;
