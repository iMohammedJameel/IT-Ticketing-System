/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Login.module.css";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n";
import { tApiError } from "../../i18n/apiErrors";
import { usePageTitle } from "../../hooks";
import { authService } from "../../services/authService";
import { getRoleLanding } from "../../utils/roleLanding";
import LangToggle from "../../components/common/LangToggle";
import {
  UserIcon,
  LockIcon,
  ShieldIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowIcon,
  JameelLogo,
  SolidShield,
  EyeOfHorus,
} from "./LoginIcons";

/* ════════════════════════════════════════════════════════════════════
   LOGIN — pixel-true rebuild of the reference design
   "Jameel IT Support: Egyptian Login Elegance" (1536×1024 mockup).

   The composition (Cairo desk-scene photo, navy canvas, corner wedge,
   brand block, gold skyline, band circuits, chamfer band with its gold
   edge — and even the panel's soft baked shadow) ships as ONE asset
   cut directly from the reference mockup itself:
     · public/assets/login-bg-en.webp (reference minus the panel)

   UNIFIED DESIGN (client rule v2): ONE asset for BOTH languages — the
   Arabic page now uses the exact same composition as the English one
   (same orientation, same brand lockup baked in the art, same layout).
   Only the white panel is live DOM, and ITS text switches AR/EN via i18n.
   The panel is positioned in pure % so it lands EXACTLY on the asset's
   panel hole at any viewport (stretch mapping, 1:1 with the background).
   SVG icon components live in ./LoginIcons.jsx.
   ════════════════════════════════════════════════════════════════════ */

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  // Checked by default — the reference design shows a FILLED checkbox
  // (navy fill + white checkmark, verified at 8x zoom).
  const [remember, setRemember] = useState(true);
  // MFA step — set when the backend replies 401 with code mfa_required
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const navigate = useNavigate();
  const { login: setAuthLogin } = useAuth();
  const { t, isRtl } = useI18n();
  usePageTitle(t("login.welcomeBack"));

  const finishLogin = (dataObj) => {
    const token = dataObj?.token;
    const refreshToken = dataObj?.refreshToken;
    const user = dataObj?.user;
    // "Remember me" unchecked → session-only storage (cleared on tab close)
    setAuthLogin(token, refreshToken, user, { persistent: remember });
    // Role-aware landing — shared helper (also used by the shell routes)
    navigate(getRoleLanding(user));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    // JS validation instead of native browser bubbles (BUG-qa6-10): the
    // native tooltip is untranslatable browser chrome. Inputs keep their
    // `required` attributes for a11y — noValidate only suppresses the UI.
    if (mfaStep) {
      if (!mfaToken.trim()) {
        setError(t("settings.mfa.codeRequired"));
        return;
      }
    } else {
      if (!email.trim()) {
        setError(t("errors.emailRequired"));
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError(t("errors.emailInvalid"));
        return;
      }
      if (!password) {
        setError(t("errors.passwordRequired"));
        return;
      }
    }
    setLoading(true);
    try {
      const res = await authService.login({
        email,
        password,
        ...(mfaStep && mfaToken ? { mfaToken: mfaToken.trim() } : {}),
      });

      const dataObj = res?.data?.data || res?.data || res;
      const token = dataObj?.token || res?.token;
      const user = dataObj?.user || res?.user;

      if (!token || !user) {
        throw new Error(res?.message || res?.data?.message || "Login response missing token or user");
      }

      finishLogin({ token, refreshToken: dataObj?.refreshToken, user });
    } catch (err) {
      const msg = err.message || err.response?.data?.msg || err.response?.data?.error?.message;
      const details = err.details || err.response?.data?.error?.details;
      // MFA challenge → show the 2nd factor input instead of a scary error
      const isMfaRequired =
        (Array.isArray(details) && details.some((d) => d?.code === "mfa_required")) ||
        /mfa verification required/i.test(String(msg));
      if (isMfaRequired) {
        setMfaStep(true);
        setError("");
      } else {
        // Localize known backend messages ("Invalid credentials", lockout,
        // rate limits...) — unknown messages pass through untouched.
        setError(tApiError(msg, t) || t("errors.invalidCredentials"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      {/* Ghost language switch — blends into the navy corner */}
      <LangToggle variant="ghost" />

      {/* ═══ THE COMPOSITION — cut pixel-exact from the reference ═══
          photo · navy canvas · wedge · brand · band · skyline · circuits
          · glyphs · stripes · chamfer band + gold edge + baked shadow.
          ONE unified asset for BOTH languages — the Arabic page uses the
          exact same composition as the English one (never mirrored); only
          the form panel's live DOM text switches AR/EN below. */}
      <img
        src="/assets/login-bg-en.webp"
        alt=""
        draggable={false}
        className={styles.bgArt}
      />

      {/* compact brand — ONLY visible when the composition is hidden (mobile);
           wordmark stays English in both locales (client rule) */}
      <div className={styles.mobileBrand}>
        <JameelLogo className={styles.mobileLogoMark} />
        <span className={styles.mobileBrandName}>Jameel</span>
      </div>

      {/* ═══ the white panel — live DOM, lands exactly on the asset's hole ═══ */}
      <div className={styles.panel}>
        <div className={styles.panelInner}>
          {/* faint Eye of Horus watermark near the chamfer, as in the reference */}
          <EyeOfHorus className={styles.panelWatermark} />

          <h2 className={styles.loginTitle}>
            {mfaStep ? t("login.mfaTitle") : t("login.welcomeBack")}
          </h2>
          <span className={styles.goldUnderline} aria-hidden="true" />
          <p className={styles.loginSubtitle}>
            {mfaStep ? t("login.mfaSubtitle") : t("login.signInSubtitle")}
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {!mfaStep && (
              <>
                {/* Username / Email — icon inside, no visible label (design) */}
                <div className={styles.loginField}>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}><UserIcon /></span>
                    <input
                      type="email"
                      placeholder={t("login.usernameOrEmail")}
                      aria-label={t("login.usernameOrEmail")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className={styles.loginField}>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}><LockIcon /></span>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={t("login.password")}
                      aria-label={t("login.password")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyUp={(e) => setCapsLockOn(e.getModifierState?.("CapsLock") ?? false)}
                      onBlur={() => setCapsLockOn(false)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                    >
                      {showPassword ? <EyeIcon /> : <EyeOffIcon />}
                    </button>
                  </div>
                  {capsLockOn && (
                    <small className={styles.capsLock}>
                      <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                      {t("login.capsLock")}
                    </small>
                  )}
                </div>

                {/* Remember me + Forgot password */}
                <div className={styles.loginOptions}>
                  <label className={styles.rememberLabel}>
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    {t("login.rememberMe")}
                  </label>
                  <Link to="/forgot-password" className={styles.forgotLink}>
                    {t("login.forgot")}
                  </Link>
                </div>
              </>
            )}

            {/* MFA token step */}
            {mfaStep && (
              <div className={styles.loginField}>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}><ShieldIcon /></span>
                  <input
                    type="text"
                    inputMode="text"
                    autoComplete="one-time-code"
                    placeholder={t("login.mfaPlaceholder")}
                    aria-label={t("login.mfaTitle")}
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <button
                  type="button"
                  className={styles.backLink}
                  onClick={() => { setMfaStep(false); setMfaToken(""); setError(""); }}
                >
                  {isRtl ? "\u2192" : "\u2190"} {t("login.back")}
                </button>
              </div>
            )}

            {error && <p className={styles.errorMsg} role="alert">{error}</p>}

            {/* Sign In — arrow leads the label, as in the reference */}
            <button type="submit" className={styles.loginBtn} disabled={loading}>
              {!loading && <ArrowIcon className={styles.btnArrow} />}
              {loading
                ? mfaStep ? t("login.verifying") : t("login.signingIn")
                : mfaStep ? t("login.verify") : t("login.signIn")}
            </button>
          </form>

          {/* trust footer */}
          <p className={styles.dataSafe}>
            <SolidShield className={styles.dataSafeIcon} />
            {t("login.dataSafe")}
          </p>
        </div>
      </div>

      {/* register CTA — mobile only (the reference design has none on desktop) */}
      {!mfaStep && (
        <p className={styles.registerBelow}>
          {t("login.noAccount")}{" "}
          <Link to="/register">{t("login.register")}</Link>
        </p>
      )}

    </div>
  );
}

export default Login;
