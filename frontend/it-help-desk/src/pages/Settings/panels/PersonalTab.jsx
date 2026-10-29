/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// PersonalTab — personal details form (name / email). Extracted from Settings.jsx.
import { useI18n } from "../../../i18n";
import Spinner from "../../../components/common/Spinner";

export default function PersonalTab({ profileForm, setProfileForm, user, loading, onSave }) {
  const { t } = useI18n();

  return (
    <form onSubmit={onSave}>
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
  );
}
