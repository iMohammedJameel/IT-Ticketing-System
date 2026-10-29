/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// ConfirmPasswordModal — re-auth verification before destructive actions
// (suspend / delete). Extracted from Users.jsx.
import { useI18n } from "../../../i18n";
import { Modal } from "../../../components/common/Modal";

export default function ConfirmPasswordModal({
  open,
  onClose,
  onConfirm,
  pendingAction,
  confirmPassword,
  setConfirmPassword,
  verifying,
}) {
  const { t } = useI18n();

  return (
    <Modal open={open} onClose={onClose} title={t("users.confirmTitle")} size="sm">
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
          onKeyDown={(e) => { if (e.key === "Enter") onConfirm(); }}
          autoFocus
          autoComplete="current-password"
        />
      </div>
      <div className="d-flex gap-2 justify-content-end">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onClose}
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          className={`btn ${pendingAction?.type === "delete" ? "btn-danger" : "btn-warning"}`}
          onClick={onConfirm}
          disabled={verifying || !confirmPassword}
        >
          {verifying ? t("users.verifying") : t("users.confirm")}
        </button>
      </div>
    </Modal>
  );
}
