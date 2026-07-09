// Users page — uses authService (PATCH not PUT), accessible Modal component,
// sonner toasts, fixed verify response check, search, role filter, loading skeletons.
// The bug `verifyResponse.status === 200` is fixed by checking `res.success` on the envelope.
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { Modal } from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { Skeleton } from "../../components/common/Skeleton";
import styles from "./Users.module.css";

function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
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
      toast.error(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter + search
  const filteredUsers = users.filter((u) => {
    if (filterRole && u.role !== filterRole) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    }
    return true;
  });

  // ---------------------------------------------------------------------
  // Add user (note: backend forces role to "user" — admin cannot create admins)
  // ---------------------------------------------------------------------
  const handleAddUser = async (e) => {
    e.preventDefault();
    const { name, email, password } = formData;
    if (!name || !email || !password) {
      toast.error("All fields are required");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      await authService.register({ name, email, password });
      toast.success(`User ${name} created. They will need to verify their email.`);
      setFormData({ name: "", email: "", password: "" });
      setShowAddModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || "Failed to add user");
      if (err.details) err.details.forEach((d) => toast.error(d.message || d));
    }
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
      toast.error("Password is required");
      return;
    }
    setVerifying(true);
    try {
      // FIX: was `if (verifyResponse.status === 200)` — the interceptor unwraps to envelope.
      // Now we check res.success on the normalized envelope.
      const res = await authService.verifyPassword({ password: confirmPassword });
      if (!res.success) {
        toast.error("Password verification failed");
        setVerifying(false);
        return;
      }

      // Execute the pending action
      if (pendingAction.type === "toggle") {
        await authService.toggleUserStatus(pendingAction.userId);
        toast.success("User status updated");
      } else if (pendingAction.type === "delete") {
        await authService.deleteUser(pendingAction.userId);
        toast.success("User deleted");
      }

      setShowConfirmModal(false);
      setConfirmPassword("");
      setPendingAction(null);
      fetchUsers();
    } catch (err) {
      // err is the normalized object { success, status, message, details }
      if (err.status === 401) {
        toast.error("Incorrect password");
      } else if (err.status === 400 && pendingAction?.userId === currentUser?.id) {
        toast.error("You cannot suspend or delete your own account");
      } else {
        toast.error(err.message || "Action failed");
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
            <span className="fs-5 fw-semibold">All Users</span>
            <span className="badge bg-secondary">{users.length}</span>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <i className="fa-solid fa-user-plus me-2" aria-hidden="true"></i>
            Add User
          </button>
        </div>

        {/* Filters */}
        <div className="d-flex gap-2 mb-3 flex-wrap">
          <input
            type="search"
            className="form-control"
            style={{ maxWidth: "240px" }}
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search users"
          />
          <select
            className="form-select w-auto"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            aria-label="Filter by role"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <select
            className="form-select w-auto"
            onChange={(e) => {/* could add status filter */}}
            aria-label="Filter by status"
            defaultValue=""
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => { setFilterRole(""); setSearch(""); }}
          >
            Clear
          </button>
        </div>

        {/* Table */}
        <div className={styles.card}>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Verified</th>
                  <th>Joined</th>
                  <th>Last Login</th>
                  <th>Actions</th>
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
                        icon="👥"
                        title="No users found"
                        description="Try adjusting your search or filters."
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
                            <div className="fw-semibold">{user.name}</div>
                            {user.id === currentUser?.id && (
                              <small className="text-muted">(you)</small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`${styles.roleBadge} ${user.role === "admin" ? styles.roleAdmin : styles.roleUser}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${user.status === "active" ? styles.statusActive : styles.statusSuspended}`}>
                          {user.status}
                        </span>
                      </td>
                      <td>
                        {user.emailVerifiedAt ? (
                          <span className="text-success" title={`Verified ${new Date(user.emailVerifiedAt).toLocaleDateString()}`}>
                            <i className="fa-solid fa-check-circle" aria-hidden="true"></i>
                          </span>
                        ) : (
                          <span className="text-warning" title="Not verified">
                            <i className="fa-solid fa-clock" aria-hidden="true"></i>
                          </span>
                        )}
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString("en-GB")}</td>
                      <td>
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <button
                            className={`btn btn-sm ${user.status === "active" ? "btn-warning" : "btn-success"}`}
                            onClick={() => requestAction("toggle", user.id, user.name)}
                            title={user.status === "active" ? "Suspend" : "Activate"}
                            aria-label={user.status === "active" ? `Suspend ${user.name}` : `Activate ${user.name}`}
                            disabled={user.id === currentUser?.id}
                          >
                            <i className={`fa-solid ${user.status === "active" ? "fa-ban" : "fa-check"}`} aria-hidden="true"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => requestAction("delete", user.id, user.name)}
                            title="Delete"
                            aria-label={`Delete ${user.name}`}
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
        onClose={() => setShowAddModal(false)}
        title="Add New User"
        size="sm"
      >
        <form onSubmit={handleAddUser}>
          <p className="text-muted mb-3" style={{ fontSize: "0.85rem" }}>
            New users will be created with role "user" and must verify their email before logging in.
          </p>
          <div className="mb-3">
            <label htmlFor="add-name" className="form-label">Name</label>
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
            <label htmlFor="add-email" className="form-label">Email</label>
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
            <label htmlFor="add-password" className="form-label">Password</label>
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
              Min 8 chars, with uppercase, lowercase, and a digit.
            </small>
          </div>
          <div className="d-flex gap-2 justify-content-end">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">Add User</button>
          </div>
        </form>
      </Modal>

      {/* Confirm Password Modal — uses accessible Modal */}
      <Modal
        open={showConfirmModal}
        onClose={() => { setShowConfirmModal(false); setConfirmPassword(""); setPendingAction(null); }}
        title="Confirm Action"
        size="sm"
      >
        <p className="text-muted mb-3">
          Please enter <strong>your admin password</strong> to confirm this action.
        </p>
        <div className="alert alert-warning" role="alert">
          <strong>Action:</strong> {pendingAction?.type === "toggle" ? "Toggle status of" : "Delete"}{" "}
          <strong>{pendingAction?.userName}</strong>
        </div>
        <div className="mb-3">
          <label htmlFor="confirm-pw" className="form-label fw-semibold">Your Password</label>
          <input
            id="confirm-pw"
            type="password"
            className="form-control"
            placeholder="Enter your admin password"
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
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${pendingAction?.type === "delete" ? "btn-danger" : "btn-warning"}`}
            onClick={executeAction}
            disabled={verifying || !confirmPassword}
          >
            {verifying ? "Verifying..." : "Confirm"}
          </button>
        </div>
      </Modal>
    </section>
  );
}

export default Users;
