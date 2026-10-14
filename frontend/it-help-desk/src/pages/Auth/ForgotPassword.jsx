/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Forgot password page — sends reset link to email.
// Fully localized (was 100% hardcoded English — BUG-qa2-4) and the success
// state keeps exactly ONE back-to-login link (BUG-qa2-9 duplicate removed).
// Copy is deliberately non-committal (no account enumeration — BUG-qa2-10).
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "../../services/authService";
import { useI18n } from "../../i18n";
import { tApiError } from "../../i18n/apiErrors";
import { usePageTitle } from "../../hooks";
import LangToggle from "../../components/common/LangToggle";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const { t, isRtl } = useI18n();
  usePageTitle(t("forgot.title"));

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Localized JS validation (no native browser tooltips — BUG-qa6-10)
    setError("");
    if (!email.trim()) {
      setError(t("errors.emailRequired"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("errors.emailInvalid"));
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
      toast.success(t("forgot.sent"));
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("errors.forgotFailed"));
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
        }}
      >
        <h2 style={{ color: "var(--primary)", marginBottom: "8px" }}>{t("forgot.title")}</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "24px", fontSize: "0.9rem" }}>
          {t("forgot.subtitle")}
        </p>

        {sent ? (
          <div
            className="alert alert-success"
            role="alert"
            style={{ marginBottom: "16px", display: "flex", alignItems: "flex-start", gap: "8px" }}
          >
            <i className="fa-solid fa-circle-check" aria-hidden="true" style={{ marginTop: "3px" }}></i>
            <span>{t("forgot.sent")}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                {t("forgot.email")}
              </label>
              <input
                id="email"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
                placeholder={t("forgot.emailPlaceholder")}
              />
            </div>

            {error && (
              <p dir="auto" style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: "-10px", marginBottom: "14px" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading || !email}
            >
              {loading ? t("forgot.sending") : t("forgot.submit")}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <Link to="/login" style={{ fontSize: "0.875rem" }}>
            {isRtl ? "\u2192" : "\u2190"} {t("forgot.backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
