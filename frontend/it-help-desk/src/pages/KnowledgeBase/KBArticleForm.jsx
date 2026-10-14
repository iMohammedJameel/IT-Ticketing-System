/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Admin KB article form — create + edit (prefilled). Rendered inside a Modal
// from KnowledgeBase. Talks to kbService.create/update, then signals onDone.
import { useState } from "react";
import { toast } from "sonner";
import { useI18n } from "../../i18n";
import { tApiError } from "../../i18n/apiErrors";
import { kbService } from "../../services/kbService";
import Spinner from "../../components/common/Spinner";

const CATEGORIES = ["hardware", "software", "network", "access", "other"];

function KBArticleForm({ article, onDone }) {
  const { t } = useI18n();
  const editing = !!article?._id;
  const [title, setTitle] = useState(article?.title || "");
  const [category, setCategory] = useState(article?.category || "other");
  const [content, setContent] = useState(article?.content || "");
  const [tags, setTags] = useState((article?.tags || []).join(", "));
  const [published, setPublished] = useState(article?.published ?? true);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    // FE validation mirrors the backend Joi schema (title ≥5, content ≥10)
    if (!title.trim()) return toast.error(t("kb.titleRequired"));
    if (title.trim().length < 5) return toast.error(t("kb.titleMin"));
    if (!content.trim()) return toast.error(t("kb.contentRequired"));
    if (content.trim().length < 10) return toast.error(t("kb.contentMin"));

    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        category,
        content: content.trim(),
        tags: tags.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10),
        published,
      };
      if (editing) {
        await kbService.update(article._id, payload);
        toast.success(t("kb.articleUpdated"));
      } else {
        await kbService.create(payload);
        toast.success(t("kb.articleCreated"));
      }
      onDone();
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("errors.requestFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="mb-3">
        <label htmlFor="kb-title" className="form-label">{t("kb.titleLabel")}</label>
        <input
          id="kb-title"
          type="text"
          className="form-control"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("kb.titlePlaceholder")}
          maxLength={200}
          required
          autoFocus
        />
      </div>

      <div className="row g-3 mb-3">
        <div className="col-12 col-md-7">
          <label htmlFor="kb-category" className="form-label">{t("tickets.category")}</label>
          <select
            id="kb-category"
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(`category.${c}`)}</option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-5">
          <label htmlFor="kb-tags" className="form-label">{t("kb.tagsLabel")}</label>
          <input
            id="kb-tags"
            type="text"
            className="form-control"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="printer, wifi"
          />
        </div>
      </div>

      <div className="mb-3">
        <label htmlFor="kb-content" className="form-label">{t("kb.contentLabel")}</label>
        <textarea
          id="kb-content"
          className="form-control"
          rows={8}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("kb.contentPlaceholder")}
          maxLength={10000}
          required
          style={{ resize: "vertical" }}
        />
      </div>

      <div className="form-check form-switch mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          role="switch"
          id="kb-published"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        <label className="form-check-label" htmlFor="kb-published">{t("kb.publishedLabel")}</label>
      </div>

      <div className="d-flex gap-2 justify-content-end">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onDone}>
          {t("common.cancel")}
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
          {busy ? <Spinner size="sm" label={t("kb.savingArticle")} /> : (
            <>
              <i className="fa-regular fa-floppy-disk me-1" aria-hidden="true"></i>
              {t("kb.saveArticle")}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default KBArticleForm;
