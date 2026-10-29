/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// UsersFilters — search box + role/status filters for the users admin table.
// Extracted from Users.jsx (presentational, fully controlled inputs).
import { useI18n } from "../../../i18n";

export default function UsersFilters({ search, setSearch, filterRole, setFilterRole, filterStatus, setFilterStatus, onClear }) {
  const { t } = useI18n();

  return (
    <div className="d-flex gap-2 mb-3 flex-wrap">
      <input
        type="search"
        className="form-control"
        style={{ maxWidth: "240px" }}
        placeholder={t("users.searchPlaceholder")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label={t("users.searchLabel")}
      />
      <select
        className="form-select w-auto"
        value={filterRole}
        onChange={(e) => setFilterRole(e.target.value)}
        aria-label={t("users.filterRole")}
      >
        <option value="">{t("users.allRoles")}</option>
        <option value="admin">{t("users.admin")}</option>
        <option value="agent">{t("users.agent")}</option>
        <option value="user">{t("users.user")}</option>
      </select>
      <select
        className="form-select w-auto"
        onChange={(e) => setFilterStatus(e.target.value)}
        aria-label={t("common.filterStatus")}
        value={filterStatus}
      >
        <option value="">{t("common.allStatuses")}</option>
        <option value="active">{t("users.active")}</option>
        <option value="suspended">{t("users.suspended")}</option>
      </select>
      <button
        className="btn btn-outline-secondary btn-sm"
        onClick={onClear}
      >
        {t("common.clear")}
      </button>
    </div>
  );
}
