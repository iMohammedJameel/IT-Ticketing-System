/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// KbSuggestions — "related help articles" deflection panel shown while the
// requester types the ticket description. Extracted from Tickets.jsx.
import { useI18n } from "../../../i18n";
import styles from "../Tickets.module.css";

export default function KbSuggestions({ suggestions, fetching }) {
  const { t } = useI18n();

  if (!fetching && suggestions.length === 0) return null;

  return (
    <div className={styles.kbSuggestBox}>
      <strong>
        <i className="fa-solid fa-lightbulb me-1" aria-hidden="true"></i>
        {t("tickets.relatedArticles")}
      </strong>
      <p className="text-muted mb-2" style={{ fontSize: "0.78rem" }}>
        {t("tickets.relatedHint")}
      </p>
      <ul className="mb-0" style={{ listStyle: "none", padding: 0 }}>
        {suggestions.map((a) => (
          <li key={a._id} className="mb-1">
            <a href={`/kb?id=${a._id}`} target="_blank" rel="noopener noreferrer">
              <i className="fa-solid fa-book me-1" aria-hidden="true"></i>
              {a.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
