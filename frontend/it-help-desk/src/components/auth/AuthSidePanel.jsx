/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// AuthSidePanel — i18n marketing panel for the Login/Register visual side.
// Replaces the old static English IMAGE (authSidePanel.png) whose text could
// never be localized (BUG-qa7-8). All copy flows through t() so it renders
// in the active language; layout is RTL-safe (logical properties only).
import { useI18n } from "../../i18n";
import styles from "./AuthSidePanel.module.css";

const FEATURES = [
  { icon: "fa-solid fa-stopwatch", key: "auth.panel.feature1" },
  { icon: "fa-solid fa-chart-line", key: "auth.panel.feature2" },
  { icon: "fa-solid fa-comments", key: "auth.panel.feature3" },
];

function AuthSidePanel() {
  const { t } = useI18n();

  return (
    <div className={styles.panel}>
      <span className={styles.kicker}>
        <i className="fa-solid fa-ticket" aria-hidden="true"></i>
        {t("auth.panel.kicker")}
      </span>

      <h3 className={styles.title}>
        {t("auth.panel.title")}{" "}
        <span className={styles.accent}>{t("auth.panel.titleAccent")}</span>
      </h3>
      <p className={styles.subtitle}>{t("auth.panel.subtitle")}</p>

      <ul className={styles.features}>
        {FEATURES.map(({ icon, key }) => (
          <li key={key} className={styles.feature}>
            <span className={styles.featureIcon}>
              <i className={icon} aria-hidden="true"></i>
            </span>
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AuthSidePanel;
