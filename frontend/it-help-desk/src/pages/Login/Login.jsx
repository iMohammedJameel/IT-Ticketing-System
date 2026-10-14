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
import LangToggle from "../../components/common/LangToggle";

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
   ════════════════════════════════════════════════════════════════════ */

/* ── Inline SVG icons (outline style, inherit currentColor) ── */
const UserIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LockIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ShieldIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const EyeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
    <path d="m2 2 20 20" />
  </svg>
);

/* Directional arrow — flips to flow with RTL via CSS */
const ArrowIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

/* ── Jameel brand mark — used on the AR DOM brand bar and mobile header.
   (The EN desktop brand is pixel-baked inside the background asset.) ── */
const JameelLogo = ({ className }) => (
  <svg className={className} viewBox="0 0 72 88" fill="none" aria-hidden="true">
    {/* gold pyramid cap (Giza) with inner ridge */}
    <path d="M36 2 L48 18 H24 Z" fill="#C38C48" />
    <path d="M36 2 L36 18" stroke="#A87638" strokeWidth="1.3" />
    {/* headset band arcing from the ear cup up toward the pyramid */}
    <path d="M14.5 40 C14.5 28 22 21 33 20.5" stroke="#0B1F3C" strokeWidth="4" strokeLinecap="round" fill="none" />
    {/* ear cup */}
    <rect x="9" y="38" width="11" height="17" rx="5.5" fill="#0B1F3C" />
    {/* mic boom curling to a gold tip */}
    <path d="M20 52 C22 58 27 61 32.5 61" stroke="#0B1F3C" strokeWidth="3" strokeLinecap="round" fill="none" />
    <circle cx="34.5" cy="61" r="2.6" fill="#C6985C" />
    {/* bold J: top arm + stem + round hook */}
    <path d="M22 30 H50 V56 A13 13 0 0 1 24 57" stroke="#0B1F3C" strokeWidth="8.5" strokeLinecap="round" fill="none" />
    {/* white circuit traces + nodes inside the J stem */}
    <path d="M37 40 V48 M37 44 H44" stroke="#F2F6FB" strokeWidth="2" strokeLinecap="round" />
    <circle cx="37" cy="40" r="2" fill="#F2F6FB" />
    <circle cx="37" cy="48" r="2" fill="#F2F6FB" />
    <circle cx="44" cy="44" r="2" fill="#F2F6FB" />
  </svg>
);

/* ── Solid shield (data-safe footer — solid fill like the reference) ── */
const SolidShield = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#2563EB" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

/* ── Eye of Horus (faint watermark glyph inside the panel) ── */
const EyeOfHorus = ({ className }) => (
  <svg className={className} viewBox="0 0 120 74" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 38 C28 18 92 18 110 38 C92 58 28 58 10 38 Z" />
    <circle cx="60" cy="38" r="10" />
    <path d="M18 18 C40 6 80 6 102 18" />
    <path d="M42 54 L34 70" />
    <path d="M74 54 C78 66 74 72 66 74" />
    <path d="M86 52 L96 66" />
  </svg>
);

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
    // Role-aware landing: admins → dashboard, agents → queue, users → home
    if (user.role === "admin") navigate("/dashboard");
    else if (user.role === "agent") navigate("/queue");
    else navigate("/home");
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
