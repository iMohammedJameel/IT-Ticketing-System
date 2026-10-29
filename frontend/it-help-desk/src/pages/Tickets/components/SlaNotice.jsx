/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// SlaNotice — live policy hours notice under the create-ticket form.
// Extracted from Tickets.jsx.
import { useI18n } from "../../../i18n";
import { PRIORITY_INKS } from "../ticketsFormConfig";
import styles from "../Tickets.module.css";

export default function SlaNotice({ priority, slaHours }) {
  const { t } = useI18n();

  return (
    <div className={styles.slaNotice}>
      <i className="fa-solid fa-clock me-2" aria-hidden="true"></i>
      <span>
        {t("tickets.slaNotice")}:{" "}
        {/* QA-uiux (WCAG 1.4.3): vivid PRIORITY_COLORS were 2.1–3.8:1 as
            14px text — theme-aware inks pass in both themes. */}
        <strong style={{ color: PRIORITY_INKS[priority] }}>
          {t(`priority.${priority}`)}
        </strong>{" "}
        ({slaHours[priority]})
      </span>
    </div>
  );
}
