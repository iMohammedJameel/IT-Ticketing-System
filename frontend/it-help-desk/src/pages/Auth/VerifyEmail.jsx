/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Verify email page — called from email link.
// Fully localized (was hardcoded English — BUG-qa2-4). The invalid-link copy
// carries NO trailing period: under RTL the trailing "." of a Latin run
// visually migrated to the START of the line (".Invalid verification link"
// — BUG-qa6-26). Localized strings + a bidi-isolated paragraph fix it.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "../../services/authService";
import { useI18n } from "../../i18n";
import { tApiError } from "../../i18n/apiErrors";
import { usePageTitle } from "../../hooks";
import LangToggle from "../../components/common/LangToggle";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const { t } = useI18n();
  usePageTitle(t("verify.title"));

  const handleVerify = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await authService.verifyEmail(token);
      setVerified(true);
      toast.success(t("verify.verified"));
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("errors.verifyFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--bg-page)",
      }}
    >
      {/* Floating language pill — auth pages have no navbar (BUG-qa2-3) */}
      <LangToggle />

      <div
        style={{
          maxWidth: "440px",
          width: "100%",
          padding: "32px",
          background: "var(--bg-card)",
          borderRadius: "16px",
          boxShadow: "var(--shadow-md)",
          textAlign: "center",
        }}
      >
        <h2 style={{ color: "var(--primary)", marginBottom: "8px" }}>{t("verify.title")}</h2>

        {verified ? (
          <>
            <div style={{ fontSize: "3rem", margin: "16px 0", color: "var(--success)" }}>
              <i className="fa-solid fa-circle-check" aria-hidden="true"></i>
            </div>
            <p style={{ color: "var(--success)", marginBottom: "20px" }}>{t("verify.verified")}</p>
            <Link to="/login" className="btn btn-primary">
              {t("verify.continueToLogin")}
            </Link>
          </>
        ) : token ? (
          <>
            <p style={{ color: "var(--text-muted)", marginBottom: "20px" }}>{t("verify.hint")}</p>
            <button
              className="btn btn-primary w-100"
              onClick={handleVerify}
              disabled={loading}
            >
              {loading ? t("verify.submitting") : t("verify.submit")}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: "3rem", margin: "16px 0" }}>
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" style={{ color: "var(--danger)" }}></i>
            </div>
            {/* dir="auto" isolates the bidi run so punctuation can't flip */}
            <p dir="auto" style={{ color: "var(--danger)", marginBottom: "20px" }}>
              {t("verify.invalidLink")}
            </p>
            <Link to="/login" className="btn btn-outline-primary">
              {t("verify.backToLogin")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
