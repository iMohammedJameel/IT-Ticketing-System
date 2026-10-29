/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Settings page — tabbed settings hub. The page keeps state + API
// orchestration only; every visual unit lives in ./panels/ (one file per
// panel — the pattern already used by MfaPanel / CannedResponsesPanel /
// CompaniesPanel):
//   panels/ProfileCard.jsx        — avatar upload + verification alert
//   panels/NotificationPrefs.jsx   — notification switches (optimistic PATCH)
//   panels/SettingsTabs.jsx        — tab bar (admin tabs included)
//   panels/PersonalTab.jsx         — name / email form
//   panels/JobTab.jsx              — job details form
//   panels/PasswordTab.jsx         — change-password form
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n";
import { tApiError } from "../../i18n/apiErrors";
import { usePageTitle } from "../../hooks";
import { authService } from "../../services/authService";

import ProfileCard from "./panels/ProfileCard";
import NotificationPrefs from "./panels/NotificationPrefs";
import SettingsTabs from "./panels/SettingsTabs";
import PersonalTab from "./panels/PersonalTab";
import JobTab from "./panels/JobTab";
import PasswordTab from "./panels/PasswordTab";
import MfaPanel from "./panels/MfaPanel";
import CannedResponsesPanel from "./panels/CannedResponsesPanel";
import CompaniesPanel from "./panels/CompaniesPanel";
import styles from "./Settings.module.css";

function Settings() {
  const { user, updateUser, isAdmin } = useAuth();
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
          {/* Left column — profile card + notification preferences */}
          <div className="col-12 col-lg-4 mb-4">
            <ProfileCard />
            <NotificationPrefs notifPrefs={notifPrefs} setNotifPrefs={setNotifPrefs} />
          </div>

          {/* Right column */}
          <div className="col-12 col-lg-8">
            <div className={styles.card}>
              <SettingsTabs activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} />

              {activeTab === "personal" && (
                <PersonalTab
                  profileForm={profileForm}
                  setProfileForm={setProfileForm}
                  user={user}
                  loading={loading}
                  onSave={handleProfileSave}
                />
              )}

              {activeTab === "job" && (
                <JobTab jobForm={jobForm} setJobForm={setJobForm} loading={loading} onSave={handleJobSave} />
              )}

              {activeTab === "password" && (
                <PasswordTab
                  passwordForm={passwordForm}
                  setPasswordForm={setPasswordForm}
                  loading={loading}
                  onSave={handlePasswordChange}
                />
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
