/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// KB article detail page — /kb/:id. Shareable URL, back link to /kb,
// typographic body (plain-text content, pre-wrap), and the helpful /
// not-helpful vote UI wired to kbService.vote (one vote per user, 409-aware).
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n";
import { tApiError } from "../../i18n/apiErrors";
import { useAsync, usePageTitle } from "../../hooks";
import { kbService } from "../../services/kbService";
import { Skeleton } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import { formatDate } from "../../utils/format";
import styles from "./KBArticlePage.module.css";

function KBArticlePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t, lang, isRtl } = useI18n();

  const { data, loading, error, reload } = useAsync(() => kbService.getById(id), [id]);
  const article = data?.data?.article;

  // Local vote overlay — applied after a successful vote without refetching
  const [vote, setVote] = useState(null); // { helpfulCount, notHelpfulCount, myVote }
  const [voting, setVoting] = useState(false);

  usePageTitle(article ? article.title : t("nav.knowledgeBase"));

  // One vote per user — the article's voters ledger tells us if THIS user
  // already voted (and which way), so the buttons reflect the state honestly.
  const myVote = vote?.myVote ?? article?.voters?.find((v) => v.user === user?.id)?.helpful;
  const hasVoted = myVote !== undefined;

  const handleVote = async (helpful) => {
    // One vote per user is enforced SERVER-side (409). The buttons stay
    // clickable after voting so a repeat/switch attempt surfaces the
    // localized "already voted" toast instead of silently dead-ending.
    setVoting(true);
    try {
      const res = await kbService.vote(id, helpful);
      setVote({
        helpfulCount: res.data.helpfulCount,
        notHelpfulCount: res.data.notHelpfulCount,
        myVote: helpful,
      });
      toast.success(t("kb.voteThanks"));
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("errors.requestFailed"));
      // 409 "already voted" — re-sync with the server's ledger so the
      // buttons settle into the voted state instead of staying enabled.
      if (err.status === 409) reload();
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <section className="p-4">
        <div className="container-fluid">
          <Skeleton width="6rem" height="1.1rem" />
          <div className="mt-3"><Skeleton width="60%" height="2rem" /></div>
          <div className="mt-3"><Skeleton height="200px" /></div>
        </div>
      </section>
    );
  }

  if (error || !article) {
    return (
      <section className="p-4">
        <div className="container-fluid">
          <div className={styles.card}>
            <EmptyState
              icon="fa-solid fa-book-open"
              title={t("kb.articleNotFound")}
              description={t("kb.articleNotFoundHint")}
              action={
                <Link className="btn btn-primary btn-sm" to="/kb">
                  {t("kb.backToKb")}
                </Link>
              }
            />
          </div>
        </div>
      </section>
    );
  }

  const helpfulCount = vote?.helpfulCount ?? article.helpfulCount ?? 0;
  const notHelpfulCount = vote?.notHelpfulCount ?? article.notHelpfulCount ?? 0;

  return (
    <section className="p-4">
      <div className="container-fluid">
        {/* Back link — explicit /kb (not history back) so it always lands on the list */}
        <Link to="/kb" className={`btn btn-outline-secondary btn-sm mb-3 ${styles.backLink}`}>
          <i className={`fa-solid ${isRtl ? "fa-arrow-right" : "fa-arrow-left"} me-1`} aria-hidden="true"></i>
          {t("kb.backToKb")}
        </Link>

        <article className={styles.card}>
          <header className={styles.header}>
            <div className={styles.chipRow}>
              <span className={styles.categoryBadge}>{t(`category.${article.category}`)}</span>
              {article.tags?.map((tag) => (
                <span key={tag} className={styles.tagChip}>#{tag}</span>
              ))}
            </div>
            <h1 className={styles.title}>{article.title}</h1>
            <p className={styles.meta}>
              <i className="fa-regular fa-user me-1" aria-hidden="true"></i>
              {article.author?.name || t("kb.unknownAuthor")}
              <span className={styles.metaSep} aria-hidden="true">·</span>
              {formatDate(article.createdAt, lang)}
              <span className={styles.metaSep} aria-hidden="true">·</span>
              <span title={t("kb.viewsAndHelpful")}>
                <i className="fa-regular fa-eye me-1" aria-hidden="true"></i>
                {article.viewCount} {t("kb.views")}
              </span>
            </p>
          </header>

          {/* Plain-text content — preserve author line breaks */}
          <div className={styles.body}>{article.content}</div>

          <footer className={styles.voteFooter}>
            <div className={styles.voteGroup} role="group" aria-label={t("kb.yourVote")}>
              <button
                type="button"
                className={`btn btn-sm ${hasVoted && myVote ? `btn-success ${styles.votedBtn}` : "btn-outline-success"} ${styles.voteBtn}`}
                onClick={() => handleVote(true)}
                disabled={voting}
                aria-pressed={myVote === true}
              >
                <i className="fa-regular fa-thumbs-up me-1" aria-hidden="true"></i>
                {t("kb.helpfulBtn")}
                <span className={styles.voteCount}>{helpfulCount}</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${hasVoted && !myVote ? `btn-danger ${styles.votedBtn}` : "btn-outline-danger"} ${styles.voteBtn}`}
                onClick={() => handleVote(false)}
                disabled={voting}
                aria-pressed={myVote === false}
              >
                <i className="fa-regular fa-thumbs-down me-1" aria-hidden="true"></i>
                {t("kb.notHelpfulBtn")}
                <span className={styles.voteCount}>{notHelpfulCount}</span>
              </button>
            </div>
            {hasVoted && (
              <span className={styles.votedNote}>
                <i className="fa-solid fa-circle-check me-1" aria-hidden="true"></i>
                {t("kb.voteThanks")}
              </span>
            )}
          </footer>
        </article>
      </div>
    </section>
  );
}

export default KBArticlePage;
