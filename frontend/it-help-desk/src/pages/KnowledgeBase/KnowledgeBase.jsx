/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Knowledge base page — public list of articles + search + category filter.
// Cards link to /kb/:id (detail + voting). Admins additionally manage articles
// (create / edit / delete) from this page — backend /api/admin/kb CRUD.
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAsync, usePageTitle, useDebounce } from "../../hooks";
import { kbService } from "../../services/kbService";
import { SkeletonCard } from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import { Modal } from "../../components/common/Modal";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n";
import { tApiError } from "../../i18n/apiErrors";
import KBArticleForm from "./KBArticleForm";
import { formatDate } from "../../utils/format";
import styles from "./KnowledgeBase.module.css";

const CATEGORIES = ["hardware", "software", "network", "access", "other"];

export default function KnowledgeBase() {
  const { t, lang } = useI18n();
  const { isAdmin } = useAuth();
  usePageTitle(t("nav.knowledgeBase"));
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 350);
  const [category, setCategory] = useState("");

  // Admin editor modal — null = closed, {} = create, {…article} = edit
  const [editing, setEditing] = useState(null);

  // Admins see ALL articles (drafts included) via listAll and filter
  // client-side; everyone else uses the public searchable endpoint.
  const { data, loading, reload } = useAsync(
    () => (isAdmin ? kbService.listAll() : kbService.list({ search, category, limit: 20 })),
    [search, category, isAdmin]
  );

  const allArticles = data?.data?.articles || [];
  const articles = isAdmin
    ? allArticles.filter((a) => {
        const catOk = !category || a.category === category;
        const q = search.trim().toLowerCase();
        const searchOk =
          !q ||
          a.title?.toLowerCase().includes(q) ||
          a.content?.toLowerCase().includes(q) ||
          (a.tags || []).some((tg) => tg.toLowerCase().includes(q));
        return catOk && searchOk;
      })
    : allArticles;

  const removeArticle = async (a) => {
    if (!window.confirm(t("kb.deleteConfirm", { a: a.title }))) return;
    try {
      await kbService.remove(a._id);
      toast.success(t("kb.articleDeleted"));
      reload();
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("errors.requestFailed"));
    }
  };

  return (
    <section className="p-4">
      <div className="container-fluid">
        {/* Header */}
        <div className={styles.tabBar}>
          <div className="d-flex align-items-center gap-2">
            <i className="fa-solid fa-book-open" aria-hidden="true"></i>
            <span>{t("nav.knowledgeBase")}</span>
          </div>
          <p className={styles.subTitle}>{t("kb.subtitle")}</p>
          {isAdmin && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setEditing({})}
            >
              <i className="fa-solid fa-plus me-1" aria-hidden="true"></i>
              {t("kb.newArticle")}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="d-flex gap-2 mb-4 flex-wrap">
          <input
            type="search"
            className="form-control"
            placeholder={t("kb.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ maxWidth: "280px" }}
            aria-label={t("kb.searchPlaceholder")}
          />
          <select
            className="form-select w-auto"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label={t("common.allCategories")}
          >
            <option value="">{t("common.allCategories")}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(`category.${c}`)}</option>
            ))}
          </select>
        </div>

        {/* Main Content Card */}
        <div className={styles.contentCard}>
          {loading ? (
            <div className="row g-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="col-md-6 col-lg-4">
                  <SkeletonCard />
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-book-open"
              title={t("kb.noArticles")}
              description={t("kb.noArticlesHint")}
            />
          ) : (
            <div className="row g-3">
              {articles.map((a) => (
                <div key={a._id} className="col-md-6 col-lg-4">
                  <div className={styles.articleCard}>
                    <div className={styles.cardTop}>
                      <span className={styles.categoryBadge}>{t(`category.${a.category}`)}</span>
                      {isAdmin && !a.published && (
                        <span className={styles.draftBadge}>{t("kb.draft")}</span>
                      )}
                      {isAdmin && (
                        <span className={styles.cardActions}>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setEditing(a)}
                            aria-label={`${t("common.edit")} — ${a.title}`}
                            title={t("common.edit")}
                          >
                            <i className="fa-solid fa-pen" aria-hidden="true"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeArticle(a)}
                            aria-label={`${t("common.delete")} — ${a.title}`}
                            title={t("common.delete")}
                          >
                            <i className="fa-solid fa-trash" aria-hidden="true"></i>
                          </button>
                        </span>
                      )}
                    </div>

                    {/* Published → whole card is a link (stretched-link overlay);
                        drafts stay inert for non-link navigation (admin edits instead) */}
                    {a.published ? (
                      <Link to={`/kb/${a._id}`} className={`stretched-link ${styles.cardLink}`}>
                        <h5 className={styles.articleTitle}>{a.title}</h5>
                      </Link>
                    ) : (
                      <h5 className={styles.articleTitle}>{a.title}</h5>
                    )}
                    <p className={styles.articleExcerpt}>
                      {a.excerpt || a.content?.slice(0, 120)}...
                    </p>
                    <div className={styles.articleMeta}>
                      <span>
                        {a.author?.name || t("kb.unknownAuthor")} · {formatDate(a.createdAt, lang)}
                      </span>
                      <span title={t("kb.viewsAndHelpful")}>
                        <i className="fa-regular fa-eye me-1" aria-hidden="true"></i>{a.viewCount}
                        <i className="fa-regular fa-thumbs-up ms-2 me-1" aria-hidden="true"></i>{a.helpfulCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Admin editor — create (editing={}) or edit (editing=article) */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?._id ? t("kb.editArticle") : t("kb.newArticle")}
        size="lg"
      >
        {editing !== null && (
          <KBArticleForm
            article={editing._id ? editing : null}
            onDone={() => {
              setEditing(null);
              reload();
            }}
          />
        )}
      </Modal>
    </section>
  );
}
