/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Dismissible amber banner for unverified users — mounted once in the
// Dashboard shell (above the routed content). Offers a one-click resend of
// the verification email via POST /auth/resend-verification.
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n";
import { tApiError } from "../../i18n/apiErrors";
import { authService } from "../../services/authService";
import Spinner from "./Spinner";
import styles from "./VerifyBanner.module.css";

function VerifyBanner() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  // The auth profile carries emailVerifiedAt (null until the user clicks the
  // emailed link) — the FE equivalent of user.isVerified === false.
  const unverified = !!user && !user.emailVerifiedAt;

  const resend = async () => {
    setSending(true);
    try {
      await authService.resendVerification();
      toast.success(t("verify.banner.sent"));
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("errors.verifyFailed"));
    } finally {
      setSending(false);
    }
  };

  if (dismissed || !unverified) return null;

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <i className="fa-solid fa-envelope-circle-check" aria-hidden="true"></i>
      <p className={styles.message}>{t("verify.banner.message")}</p>
      <button
        type="button"
        className={styles.resendBtn}
        onClick={resend}
        disabled={sending}
      >
        {sending ? (
          <Spinner size="sm" label="" />
        ) : (
          <i className="fa-solid fa-rotate-right me-1" aria-hidden="true"></i>
        )}
        {sending ? t("verify.banner.sending") : t("verify.banner.resend")}
      </button>
      <button
        type="button"
        className={styles.dismissBtn}
        onClick={() => setDismissed(true)}
        aria-label={t("verify.banner.dismiss")}
      >
        <i className="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </div>
  );
}

export default VerifyBanner;
