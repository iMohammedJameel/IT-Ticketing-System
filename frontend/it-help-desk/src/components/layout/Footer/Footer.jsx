/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Footer — reference design: "Jameel | IT Ticketing System v1.0.0" on the
// inline-start edge, "Together We Solve IT Challenges" with a gold accent
// dash on the inline-end edge. The Egyptian skyline artwork shows through
// the middle from the shell's background layer. Hidden when printing.
import { useI18n } from "../../../i18n";
import styles from "./Footer.module.css";

function Footer() {
  const { t } = useI18n();

  return (
    <footer className={`${styles.footer} app-footer`}>
      <div className={styles.brandSide}>
        <strong className={styles.brandName}>{t("footer.brandName")}</strong>
        <span className={styles.sep} aria-hidden="true">|</span>
        <span className={styles.brandFull}>{t("footer.brandFull")}</span>
        <span className={styles.version}>{t("footer.version")}</span>
      </div>
      <div className={styles.mottoSide}>
        <span className={styles.goldDash} aria-hidden="true"></span>
        <span className={styles.motto}>{t("footer.motto")}</span>
      </div>
    </footer>
  );
}

export default Footer;
