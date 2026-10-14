/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Reset password page — called from email link with token.
// Fully localized (was hardcoded English — BUG-qa2-4). FE-side validation
// and backend errors flow through t()/tApiError so Arabic users get Arabic.
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "../../services/authService";
import { useI18n } from "../../i18n";
import { tApiError } from "../../i18n/apiErrors";
import { usePageTitle } from "../../hooks";
import LangToggle from "../../components/common/LangToggle";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const { t, isRtl } = useI18n();
  usePageTitle(t("reset.title"));

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Localized JS validation (no native browser tooltips — BUG-qa6-10),
    // aligned with the backend policy (min 8 + ≥1 letter + ≥1 digit).
    setError("");
    if (!password || !confirm) {
      setError(t("errors.fillAllFields"));
      return;
    }
    if (password.length < 8) {
      setError(t("errors.passwordMinLength"));
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError(t("errors.passwordPolicy"));
      return;
    }
    if (password !== confirm) {
      setError(t("errors.passwordsDoNotMatch"));
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword({ token, newPassword: password });
      toast.success(t("reset.success"));
      navigate("/login");
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("errors.resetFailed"));
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
        <h2 style={{ color: "var(--primary)", marginBottom: "8px" }}>{t("reset.title")}</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "24px", fontSize: "0.9rem" }}>
          {t("reset.subtitle")}
        </p>

        {!token ? (
          // dir="auto" + overflow-wrap (BUG-qa6-27): the old copy wrapped
          // badly in the narrow alert, isolating the trailing "reset" word
          // on its own line. The reworded copy wraps naturally; these two
          // properties are the safety net for any locale/width combo.
          <div
            className="alert alert-danger"
            role="alert"
            dir="auto"
            style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
          >
            {t("reset.invalidLink")}
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                {t("reset.newPassword")}
              </label>
              <input
                id="password"
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
                autoComplete="new-password"
              />
              <small style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                {t("reset.passwordHint")}
              </small>
            </div>
            <div className="mb-3">
              <label htmlFor="confirm" className="form-label">
                {t("reset.confirmPassword")}
              </label>
              <input
                id="confirm"
                type="password"
                className="form-control"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={loading}
                minLength={8}
                autoComplete="new-password"
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
              disabled={loading || !password || !confirm}
            >
              {loading ? t("reset.submitting") : t("reset.submit")}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <Link to="/login" style={{ fontSize: "0.875rem" }}>
            {isRtl ? "\u2192" : "\u2190"} {t("reset.backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
