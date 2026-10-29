/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// PasswordTab — change-password form with strength meters. Extracted from
// Settings.jsx. Validation runs in the parent (localized toasts via t()).
import { useI18n } from "../../../i18n";
import Spinner from "../../../components/common/Spinner";
import PasswordStrength from "../../../components/common/PasswordStrength";

export default function PasswordTab({ passwordForm, setPasswordForm, loading, onSave }) {
  const { t } = useI18n();

  return (
    <form onSubmit={onSave}>
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
  );
}
