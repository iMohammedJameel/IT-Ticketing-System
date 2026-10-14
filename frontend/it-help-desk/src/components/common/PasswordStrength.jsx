/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Password strength meter — shared by Register + Settings password tab.
// Score 0-4 aligned with the backend policy (min 8 + ≥1 letter + ≥1 digit):
//   +1 length ≥ 8 · +1 has a letter · +1 has a digit · +1 extra class
//   (length ≥ 12, or upper+lower+symbol mix on top of the base rules).
import { useI18n } from "../../i18n";
import styles from "./PasswordStrength.module.css";

const scorePassword = (pw) => {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Za-z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  const extra =
    pw.length >= 12 ||
    (/[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[^A-Za-z0-9]/.test(pw));
  if (extra && score >= 3) score += 1;
  return Math.min(score, 4);
};

const LABELS = ["weak", "medium", "good", "strong"];

export const PasswordStrength = ({ password }) => {
  const { t } = useI18n();
  if (!password) return null;

  const score = scorePassword(password);
  const labelKey = LABELS[Math.max(score - 1, 0)];
  const colorClass = styles[`s${score}`] || styles.s0;

  return (
    <div className={styles.wrap}>
      <div
        className={styles.bar}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score}
        aria-valuetext={t(`pwStrength.${labelKey}`)}
        aria-label={t("pwStrength.label")}
      >
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`${styles.seg} ${i <= score ? colorClass : ""}`}
          />
        ))}
      </div>
      <span className={`${styles.label} ${colorClass}`}>
        {t("pwStrength.label")}: {t(`pwStrength.${labelKey}`)}
      </span>
    </div>
  );
};

export default PasswordStrength;
