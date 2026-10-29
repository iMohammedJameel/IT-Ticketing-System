/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// UsersTable — the users admin table (loading skeletons, empty state, rows
// with role/team editors and suspend/delete actions). Extracted from Users.jsx.
import { useI18n } from "../../../i18n";
import EmptyState from "../../../components/common/EmptyState";
import { Skeleton } from "../../../components/common/Skeleton";
import { formatDate } from "../../../utils/format";
import styles from "../Users.module.css";

function UserRow({ user, currentUser, onlineStaff, onRoleChange, onTeamChange, onRequestAction }) {
  const { t, lang } = useI18n();
  const isSelf = user.id === currentUser?.id;
  const online = onlineStaff.includes(user.id);

  return (
    <tr>
      <td>
        <div className="d-flex align-items-center gap-2">
          <div className={styles.avatar}>
            {user.profileImage ? (
              <img src={user.profileImage} alt="" loading="lazy" />
            ) : (
              user.name?.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="fw-semibold">
              {user.name}{" "}
              {/* QA-deep: presence dot for EVERY row (backend now tracks all
                  connected users, list broadcast to staff only) — previously
                  staff showed a grey dot while employees showed none, which
                  read as a broken indicator rather than an intentional one. */}
              <span
                className={`presence-dot ${online ? "online" : ""}`}
                title={online ? t("common.online") : t("common.offline")}
                aria-label={online ? t("common.online") : t("common.offline")}
              ></span>
            </div>
            {isSelf && (
              <small className="text-muted">({t("users.you")})</small>
            )}
          </div>
        </div>
      </td>
      <td>{user.email}</td>
      <td>
        <div className="d-flex flex-column gap-1">
          <span
            className={`${styles.roleBadge} ${
              user.role === "admin" ? styles.roleAdmin : user.role === "agent" ? "role-agent-badge" : styles.roleUser
            }`}
            style={user.role === "agent" ? { background: "#ede9fe", color: "#6d28d9" } : undefined}
          >
            {t(`role.${user.role}`)}
          </span>
          {/* Role/team editor — admins can promote users to
              agents (or admins) and set their support team.
              Disabled for self (lock-out protection). */}
          {!isSelf && (
            <div className="d-flex gap-1">
              <select
                className="form-select form-select-sm"
                style={{ width: "auto", fontSize: "0.72rem" }}
                value={user.role}
                onChange={(e) => onRoleChange(user, e.target.value)}
                aria-label={t("users.changeRoleFor", { a: user.name })}
              >
                <option value="user">{t("role.user")}</option>
                <option value="agent">{t("role.agent")}</option>
                <option value="admin">{t("role.admin")}</option>
              </select>
              <input
                type="text"
                className="form-control form-control-sm"
                style={{ width: "90px", fontSize: "0.72rem" }}
                defaultValue={user.team || ""}
                placeholder={t("users.team")}
                onBlur={(e) => onTeamChange(user, e.target.value)}
                aria-label={t("users.teamFor", { a: user.name })}
              />
            </div>
          )}
          {user.team && (
            <small className="text-muted" style={{ fontSize: "0.68rem" }}>
              <i className="fa-solid fa-users me-1" aria-hidden="true"></i>{user.team}
            </small>
          )}
        </div>
      </td>
      <td>
        <span className={`${styles.statusBadge} ${user.status === "active" ? styles.statusActive : styles.statusSuspended}`}>
          {t(`users.${user.status}`)}
        </span>
      </td>
      <td>
        {user.emailVerifiedAt ? (
          <span className="text-success" title={t("users.verifiedOn", { a: formatDate(user.emailVerifiedAt, lang) })}>
            <i className="fa-solid fa-check-circle" aria-hidden="true"></i>
          </span>
        ) : (
          <span className="text-warning" title={t("users.notVerified")}>
            <i className="fa-solid fa-clock" aria-hidden="true"></i>
          </span>
        )}
      </td>
      <td>{formatDate(user.createdAt, lang)}</td>
      <td>
        {user.lastLoginAt ? formatDate(user.lastLoginAt, lang) : "—"}
      </td>
      <td>
        <div className="d-flex gap-1">
          <button
            className={`btn btn-sm ${user.status === "active" ? "btn-warning" : "btn-success"}`}
            onClick={() => onRequestAction("toggle", user.id, user.name)}
            title={user.status === "active" ? t("users.suspend") : t("users.activate")}
            aria-label={user.status === "active" ? t("users.suspendAria", { a: user.name }) : t("users.activateAria", { a: user.name })}
            disabled={isSelf}
          >
            <i className={`fa-solid ${user.status === "active" ? "fa-ban" : "fa-check"}`} aria-hidden="true"></i>
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => onRequestAction("delete", user.id, user.name)}
            title={t("common.delete")}
            aria-label={t("users.deleteAria", { a: user.name })}
            disabled={isSelf}
          >
            <i className="fa-solid fa-trash" aria-hidden="true"></i>
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function UsersTable({ users, loading, currentUser, onlineStaff, onRoleChange, onTeamChange, onRequestAction }) {
  const { t } = useI18n();

  return (
    <div className={styles.card}>
      <div className="table-responsive">
        <table className="table table-hover mb-0">
          <thead className="table-light">
            <tr>
              <th>{t("users.colUser")}</th>
              <th>{t("users.colEmail")}</th>
              <th>{t("users.colRole")}</th>
              <th>{t("users.colStatus")}</th>
              <th>{t("users.colVerified")}</th>
              <th>{t("users.colJoined")}</th>
              <th>{t("users.colLastLogin")}</th>
              <th>{t("users.colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan="8"><Skeleton height="1.5rem" /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="8">
                  <EmptyState
                    icon="fa-solid fa-users"
                    title={t("users.noUsers")}
                    description={t("users.noUsersHint")}
                  />
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  currentUser={currentUser}
                  onlineStaff={onlineStaff}
                  onRoleChange={onRoleChange}
                  onTeamChange={onTeamChange}
                  onRequestAction={onRequestAction}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
