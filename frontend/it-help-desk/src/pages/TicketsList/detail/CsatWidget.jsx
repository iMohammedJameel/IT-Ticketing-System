/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// CSAT widget — 1-5 stars + optional comment, submitted once by the
// ticket requester after resolution.
import { useState } from "react";
import { toast } from "sonner";
import { useI18n } from "../../../i18n";
import { ticketService } from "../../../services/ticketService";
import styles from "../TicketsList.module.css";

export const CsatWidget = ({ ticket, onRated }) => {
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (ticket.csat?.rating) {
    return (
      <div className="text-center py-3">
        <div className="mb-1" aria-label={`${ticket.csat.rating}/5`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <i
              key={i}
              className={`fa-${i <= ticket.csat.rating ? "solid" : "regular"} fa-star ${styles.csatStar}`}
              style={{ color: i <= ticket.csat.rating ? "var(--prio-medium)" : undefined }}
              aria-hidden="true"
            ></i>
          ))}
        </div>
        <small className="text-muted">{t("tickets.alreadyRated")}</small>
        {/* QA-td9: the requester's rating comment was collected but never
            shown back — the already-rated state displayed stars with zero
            context. Render the stored comment (dir=auto: AR/EN comments
            both keep their natural direction). */}
        {ticket.csat.comment ? (
          <p
            className="text-muted mt-2 mb-0"
            dir="auto"
            style={{ fontSize: "0.8rem", whiteSpace: "pre-wrap" }}
          >
            “{ticket.csat.comment}”
          </p>
        ) : null}
      </div>
    );
  }

  const submit = async () => {
    if (!rating) return toast.error(t("tickets.pickStarFirst"));
    setSubmitting(true);
    try {
      const res = await ticketService.rateCsat(ticket._id, { rating, comment: comment.trim() });
      toast.success(t("tickets.thanksForRating"));
      onRated?.(res.data.csat);
    } catch (err) {
      toast.error(err.message || t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${styles.csatBox} text-center py-3`}>
      <strong>{t("tickets.rateSupport")}</strong>
      <p className="text-muted mb-2" style={{ fontSize: "0.8rem" }}>{t("tickets.rateSupportHint")}</p>
      <div className="d-flex justify-content-center gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            className="btn btn-link p-0"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(i)}
            aria-label={`${i} ${t("tickets.stars")}`}
          >
            <i
              className={`fa-${i <= (hover || rating) ? "solid" : "regular"} fa-star ${styles.csatStar}`}
              style={{ color: i <= (hover || rating) ? "var(--prio-medium)" : undefined }}
              aria-hidden="true"
            ></i>
          </button>
        ))}
      </div>
      <input
        type="text"
        className="form-control form-control-sm mb-2"
        style={{ maxWidth: "320px", margin: "0 auto" }}
        placeholder={t("tickets.optionalComment")}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
      />
      <button className="btn btn-sm btn-primary" onClick={submit} disabled={submitting}>
        {t("tickets.submitRating")}
      </button>
    </div>
  );
};

export default CsatWidget;
