/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Register.module.css";
import { authService } from "../../services/authService";
import { useI18n } from "../../i18n";
import { tApiError } from "../../i18n/apiErrors";
import { usePageTitle } from "../../hooks";
import LangToggle from "../../components/common/LangToggle";
import AuthSidePanel from "../../components/auth/AuthSidePanel";
import PasswordStrength from "../../components/common/PasswordStrength";

// SVG Icons inline
const TicketIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
    <path d="M13 5v2M13 17v2M13 11v2"/>
  </svg>
);

const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="5"/>
    <path d="M20 21a8 8 0 1 0-16 0"/>
  </svg>
);

const EmailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/>
    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/>
    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/>
    <path d="m2 2 20 20"/>
  </svg>
);

const Register = () => {
  const [formData, setFormData] = useState({ userName: "", email: "", password: "", confirmPassword: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();
  usePageTitle(t("register.title"));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { userName, email, password, confirmPassword } = formData;
    // FE-side validation — localized, aligned with the backend policy
    // (min 8 chars + ≥1 letter + ≥1 digit). noValidate keeps the browser's
    // untranslatable native tooltips out of the picture (BUG-qa6-11).
    if (!userName || !email || !password || !confirmPassword) return setErrorMessage(t("errors.fillAllFields"));
    if (userName.trim().length < 3) return setErrorMessage(t("errors.nameMinLength"));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErrorMessage(t("errors.emailInvalid"));
    if (password.length < 8) return setErrorMessage(t("errors.passwordMinLength"));
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return setErrorMessage(t("errors.passwordPolicy"));
    if (password !== confirmPassword) return setErrorMessage(t("errors.passwordsDoNotMatch"));

    setLoading(true);
    try {
      await authService.register({ name: userName, email, password });
      setErrorMessage("");
      setSuccessMessage(t("errors.registerSuccess"));
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      const msg = err.message || err.response?.data?.msg || err.response?.data?.error?.message;
      // Known backend messages localized via the map; unknown pass through
      setErrorMessage(tApiError(msg, t) || t("errors.registerFailed"));
      setSuccessMessage("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.registerPage}>
      {/* Floating language pill — auth pages have no navbar (BUG-qa2-3) */}
      <LangToggle />

      <div className={styles.registerCard}>

        {/* ─── LEFT: Form Side ─── */}
        <div className={styles.registerFormSide}>

          {/* Logo */}
          <div className={styles.logoArea}>
            <div className={styles.logoIcon}><TicketIcon /></div>
            <span className={styles.logoText}>{t("auth.brand")}</span>
          </div>

          <h2 className={styles.registerTitle}>{t("register.title")}</h2>
          <p className={styles.registerSubtitle}>{t("register.subtitle")}</p>

          <form onSubmit={handleSubmit} noValidate>

            {/* Full Name */}
            <div className={styles.registerField}>
              <label>{t("register.fullName")}<span className={styles.required}>*</span></label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}><UserIcon /></span>
                <input
                  type="text"
                  placeholder={t("register.namePlaceholder")}
                  name="userName"
                  value={formData.userName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className={styles.registerField}>
              <label>{t("login.email")}<span className={styles.required}>*</span></label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}><EmailIcon /></span>
                <input
                  type="email"
                  placeholder="you@company.com"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className={styles.registerField}>
              <label>{t("login.password")}<span className={styles.required}>*</span></label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}><LockIcon /></span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <PasswordStrength password={formData.password} />
              <p className={styles.pwHint}>{t("register.pwHint")}</p>
            </div>

            {/* Confirm Password */}
            <div className={styles.registerField}>
              <label>{t("register.confirmPassword")}<span className={styles.required}>*</span></label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}><LockIcon /></span>
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <PasswordStrength password={formData.confirmPassword} />
            </div>

            {errorMessage && <p className={styles.errorMsg}>{errorMessage}</p>}
            {successMessage && <p className={styles.successMsg}>{successMessage}</p>}

            {/* Submit */}
            <button type="submit" className={styles.registerBtn} disabled={loading}>
              {loading ? t("register.creating") : t("register.submit")}
            </button>


            <p className={styles.loginLink}>
              {t("register.hasAccount")}{" "}
              <Link to="/login">{t("login.signIn")}</Link>
            </p>
          </form>
        </div>

        {/* ─── RIGHT: Visual Side — i18n HTML/CSS panel (was a static EN image) ─── */}
        <div className={styles.registerImageSide}>
          <AuthSidePanel />
        </div>

      </div>
    </div>
  );
};

export default Register;
