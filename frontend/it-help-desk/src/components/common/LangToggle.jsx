/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// LangToggle — small floating language pill for the auth pages (they have no
// navbar, so pre-login users had NO way to switch language — BUG-qa2-3).
// Reuses the LanguageProvider: switching also flips <html dir> and the
// Bootstrap LTR/RTL build. Works in both directions, RTL-safe via logical
// properties (inset-inline-start).
import { useI18n } from "../../i18n";
import styles from "./LangToggle.module.css";

function LangToggle({ variant = "pill" }) {
  const { lang, setLang, t } = useI18n();

  return (
    <div
      className={`${styles.pill} ${variant === "ghost" ? styles.ghost : ""}`}
      role="group"
      aria-label={t("palette.toggleLang")}
    >
      <button
        type="button"
        className={`${styles.option} ${lang === "en" ? styles.active : ""}`}
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
      <span className={styles.divider} aria-hidden="true">|</span>
      <button
        type="button"
        className={`${styles.option} ${lang === "ar" ? styles.active : ""}`}
        onClick={() => setLang("ar")}
        aria-pressed={lang === "ar"}
      >
        عربي
      </button>
    </div>
  );
}

export default LangToggle;
