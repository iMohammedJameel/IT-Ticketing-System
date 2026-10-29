/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Users page — admin user management (list, filter, role/team edit,
// add user, suspend/delete with re-auth verification).
//
// Split for maintainability (single responsibility):
//   components/UsersFilters.jsx          — search + role/status filters
//   components/UsersTable.jsx            — table, rows, role/team editors
//   components/AddUserModal.jsx          — create-user dialog + validation
//   components/ConfirmPasswordModal.jsx  — re-auth before destructive actions
// The page itself keeps state + API orchestration only.
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useI18n } from "../../i18n";
import { tApiError } from "../../i18n/apiErrors";
import { usePageTitle } from "../../hooks";
import { authService } from "../../services/authService";
import styles from "./Users.module.css";

import UsersFilters from "./components/UsersFilters";
import UsersTable from "./components/UsersTable";
import AddUserModal from "./components/AddUserModal";
import ConfirmPasswordModal from "./components/ConfirmPasswordModal";

function Users() {
  const { user: currentUser } = useAuth();
  const { onlineStaff } = useNotifications();
  const { t } = useI18n();
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
  // Add user (note: backend forces role to "user" — admin cannot create admins).
  // `validationError` is computed by the modal (localized) and passed back.
  // ---------------------------------------------------------------------
  const handleAddUser = async (validationError) => {
    setAddError("");
    if (validationError) {
      setAddError(validationError);
      return;
    }
    const { name, email, password } = formData;
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

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setConfirmPassword("");
    setPendingAction(null);
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

      closeConfirmModal();
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

        <UsersFilters
          search={search}
          setSearch={setSearch}
          filterRole={filterRole}
          setFilterRole={setFilterRole}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          onClear={() => { setFilterRole(""); setFilterStatus(""); setSearch(""); }}
        />

        <UsersTable
          users={filteredUsers}
          loading={loading}
          currentUser={currentUser}
          onlineStaff={onlineStaff}
          onRoleChange={handleRoleChange}
          onTeamChange={handleTeamChange}
          onRequestAction={requestAction}
        />
      </div>

      {/* Add User Modal */}
      <AddUserModal
        open={showAddModal}
        onClose={closeAddModal}
        onSubmit={handleAddUser}
        formData={formData}
        setFormData={setFormData}
        addError={addError}
      />

      {/* Confirm Password Modal */}
      <ConfirmPasswordModal
        open={showConfirmModal}
        onClose={closeConfirmModal}
        onConfirm={executeAction}
        pendingAction={pendingAction}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        verifying={verifying}
      />
    </section>
  );
}

export default Users;
