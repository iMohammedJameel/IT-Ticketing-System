/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// MFA panel — setup (QR + secret) → enable (code + recovery codes) → disable.
// QR is served by the backend as a self-hosted PNG data URL (qrDataUrl) — the
// third-party api.qrserver.com image was removed for privacy (fix-1 handoff).
// Every string runs through t(); copy buttons use the async clipboard API.
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { authService } from "../../../services/authService";
import Spinner from "../../../components/common/Spinner";
import { useI18n } from "../../../i18n";
import { tApiError } from "../../../i18n/apiErrors";
import styles from "./MfaPanel.module.css";

function MfaPanel() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [setupData, setSetupData] = useState(null); // { secret, otpauthUrl, qrDataUrl }
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const refreshStatus = () =>
    authService.mfaStatus().then((res) => setEnabled(!!res.data.mfaEnabled)).catch(() => {});
  useEffect(() => { refreshStatus(); }, []);

  // Clipboard helper — success/failure toasts are localized
  const copyToClipboard = async (text, ariaKey) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("common.copied"), { description: ariaKey ? t(ariaKey) : undefined });
    } catch {
      toast.error(t("common.copyFailed"));
    }
  };

  const startSetup = async () => {
    setBusy(true);
    try {
      const res = await authService.mfaSetup();
      setSetupData(res.data);
      setRecoveryCodes(null);
      setCode("");
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("errors.requestFailed"));
    } finally {
      setBusy(false);
    }
  };

  const enable = async () => {
    if (!code.trim()) return toast.error(t("settings.mfa.codeRequired"));
    setBusy(true);
    try {
      const res = await authService.mfaEnable(code.trim());
      setRecoveryCodes(res.data.recoveryCodes || []);
      setSetupData(null);
      setCode("");
      setEnabled(true);
      toast.success(t("settings.mfa.enabledToast"));
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("errors.mfaInvalidCode"));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!password) return toast.error(t("settings.mfa.pwRequired"));
    setBusy(true);
    try {
      await authService.mfaDisable(password);
      setEnabled(false);
      setPassword("");
      toast.success(t("settings.mfa.disabledToast"));
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("errors.requestFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="alert alert-info py-2" style={{ fontSize: "0.82rem" }}>
        <i className="fa-solid fa-shield-halved me-1" aria-hidden="true"></i>
        {t("settings.mfa.info")}
      </div>

      {enabled ? (
        <div>
          <p className="text-success mb-3">
            <i className="fa-solid fa-circle-check me-1" aria-hidden="true"></i>
            <strong>{t("settings.mfa.enabled")}</strong>
          </p>
          <label htmlFor="mfa-disable-pw" className="form-label">{t("settings.mfa.passwordLabel")}</label>
          <div className="d-flex gap-2">
            <input
              id="mfa-disable-pw"
              type="password"
              className="form-control"
              style={{ maxWidth: "260px" }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button className="btn btn-danger" onClick={disable} disabled={busy}>
              {busy ? <Spinner size="sm" label="" /> : t("settings.mfa.disable")}
            </button>
          </div>
        </div>
      ) : setupData ? (
        <div className="text-center">
          <p className="mb-2">{t("settings.mfa.step1")}</p>
          <img
            src={setupData.qrDataUrl}
            alt={t("settings.mfa.qrAlt")}
            width={200}
            height={200}
            className={`border rounded mb-2 ${styles.qrImg}`}
          />
          <div className={`d-inline-flex align-items-center gap-2 flex-wrap ${styles.manualSecret}`}>
            <span className="text-muted" style={{ fontSize: "0.78rem" }}>
              {t("settings.mfa.cantScan")}
            </span>
            <code className="user-select-all" dir="ltr">{setupData.secret}</code>
            <button
              type="button"
              className={`btn btn-sm btn-outline-secondary ${styles.copyBtn}`}
              onClick={() => copyToClipboard(setupData.secret, "settings.mfa.copySecret")}
              aria-label={t("settings.mfa.copySecret")}
            >
              <i className="fa-regular fa-copy" aria-hidden="true"></i> {t("common.copy")}
            </button>
            <button
              type="button"
              className={`btn btn-sm btn-outline-secondary ${styles.copyBtn}`}
              onClick={() => copyToClipboard(setupData.otpauthUrl, "settings.mfa.copyUrl")}
              aria-label={t("settings.mfa.copyUrl")}
            >
              <i className="fa-solid fa-link" aria-hidden="true"></i> {t("settings.mfa.copyUrl")}
            </button>
          </div>
          <p className="mb-2 mt-3">{t("settings.mfa.step2")}</p>
          <div className="d-flex justify-content-center gap-2 mb-3">
            <input
              type="text"
              className="form-control text-center"
              style={{ maxWidth: "160px", letterSpacing: "0.2em" }}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label={t("settings.mfa.codeRequired")}
            />
            <button className="btn btn-success" onClick={enable} disabled={busy}>
              {busy ? <Spinner size="sm" label="" /> : t("settings.mfa.verifyEnable")}
            </button>
          </div>
          <button className="btn btn-link p-0" onClick={() => setSetupData(null)}>
            {t("settings.mfa.cancel")}
          </button>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={startSetup} disabled={busy}>
          {busy ? <Spinner size="sm" label="" /> : (
            <>
              <i className="fa-solid fa-shield-halved me-1" aria-hidden="true"></i>
              {t("settings.mfa.enableBtn")}
            </>
          )}
        </button>
      )}

      {recoveryCodes && (
        <div className="alert alert-warning mt-3" role="status">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <strong>{t("settings.mfa.recoveryTitle")}</strong>
            <button
              type="button"
              className={`btn btn-sm btn-outline-secondary ${styles.copyBtn}`}
              onClick={() => copyToClipboard(recoveryCodes.join("\n"), "settings.mfa.copyAllCodes")}
              aria-label={t("settings.mfa.copyAllCodes")}
            >
              <i className="fa-regular fa-copy" aria-hidden="true"></i> {t("settings.mfa.copyAllCodes")}
            </button>
          </div>
          <div className="d-flex flex-wrap gap-2 mt-2">
            {recoveryCodes.map((c) => (
              <span key={c} className={`${styles.recoveryCode} d-inline-flex align-items-center gap-1`}>
                <code dir="ltr">{c}</code>
                <button
                  type="button"
                  className={`btn btn-sm ${styles.copyBtnSmall}`}
                  onClick={() => copyToClipboard(c, "settings.mfa.copyCode")}
                  aria-label={`${t("settings.mfa.copyCode")} ${c}`}
                >
                  <i className="fa-regular fa-copy" aria-hidden="true"></i>
                </button>
              </span>
            ))}
          </div>
          <p className="mb-0 mt-2" style={{ fontSize: "0.78rem" }}>
            {t("settings.mfa.recoveryHint")}
          </p>
        </div>
      )}
    </div>
  );
}

export default MfaPanel;
