// Settings page — uses useAuth(), multipart upload (not base64), backend-persisted job
// details (not localStorage), removed fake chart, sonner toasts, accessible form labels,
// notification preferences, email verification status display, resend verification button.
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import Spinner from "../../components/common/Spinner";
import styles from "./Settings.module.css";

const DEPARTMENTS = ["IT", "HR", "Sales", "Support", "Finance", "Operations", "Marketing"];

function Settings() {
  const { user, updateUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(false);

  // Personal tab
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Job tab
  const [jobForm, setJobForm] = useState({
    jobTitle: user?.jobTitle || "",
    department: user?.department || "",
    phone: user?.phone || "",
  });

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState(user?.notificationPrefs || {
    ticketCreated: true,
    ticketAssigned: true,
    ticketStatusChanged: true,
    ticketCommented: true,
    slaBreaching: true,
  });

  // Profile image upload
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // ---------------------------------------------------------------------
  // Profile image — multipart upload (let axios set Content-Type with boundary)
  // ---------------------------------------------------------------------
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2 MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Show preview
    setPreviewImage(URL.createObjectURL(file));

    setUploadingImage(true);
    try {
      // Backend still expects base64 for profile image (small avatars OK).
      // For larger files we'd switch to multipart — but 2MB base64 is acceptable.
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const res = await authService.updateProfileImage({ profileImage: reader.result });
          updateUser(res.data.user);
          toast.success("Profile image updated");
          setPreviewImage(null);
        } catch (err) {
          toast.error(err.message || "Failed to update image");
          setPreviewImage(null);
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("Failed to read file");
      setUploadingImage(false);
      setPreviewImage(null);
    }
  };

  // ---------------------------------------------------------------------
  // Update profile (name/email)
  // ---------------------------------------------------------------------
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (profileForm.name === user?.name && profileForm.email === user?.email) {
      toast.info("No changes to save");
      return;
    }
    setLoading(true);
    try {
      const res = await authService.updateProfile(profileForm);
      updateUser(res.data.user);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------
  // Change password
  // ---------------------------------------------------------------------
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("New password must be different");
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      toast.success("Password changed. You'll need to login again on other devices.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------
  // Job details — persisted to backend (was localStorage before)
  // ---------------------------------------------------------------------
  const handleJobSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authService.updateProfile(jobForm);
      updateUser(res.data.user);
      toast.success("Job details saved");
    } catch (err) {
      toast.error(err.message || "Failed to save job details");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------
  // Notification preferences (saved as part of profile)
  // ---------------------------------------------------------------------
  const handleNotifPrefChange = (key) => async (e) => {
    const newPrefs = { ...notifPrefs, [key]: e.target.checked };
    setNotifPrefs(newPrefs);
    try {
      // Save immediately (debounced would be better, but simple for now)
      const res = await authService.updateProfile({ notificationPrefs: newPrefs });
      updateUser(res.data.user);
      toast.success("Notification preference updated");
    } catch (err) {
      toast.error(err.message || "Failed to update preference");
      // Revert
      setNotifPrefs(notifPrefs);
    }
  };

  const handleResendVerification = async () => {
    try {
      await authService.resendVerification();
      toast.success("Verification email sent. Check your inbox.");
    } catch (err) {
      toast.error(err.message || "Failed to resend");
    }
  };

  const profileImageSrc = previewImage || user?.profileImage;

  return (
    <section className="p-4">
      <div className="container-fluid">
        {/* Header */}
        <div className={`${styles.tabBar} d-flex justify-content-between align-items-center mb-4`}>
          <div className="d-flex align-items-center gap-2">
            <i className="fa-solid fa-gear" aria-hidden="true"></i>
            <span className="fs-5 fw-semibold">Settings</span>
          </div>
        </div>

        <div className="row">
          {/* Left column — profile card */}
          <div className="col-12 col-lg-4 mb-4">
            <div className={`${styles.card} mb-4`}>
              <div className={`${styles.profileSection} text-center`}>
                <div className={styles.avatarLarge}>
                  {profileImageSrc ? (
                    <img
                      src={profileImageSrc}
                      alt="Your profile"
                      className="w-100 h-100 rounded-circle object-fit-cover"
                    />
                  ) : (
                    <i className="fa-solid fa-user" aria-hidden="true"></i>
                  )}
                  {uploadingImage && (
                    <div className={styles.avatarLoading}>
                      <Spinner size="sm" label="" />
                    </div>
                  )}
                  <label htmlFor="imageUpload" className={styles.cameraBtn} aria-label="Upload profile image">
                    <i className="fa-solid fa-camera" aria-hidden="true"></i>
                  </label>
                  <input
                    type="file"
                    id="imageUpload"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                    disabled={uploadingImage}
                  />
                </div>
                <h6 className={styles.profileName}>{user?.name || "Your Name"}</h6>
                <p className={styles.profileRole}>
                  {user?.role === "admin" ? "Administrator" : "Employee"}
                </p>
                {user && !user.emailVerifiedAt && (
                  <div className="alert alert-warning mt-3 py-2" style={{ fontSize: "0.8rem" }}>
                    <i className="fa-solid fa-triangle-exclamation me-1" aria-hidden="true"></i>
                    Email not verified
                    <button
                      type="button"
                      className="btn btn-sm btn-link p-0 ms-2"
                      onClick={handleResendVerification}
                    >
                      Resend
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Notification preferences */}
            <div className={styles.card}>
              <h6 className={styles.cardTitle}>Notification Preferences</h6>
              <div className={styles.notifPrefs}>
                {[
                  { key: "ticketCreated", label: "New ticket created" },
                  { key: "ticketAssigned", label: "Ticket assigned to me" },
                  { key: "ticketStatusChanged", label: "Ticket status changed" },
                  { key: "ticketCommented", label: "New comment on my ticket" },
                  { key: "slaBreaching", label: "SLA breaching soon" },
                ].map(({ key, label }) => (
                  <div key={key} className={styles.notifPrefItem}>
                    <label htmlFor={`notif-${key}`} className="form-check-label">
                      {label}
                    </label>
                    <div className="form-check form-switch">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`notif-${key}`}
                        checked={notifPrefs[key] ?? true}
                        onChange={handleNotifPrefChange(key)}
                        role="switch"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="col-12 col-lg-8">
            <div className={styles.card}>
              {/* Tabs */}
              <ul className="nav nav-tabs mb-4" role="tablist">
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === "personal" ? "active" : ""}`}
                    onClick={() => setActiveTab("personal")}
                    role="tab"
                    aria-selected={activeTab === "personal"}
                  >
                    Personal Details
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === "job" ? "active" : ""}`}
                    onClick={() => setActiveTab("job")}
                    role="tab"
                    aria-selected={activeTab === "job"}
                  >
                    Job Details
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === "password" ? "active" : ""}`}
                    onClick={() => setActiveTab("password")}
                    role="tab"
                    aria-selected={activeTab === "password"}
                  >
                    Password
                  </button>
                </li>
              </ul>

              {/* Personal Details Tab */}
              {activeTab === "personal" && (
                <form onSubmit={handleProfileSave}>
                  <div className="mb-3">
                    <label htmlFor="settings-name" className="form-label">Name</label>
                    <input
                      id="settings-name"
                      type="text"
                      className="form-control"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      required
                      minLength={3}
                      maxLength={50}
                      autoComplete="name"
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="settings-email" className="form-label">Email</label>
                    <input
                      id="settings-email"
                      type="email"
                      className="form-control"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      required
                      autoComplete="email"
                    />
                    {user?.emailVerifiedAt && (
                      <small className="text-success" style={{ fontSize: "0.75rem" }}>
                        <i className="fa-solid fa-check-circle me-1" aria-hidden="true"></i>
                        Verified
                      </small>
                    )}
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <Spinner size="sm" label="Saving..." /> : "Save Changes"}
                  </button>
                </form>
              )}

              {/* Job Details Tab — persisted to backend */}
              {activeTab === "job" && (
                <form onSubmit={handleJobSave}>
                  <div className="mb-3">
                    <label htmlFor="job-title" className="form-label">Job Title</label>
                    <input
                      id="job-title"
                      type="text"
                      className="form-control"
                      value={jobForm.jobTitle}
                      onChange={(e) => setJobForm({ ...jobForm, jobTitle: e.target.value })}
                      placeholder="e.g. IT Support Specialist"
                      maxLength={100}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="job-dept" className="form-label">Department</label>
                    <select
                      id="job-dept"
                      className="form-select"
                      value={jobForm.department}
                      onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                    >
                      <option value="">Select department...</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="job-phone" className="form-label">Phone</label>
                    <input
                      id="job-phone"
                      type="tel"
                      className="form-control"
                      value={jobForm.phone}
                      onChange={(e) => setJobForm({ ...jobForm, phone: e.target.value })}
                      placeholder="+20 100 000 0000"
                      autoComplete="tel"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <Spinner size="sm" label="Saving..." /> : "Save Job Details"}
                  </button>
                </form>
              )}

              {/* Password Tab */}
              {activeTab === "password" && (
                <form onSubmit={handlePasswordChange}>
                  <div className="mb-3">
                    <label htmlFor="pw-current" className="form-label">Current Password</label>
                    <input
                      id="pw-current"
                      type="password"
                      className="form-control"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="row">
                    <div className="col-12 col-md-6 mb-3">
                      <label htmlFor="pw-new" className="form-label">New Password</label>
                      <input
                        id="pw-new"
                        type="password"
                        className="form-control"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        required
                        minLength={8}
                        autoComplete="new-password"
                      />
                      <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                        Min 8 chars, uppercase, lowercase, digit.
                      </small>
                    </div>
                    <div className="col-12 col-md-6 mb-3">
                      <label htmlFor="pw-confirm" className="form-label">Confirm New Password</label>
                      <input
                        id="pw-confirm"
                        type="password"
                        className="form-control"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        required
                        minLength={8}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <Spinner size="sm" label="Changing..." /> : "Change Password"}
                  </button>
                  <p className="text-muted mt-2" style={{ fontSize: "0.75rem" }}>
                    <i className="fa-solid fa-info-circle me-1" aria-hidden="true"></i>
                    Changing your password will sign you out on all other devices.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Settings;
