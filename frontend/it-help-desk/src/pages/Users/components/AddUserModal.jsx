/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// AddUserModal — admin "add user" dialog with localized inline validation
// (noValidate on the form + JS checks — native browser tooltips are
// untranslatable browser chrome). Extracted from Users.jsx.
//
// NOTE: backend forces role to "user" — admin cannot create admins.
import { useI18n } from "../../../i18n";
import { Modal } from "../../../components/common/Modal";
import styles from "../Users.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Localized validation — returns the error message key result or "" when valid
const validateAddUserForm = (formData, t) => {
  const { name, email, password } = formData;
  if (!name.trim()) return t("errors.nameRequired");
  if (name.trim().length < 3) return t("errors.nameMinLength");
  if (!email.trim()) return t("errors.emailRequired");
  if (!EMAIL_RE.test(email.trim())) return t("errors.emailInvalid");
  if (!password) return t("errors.passwordRequired");
  if (password.length < 8) return t("errors.passwordMinLength");
  // Same policy as the backend: ≥1 letter + ≥1 digit
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return t("errors.passwordPolicy");
  return "";
};

export default function AddUserModal({ open, onClose, onSubmit, formData, setFormData, addError }) {
  const { t } = useI18n();

  const handleAddUser = (e) => {
    e.preventDefault();
    onSubmit(validateAddUserForm(formData, t));
  };

  return (
    <Modal open={open} onClose={onClose} title={t("users.addTitle")} size="sm">
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
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn btn-primary">{t("users.addUser")}</button>
        </div>
      </form>
    </Modal>
  );
}
