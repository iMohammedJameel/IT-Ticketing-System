/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Users page — uses authService (PATCH not PUT), accessible Modal component,
// sonner toasts, fixed verify response check, search, role filter, loading skeletons.
// The bug `verifyResponse.status === 200` is fixed by checking `res.success` on the envelope.
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useI18n } from "../../i18n";
import { tApiError } from "../../i18n/apiErrors";
import { usePageTitle } from "../../hooks";
import { authService } from "../../services/authService";
import { Modal } from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { Skeleton } from "../../components/common/Skeleton";
import { formatDate } from "../../utils/format";
import styles from "./Users.module.css";

function Users() {
  const { user: currentUser } = useAuth();
  const { onlineStaff } = useNotifications();
  const { t, lang } = useI18n();
  usePageTitle(t("nav.users"));
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authService.getAllUsers();
      setUsers(res.data.users || []);
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("users.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter + search
  const filteredUsers = users.filter((u) => {
    if (filterRole && u.role !== filterRole) return false;
    if (filterStatus && u.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    }
    return true;
  });

  // ---------------------------------------------------------------------
  // Role & team management (admin-only UI; backend enforces too).
  // Role changes invalidate the target user's sessions (tokenVersion bump)
  // — that's intentional and expected.
  // ---------------------------------------------------------------------
  const handleRoleChange = async (user, role) => {
    if (role === user.role) return;
    const roleLabel = { admin: t("users.asAdmin"), agent: t("users.asAgent"), user: t("users.asUser") }[role] || role;
    if (!confirm(t("users.confirmRoleChange", { a: user.name, b: roleLabel }))) return;
    try {
      const res = await authService.updateUserRole(user.id, { role });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data.user : u)));
      toast.success(t("users.roleChanged", { a: user.name, b: t(`users.${role}`) }));
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("users.roleChangeFailed"));
    }
  };

  const handleTeamChange = async (user, team) => {
    const clean = team.trim();
    if (clean === (user.team || "")) return;
    try {
      const res = await authService.updateUserRole(user.id, { team: clean });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data.user : u)));
      toast.success(clean ? t("users.teamSet", { a: user.name, b: clean }) : t("users.teamCleared"));
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("users.teamChangeFailed"));
    }
  };

  // ---------------------------------------------------------------------
  // Add user (note: backend forces role to "user" — admin cannot create admins)
  // Validation mirrors the auth forms (fix-4 pattern): noValidate on the
  // form + localized JS checks rendered inline — native browser tooltips are
  // untranslatable browser chrome (fix-5, item F13).
  // ---------------------------------------------------------------------
  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddError("");
    const { name, email, password } = formData;
    if (!name.trim()) {
      setAddError(t("errors.nameRequired"));
      return;
    }
    if (name.trim().length < 3) {
      setAddError(t("errors.nameMinLength"));
      return;
    }
    if (!email.trim()) {
      setAddError(t("errors.emailRequired"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setAddError(t("errors.emailInvalid"));
      return;
    }
    if (!password) {
      setAddError(t("errors.passwordRequired"));
      return;
    }
    if (password.length < 8) {
      setAddError(t("errors.passwordMinLength"));
      return;
    }
    // Same policy as the backend: ≥1 letter + ≥1 digit
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setAddError(t("errors.passwordPolicy"));
      return;
    }
    try {
      await authService.register({ name: name.trim(), email: email.trim(), password });
      toast.success(t("users.userCreated", { a: name.trim() }));
      setFormData({ name: "", email: "", password: "" });
      setShowAddModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("users.addFailed"));
      if (err.details) err.details.forEach((d) => toast.error(d.message || d));
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddError("");
  };

  // ---------------------------------------------------------------------
  // Re-auth verification before destructive actions (suspend / delete)
  // ---------------------------------------------------------------------
  const requestAction = (type, userId, userName) => {
    setPendingAction({ type, userId, userName });
    setConfirmPassword("");
    setShowConfirmModal(true);
  };

  const executeAction = async () => {
    if (!confirmPassword) {
      toast.error(t("users.pwRequired"));
      return;
    }
    setVerifying(true);
    try {
      // FIX: was `if (verifyResponse.status === 200)` — the interceptor unwraps to envelope.
      // Now we check res.success on the normalized envelope.
      const res = await authService.verifyPassword({ password: confirmPassword });
      if (!res.success) {
        toast.error(t("users.pwVerifyFailed"));
        setVerifying(false);
        return;
      }

      // Execute the pending action
      if (pendingAction.type === "toggle") {
        await authService.toggleUserStatus(pendingAction.userId);
        toast.success(t("users.statusUpdated"));
      } else if (pendingAction.type === "delete") {
        await authService.deleteUser(pendingAction.userId);
        toast.success(t("users.userDeleted"));
      }

      setShowConfirmModal(false);
      setConfirmPassword("");
      setPendingAction(null);
      fetchUsers();
    } catch (err) {
      // err is the normalized object { success, status, message, details }
      if (err.status === 401) {
        toast.error(t("errors.passwordIncorrect"));
      } else if (err.status === 400 && pendingAction?.userId === currentUser?.id) {
        toast.error(t("users.selfAction"));
      } else {
        toast.error(tApiError(err.message, t) || t("users.actionFailed"));
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <section className="p-4">
      <div className="container-fluid">
        {/* Header */}
        <div className={`${styles.header} d-flex justify-content-between align-items-center mb-4`}>
          <div className="d-flex align-items-center gap-2">
            <i className="fa-solid fa-users" aria-hidden="true"></i>
            <span className="fs-5 fw-semibold">{t("users.title")}</span>
            <span className={styles.countBadge}>{users.length}</span>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <i className="fa-solid fa-user-plus me-2" aria-hidden="true"></i>
            {t("users.addUser")}
          </button>
        </div>

        {/* Filters */}
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
            onClick={() => { setFilterRole(""); setFilterStatus(""); setSearch(""); }}
          >
            {t("common.clear")}
          </button>
        </div>

        {/* Table */}
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
                ) : filteredUsers.length === 0 ? (
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
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
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
                              {(user.role === "admin" || user.role === "agent") && (
                                <span
                                  className={`presence-dot ${onlineStaff.includes(user.id) ? "online" : ""}`}
                                  title={onlineStaff.includes(user.id) ? t("common.online") : t("common.offline")}
                                  aria-label={onlineStaff.includes(user.id) ? t("common.online") : t("common.offline")}
                                ></span>
                              )}
                            </div>
                            {user.id === currentUser?.id && (
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
                          {user.id !== currentUser?.id && (
                            <div className="d-flex gap-1">
                              <select
                                className="form-select form-select-sm"
                                style={{ width: "auto", fontSize: "0.72rem" }}
                                value={user.role}
                                onChange={(e) => handleRoleChange(user, e.target.value)}
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
                                onBlur={(e) => handleTeamChange(user, e.target.value)}
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
                            onClick={() => requestAction("toggle", user.id, user.name)}
                            title={user.status === "active" ? t("users.suspend") : t("users.activate")}
                            aria-label={user.status === "active" ? t("users.suspendAria", { a: user.name }) : t("users.activateAria", { a: user.name })}
                            disabled={user.id === currentUser?.id}
                          >
                            <i className={`fa-solid ${user.status === "active" ? "fa-ban" : "fa-check"}`} aria-hidden="true"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => requestAction("delete", user.id, user.name)}
                            title={t("common.delete")}
                            aria-label={t("users.deleteAria", { a: user.name })}
                            disabled={user.id === currentUser?.id}
                          >
                            <i className="fa-solid fa-trash" aria-hidden="true"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal — uses accessible Modal */}
      <Modal
        open={showAddModal}
        onClose={closeAddModal}
        title={t("users.addTitle")}
        size="sm"
      >
        <form onSubmit={handleAddUser} noValidate>
          <p className="text-muted mb-3" style={{ fontSize: "0.85rem" }}>
            {t("users.addHint")}
          </p>
          {addError && (
            <p className={styles.addFormError} dir="auto" role="alert">
              {addError}
            </p>
          )}
          <div className="mb-3">
            <label htmlFor="add-name" className="form-label">{t("users.name")}</label>
            <input
              id="add-name"
              type="text"
              className="form-control"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              minLength={3}
              maxLength={50}
              autoComplete="name"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="add-email" className="form-label">{t("users.email")}</label>
            <input
              id="add-email"
              type="email"
              className="form-control"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="add-password" className="form-label">{t("users.password")}</label>
            <input
              id="add-password"
              type="password"
              className="form-control"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <small className="text-muted" style={{ fontSize: "0.75rem" }}>
              {t("users.pwHint")}
            </small>
          </div>
          <div className="d-flex gap-2 justify-content-end">
            <button type="button" className="btn btn-outline-secondary" onClick={closeAddModal}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="btn btn-primary">{t("users.addUser")}</button>
          </div>
        </form>
      </Modal>

      {/* Confirm Password Modal — uses accessible Modal */}
      <Modal
        open={showConfirmModal}
        onClose={() => { setShowConfirmModal(false); setConfirmPassword(""); setPendingAction(null); }}
        title={t("users.confirmTitle")}
        size="sm"
      >
        <p className="text-muted mb-3">
          {t("users.confirmHintA")} <strong>{t("users.confirmHintB")}</strong> {t("users.confirmHintC")}
        </p>
        <div className="alert alert-warning" role="alert">
          <strong>{t("users.actionLabel")}</strong> {pendingAction?.type === "toggle" ? t("users.actionToggle") : t("users.actionDelete")}{" "}
          <strong>{pendingAction?.userName}</strong>
        </div>
        <div className="mb-3">
          <label htmlFor="confirm-pw" className="form-label fw-semibold">{t("users.yourPassword")}</label>
          <input
            id="confirm-pw"
            type="password"
            className="form-control"
            placeholder={t("users.confirmPwPh")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") executeAction(); }}
            autoFocus
            autoComplete="current-password"
          />
        </div>
        <div className="d-flex gap-2 justify-content-end">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => { setShowConfirmModal(false); setConfirmPassword(""); setPendingAction(null); }}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className={`btn ${pendingAction?.type === "delete" ? "btn-danger" : "btn-warning"}`}
            onClick={executeAction}
            disabled={verifying || !confirmPassword}
          >
            {verifying ? t("users.verifying") : t("users.confirm")}
          </button>
        </div>
      </Modal>
    </section>
  );
}

export default Users;
