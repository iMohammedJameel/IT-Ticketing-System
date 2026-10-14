/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Admin: company directory manager — companies that tickets can link to.
// Create AND edit (prefilled form) + delete, all localized.
// Extracted from Settings.jsx.
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { companyService } from "../../../services/companyService";
import { useI18n } from "../../../i18n";
import { tApiError } from "../../../i18n/apiErrors";

function CompaniesPanel() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  // Edit mode — when set, the form edits THIS row instead of creating
  const [editingId, setEditingId] = useState(null);

  const load = () => companyService.list().then((res) => setItems(res.data.companies || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setContactName("");
    setEmail("");
  };

  const startEdit = (c) => {
    setEditingId(c._id);
    setName(c.name);
    setContactName(c.contactName || "");
    setEmail(c.email || "");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error(t("settings.companies.nameRequired"));
    setBusy(true);
    try {
      const payload = { name: name.trim(), contactName: contactName.trim(), email: email.trim() };
      if (editingId) {
        await companyService.update(editingId, payload);
        toast.success(t("settings.companies.updated"));
      } else {
        await companyService.create(payload);
        toast.success(t("settings.companies.added"));
      }
      resetForm();
      load();
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("errors.requestFailed"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c) => {
    const stats = await companyService.getOne(c._id).then((r) => r.data.stats).catch(() => null);
    const hasTickets = stats && stats.total > 0;
    const msg = hasTickets
      ? t("settings.companies.deleteConfirmTickets", { a: c.name, b: stats.total })
      : t("settings.companies.deleteConfirm", { a: c.name });
    if (!window.confirm(msg)) return;
    try {
      await companyService.remove(c._id);
      toast.success(t("settings.companies.deleted"));
      if (c._id === editingId) resetForm();
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
              {t("settings.companies.editing", { a: name })}
            </span>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetForm}>
              {t("settings.companies.cancelEdit")}
            </button>
          </div>
        )}
        <div className="row g-2">
          <div className="col-12 col-md-4">
            <input
              className="form-control"
              placeholder={t("settings.companies.namePh")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              aria-label={t("settings.companies.namePh")}
            />
          </div>
          <div className="col-12 col-md-4">
            <input
              className="form-control"
              placeholder={t("settings.companies.contactPh")}
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              maxLength={100}
              aria-label={t("settings.companies.contactPh")}
            />
          </div>
          <div className="col-12 col-md-4">
            <input
              className="form-control"
              type="email"
              placeholder={t("settings.companies.emailPh")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label={t("settings.companies.emailPh")}
            />
          </div>
        </div>
        <button className="btn btn-primary btn-sm mt-2" disabled={busy}>
          <i className={`fa-solid ${editingId ? "fa-floppy-disk" : "fa-plus"} me-1`} aria-hidden="true"></i>
          {editingId ? t("settings.companies.save") : t("settings.companies.add")}
        </button>
      </form>
      {items.length === 0 ? (
        <p className="text-muted">{t("settings.companies.empty")}</p>
      ) : (
        <ul className="list-group">
          {items.map((c) => (
            <li key={c._id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong style={{ fontSize: "0.9rem" }}>{c.name}</strong>
                {(c.contactName || c.email) && (
                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                    {[c.contactName, c.email].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
              <div className="d-flex gap-1 flex-shrink-0">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => startEdit(c)}
                  aria-label={`${t("common.edit")} — ${c.name}`}
                >
                  <i className="fa-solid fa-pen" aria-hidden="true"></i>
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => remove(c)}
                  aria-label={`${t("common.delete")} — ${c.name}`}
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

export default CompaniesPanel;
