/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Admin: canned responses manager — quick replies the team can insert into
// ticket comments. Create AND edit (prefilled form) + delete, all localized.
// Extracted from Settings.jsx.
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cannedResponseService } from "../../../services/cannedResponseService";
import { useI18n } from "../../../i18n";
import { tApiError } from "../../../i18n/apiErrors";

const CATEGORIES = ["general", "hardware", "software", "network", "access", "other"];

function CannedResponsesPanel() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [busy, setBusy] = useState(false);
  // Edit mode — when set, the form edits THIS row instead of creating
  const [editingId, setEditingId] = useState(null);

  const load = () =>
    cannedResponseService.list().then((res) => setItems(res.data.responses || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setCategory("general");
  };

  const startEdit = (c) => {
    setEditingId(c._id);
    setTitle(c.title);
    setContent(c.content);
    setCategory(c.category || "general");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return toast.error(t("settings.canned.required"));
    setBusy(true);
    try {
      const payload = { title: title.trim(), content: content.trim(), category };
      if (editingId) {
        await cannedResponseService.update(editingId, payload);
        toast.success(t("settings.canned.updated"));
      } else {
        await cannedResponseService.create(payload);
        toast.success(t("settings.canned.added"));
      }
      resetForm();
      load();
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("errors.requestFailed"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm(t("settings.canned.deleteConfirm"))) return;
    try {
      await cannedResponseService.remove(id);
      toast.success(t("settings.canned.deleted"));
      if (id === editingId) resetForm();
      load();
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("errors.requestFailed"));
    }
  };

  return (
    <div>
      <form onSubmit={submit} className="mb-4">
        {editingId && (
          <div className="alert alert-secondary py-2 mb-2 d-flex align-items-center justify-content-between" role="status">
            <span>
              <i className="fa-solid fa-pen me-1" aria-hidden="true"></i>
              {t("settings.canned.editing", { a: title })}
            </span>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetForm}>
              {t("settings.canned.cancelEdit")}
            </button>
          </div>
        )}
        <div className="row g-2">
          <div className="col-12 col-md-4">
            <input
              className="form-control"
              placeholder={t("settings.canned.titlePh")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              aria-label={t("settings.canned.titlePh")}
            />
          </div>
          <div className="col-12 col-md-3">
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label={t("common.filterCategory")}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-5">
            <input
              className="form-control"
              placeholder={t("settings.canned.contentPh")}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              aria-label={t("settings.canned.contentPh")}
            />
          </div>
        </div>
        <button className="btn btn-primary btn-sm mt-2" disabled={busy}>
          <i className={`fa-solid ${editingId ? "fa-floppy-disk" : "fa-plus"} me-1`} aria-hidden="true"></i>
          {editingId ? t("settings.canned.save") : t("settings.canned.add")}
        </button>
      </form>
      {items.length === 0 ? (
        <p className="text-muted">{t("settings.canned.empty")}</p>
      ) : (
        <ul className="list-group">
          {items.map((c) => (
            <li key={c._id} className="list-group-item d-flex justify-content-between align-items-start gap-2">
              <div>
                <strong style={{ fontSize: "0.88rem" }}>{c.title}</strong>
                <span className="badge bg-secondary ms-2" style={{ fontSize: "0.65rem" }}>{c.category}</span>
                <span className="text-muted ms-2" style={{ fontSize: "0.65rem" }}>
                  {t("settings.canned.used", { a: c.usageCount ?? 0 })}
                </span>
                <div className="text-muted" style={{ fontSize: "0.78rem" }}>{c.content}</div>
              </div>
              <div className="d-flex gap-1 flex-shrink-0">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => startEdit(c)}
                  aria-label={`${t("common.edit")} — ${c.title}`}
                >
                  <i className="fa-solid fa-pen" aria-hidden="true"></i>
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => remove(c._id)}
                  aria-label={`${t("common.delete")} — ${c.title}`}
                >
                  <i className="fa-solid fa-trash" aria-hidden="true"></i>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CannedResponsesPanel;
