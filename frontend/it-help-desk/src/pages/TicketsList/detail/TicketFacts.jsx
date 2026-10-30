/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Facts sidebar — the one-line key/value grid (requester, company, product,
// category, assignee + presence dot, SLA dates) plus the tags row.
import { useI18n } from "../../../i18n";
import { formatDateTime } from "../../../utils/format";
import styles from "../TicketsList.module.css";

const TicketFacts = ({ ticket, onlineStaff = [] }) => {
  const { t, lang } = useI18n();

  const facts = [
    { label: t("tickets.createdBy"), value: ticket.user?.name || "—" },
    { label: t("tickets.company"), value: ticket.company },
    { label: t("tickets.product"), value: ticket.product },
    { label: t("tickets.category"), value: t(`category.${ticket.category}`) },
    {
      label: t("tickets.assignTo"),
      value: ticket.assignedTo?.name || t("common.notAssigned"),
      presenceId: ticket.assignedTo?._id,
    },
    ...(ticket.team ? [{ label: t("tickets.team"), value: ticket.team }] : []),
    { label: t("tickets.created"), value: formatDateTime(ticket.createdAt, lang) },
    { label: "SLA", value: ticket.slaDueDate ? formatDateTime(ticket.slaDueDate, lang) : "—" },
    ...(ticket.endDate ? [{ label: t("tickets.resolvedAt"), value: formatDateTime(ticket.endDate, lang) }] : []),
  ];

  return (
    <div className={`${styles.card} ${styles.detailCard} mb-3`}>
      <h2 className={styles.detailSectionTitle}>{t("tickets.facts")}</h2>
      <dl className={styles.factList}>
        {/* One-line grid rows (label: auto | value: minmax(0,1fr)),
            baseline-aligned, values ellipsize at the inline END with the
            full string in title — fixes qa6-4/16/17/18/19/20/21. */}
        {facts.map((f) => (
          <div key={f.label} className={styles.factRow}>
            <dt className={styles.factLabel}>{f.label}</dt>
            <dd
              className={styles.factValue}
              title={f.value == null ? undefined : String(f.value)}
            >
              <span className={styles.factText} dir="auto">{f.value}</span>
              {f.presenceId && (
                <span
                  className={`presence-dot ${onlineStaff.includes(f.presenceId) ? "online" : ""}`}
                  title={onlineStaff.includes(f.presenceId) ? t("common.online") : t("common.offline")}
                ></span>
              )}
            </dd>
          </div>
        ))}
        {(ticket.tags || []).length > 0 && (
          <div className={styles.factRow}>
            <dt className={styles.factLabel}>{t("tickets.tags")}</dt>
            <dd className={styles.factTags}>
              {ticket.tags.map((tag) => (
                <span key={tag} className="badge bg-light text-dark border" style={{ fontSize: "0.7rem" }}>{tag}</span>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
};

export default TicketFacts;
