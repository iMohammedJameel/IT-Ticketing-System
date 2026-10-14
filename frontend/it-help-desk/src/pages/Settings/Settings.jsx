/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Settings page — multipart avatar upload (no more base64 in the DB),
// MFA (TOTP) security tab, admin management tabs (canned responses,
// companies), notification preferences, sonner toasts, accessible forms.
// Large admin panels live in ./panels/ — one file per panel.
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n";
import { tApiError } from "../../i18n/apiErrors";
import { usePageTitle } from "../../hooks";
import { authService } from "../../services/authService";
import Spinner from "../../components/common/Spinner";
import PasswordStrength from "../../components/common/PasswordStrength";
import MfaPanel from "./panels/MfaPanel";
import CannedResponsesPanel from "./panels/CannedResponsesPanel";
import CompaniesPanel from "./panels/CompaniesPanel";
import styles from "./Settings.module.css";

const DEPARTMENTS = ["IT", "HR", "Sales", "Support", "Finance", "Operations", "Marketing"];

function Settings() {
  const { user, updateUser, isAdmin, isStaff } = useAuth();
  const { t } = useI18n();
  usePageTitle(t("nav.settings"));
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
  // Profile image — MULTIPART upload via /auth/avatar (the old base64
  // endpoint bloated the user document; files now live in storage).
  // ---------------------------------------------------------------------
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("settings.imageTooLarge"));
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error(t("settings.imageOnly"));
      return;
    }

    setPreviewImage(URL.createObjectURL(file));
    setUploadingImage(true);
    try {
      const res = await authService.uploadAvatar(file);
      updateUser(res.data.user);
      toast.success(t("settings.imageUpdated"));
      setPreviewImage(null);
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("settings.imageUpdateFailed"));
      setPreviewImage(null);
    } finally {
      setUploadingImage(false);
    }
  };

  // ---------------------------------------------------------------------
  // Update profile (name/email)
  // ---------------------------------------------------------------------
  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (profileForm.name === user?.name && profileForm.email === user?.email) {
      toast.info(t("settings.noChanges"));
      return;
    }
    setLoading(true);
    try {
      const res = await authService.updateProfile(profileForm);
      updateUser(res.data.user);
      toast.success(t("settings.profileUpdated"));
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("settings.profileUpdateFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------
  // Change password — FE toasts + backend errors localized via t()/tApiError
  // ("Current password is incorrect", Joi password policy, ...)
  // ---------------------------------------------------------------------
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t("settings.pwFillAll"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("settings.pwMismatch"));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t("settings.pwTooShort"));
      return;
    }
    // Aligned with the backend policy: ≥1 letter + ≥1 digit
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error(t("errors.passwordPolicy"));
      return;
    }
    if (currentPassword === newPassword) {
      toast.error(t("settings.pwMustDiffer"));
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      toast.success(t("settings.pwChanged"));
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("errors.requestFailed"));
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
      toast.success(t("settings.jobSaved"));
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("settings.jobSaveFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------
  // Notification preferences (saved as part of profile)
  // ---------------------------------------------------------------------
  const handleNotifPrefChange = (key) => async (e) => {
    const checked = e.target.checked;
    const newPrefs = { ...notifPrefs, [key]: checked };
    setNotifPrefs(newPrefs);
    try {
      const res = await authService.updateProfile({ notificationPrefs: newPrefs });
      updateUser(res.data.user);
      toast.success(t("settings.notifUpdated"));
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("settings.notifUpdateFailed"));
      // Revert ONLY this key (functional update) — restoring the whole
      // snapshot could clobber another toggle that succeeded meanwhile.
      setNotifPrefs((prev) => ({ ...prev, [key]: !checked }));
    }
  };

  const handleResendVerification = async () => {
    try {
      await authService.resendVerification();
      toast.success(t("settings.resendSent"));
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("settings.resendFailed"));
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
            <span className="fs-5 fw-semibold">{t("nav.settings")}</span>
          </div>
        </div>

        <div className="row">
          {/* Left column — profile card */}
          <div className="col-12 col-lg-4 mb-4">
            <div className={`${styles.card} mb-4`}>
              <div className={`${styles.profileSection} text-center`}>
                <div className={styles.avatarWrapper}>
                  <div className={styles.avatarLarge}>
                    {profileImageSrc ? (
                      <img
                        src={profileImageSrc}
                        alt={t("settings.profileAlt")}
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
                  </div>
                  <label htmlFor="imageUpload" className={styles.cameraBtn} aria-label={t("settings.uploadImageAria")}>
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
                <h6 className={styles.profileName}>{user?.name || t("settings.yourName")}</h6>
                <p className={styles.profileRole}>
                  {isAdmin ? t("role.admin") : isStaff ? t("role.agent") : t("role.user")}
                </p>
                {user && !user.emailVerifiedAt && (
                  <div className="alert alert-warning mt-3 py-2" style={{ fontSize: "0.8rem" }}>
                    <i className="fa-solid fa-triangle-exclamation me-1" aria-hidden="true"></i>
                    {t("settings.emailNotVerified")}
                    <button
                      type="button"
                      className="btn btn-sm btn-link p-0 ms-2"
                      onClick={handleResendVerification}
                    >
                      {t("settings.resend")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Notification preferences */}
            <div className={styles.card}>
              <h6 className={styles.cardTitle}>{t("settings.notifTitle")}</h6>
              <div className={styles.notifPrefs}>
                {[
                  { key: "ticketCreated", label: t("settings.notif.ticketCreated") },
                  { key: "ticketAssigned", label: t("settings.notif.ticketAssigned") },
                  { key: "ticketStatusChanged", label: t("settings.notif.ticketStatusChanged") },
                  { key: "ticketCommented", label: t("settings.notif.ticketCommented") },
                  { key: "slaBreaching", label: t("settings.notif.slaBreaching") },
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
                    {t("settings.tabs.personal")}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === "job" ? "active" : ""}`}
                    onClick={() => setActiveTab("job")}
                    role="tab"
                    aria-selected={activeTab === "job"}
                  >
                    {t("settings.tabs.job")}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === "password" ? "active" : ""}`}
                    onClick={() => setActiveTab("password")}
                    role="tab"
                    aria-selected={activeTab === "password"}
                  >
                    {t("settings.tabs.password")}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === "security" ? "active" : ""}`}
                    onClick={() => setActiveTab("security")}
                    role="tab"
                    aria-selected={activeTab === "security"}
                  >
                    {t("settings.tabs.security")}
                  </button>
                </li>
                {isAdmin && (
                  <>
                    <li className="nav-item" role="presentation">
                      <button
                        className={`nav-link ${activeTab === "canned" ? "active" : ""}`}
                        onClick={() => setActiveTab("canned")}
                        role="tab"
                        aria-selected={activeTab === "canned"}
                      >
                        {t("settings.tabs.canned")}
                      </button>
                    </li>
                    <li className="nav-item" role="presentation">
                      <button
                        className={`nav-link ${activeTab === "companies" ? "active" : ""}`}
                        onClick={() => setActiveTab("companies")}
                        role="tab"
                        aria-selected={activeTab === "companies"}
                      >
                        {t("settings.tabs.companies")}
                      </button>
                    </li>
                  </>
                )}
              </ul>

              {/* Personal Details Tab */}
              {activeTab === "personal" && (
                <form onSubmit={handleProfileSave}>
                  <div className="mb-3">
                    <label htmlFor="settings-name" className="form-label">{t("settings.name")}</label>
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
                    <label htmlFor="settings-email" className="form-label">{t("settings.email")}</label>
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
                        {t("settings.verified")}
                      </small>
                    )}
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <Spinner size="sm" label={t("settings.saving")} /> : t("settings.saveChanges")}
                  </button>
                </form>
              )}

              {/* Job Details Tab — persisted to backend */}
              {activeTab === "job" && (
                <form onSubmit={handleJobSave}>
                  <div className="mb-3">
                    <label htmlFor="job-title" className="form-label">{t("settings.jobTitleLabel")}</label>
                    <input
                      id="job-title"
                      type="text"
                      className="form-control"
                      value={jobForm.jobTitle}
                      onChange={(e) => setJobForm({ ...jobForm, jobTitle: e.target.value })}
                      placeholder={t("settings.jobTitlePh")}
                      maxLength={100}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="job-dept" className="form-label">{t("settings.department")}</label>
                    <select
                      id="job-dept"
                      className="form-select"
                      value={jobForm.department}
                      onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                    >
                      <option value="">{t("settings.selectDepartment")}</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="job-phone" className="form-label">{t("settings.phone")}</label>
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
                    {loading ? <Spinner size="sm" label={t("settings.saving")} /> : t("settings.saveJob")}
                  </button>
                </form>
              )}

              {/* Password Tab */}
              {activeTab === "password" && (
                <form onSubmit={handlePasswordChange}>
                  <div className="mb-3">
                    <label htmlFor="pw-current" className="form-label">{t("settings.currentPassword")}</label>
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
                      <label htmlFor="pw-new" className="form-label">{t("settings.newPassword")}</label>
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
                        {t("settings.pwHint")}
                      </small>
                      <PasswordStrength password={passwordForm.newPassword} />
                    </div>
                    <div className="col-12 col-md-6 mb-3">
                      <label htmlFor="pw-confirm" className="form-label">{t("settings.confirmPassword")}</label>
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
                      <PasswordStrength password={passwordForm.confirmPassword} />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <Spinner size="sm" label={t("settings.changing")} /> : t("settings.changePassword")}
                  </button>
                  <p className="text-muted mt-2" style={{ fontSize: "0.75rem" }}>
                    <i className="fa-solid fa-info-circle me-1" aria-hidden="true"></i>
                    {t("settings.pwSignoutNote")}
                  </p>
                </form>
              )}
              {/* Security (MFA) Tab */}
              {activeTab === "security" && <MfaPanel />}

              {/* Admin: canned responses */}
              {activeTab === "canned" && isAdmin && <CannedResponsesPanel />}

              {/* Admin: company directory */}
              {activeTab === "companies" && isAdmin && <CompaniesPanel />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Settings;
