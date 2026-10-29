/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Create Ticket page — priority/category, file attachments, loading state,
// accessible form, sonner toasts. Uses useAuth() instead of localStorage.
//
// Split for maintainability (single responsibility):
//   ticketsFormConfig.js        — constants + pure helpers (parseTags…)
//   hooks/useTicketDraft.js     — draft autosave / restore / clear
//   hooks/useKbDeflection.js    — debounced KB article suggestions
//   components/TicketFormFields.jsx  — left column fields
//   components/AttachmentsPicker.jsx — file picker + list
//   components/KbSuggestions.jsx     — deflection panel
//   components/SlaNotice.jsx         — live SLA policy notice
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n";
import { usePageTitle } from "../../hooks";
import { ticketService } from "../../services/ticketService";
import { companyService } from "../../services/companyService";
import Spinner from "../../components/common/Spinner";

import { FALLBACK_COMPANIES, DEFAULT_SLA_HOURS, parseTags } from "./ticketsFormConfig";
import { useTicketDraft } from "./hooks/useTicketDraft";
import { useKbDeflection } from "./hooks/useKbDeflection";
import TicketFormFields from "./components/TicketFormFields";
import AttachmentsPicker from "./components/AttachmentsPicker";
import KbSuggestions from "./components/KbSuggestions";
import SlaNotice from "./components/SlaNotice";
import styles from "./Tickets.module.css";

function Tickets() {
  const { user, isStaff } = useAuth();
  const { t } = useI18n();
  usePageTitle(t("tickets.formTitle"));

  const { form, setForm, hasDraft, handleChange, resetForm } = useTicketDraft();

  const [tagsInput, setTagsInput] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [companies, setCompanies] = useState([]); // staff: [{_id, name}]
  const [slaHours, setSlaHours] = useState(DEFAULT_SLA_HOURS);
  const { kbSuggestions, fetchingKb } = useKbDeflection(form.product, form.description, !loading);

  // Staff: load the company directory (users keep the static list)
  useEffect(() => {
    if (!isStaff) return;
    companyService
      .list({ active: "true" })
      .then((res) => setCompanies(res.data.companies || []))
      .catch(() => {});
  }, [isStaff]);

  // Staff: live SLA policies for the notice under the form
  useEffect(() => {
    if (!isStaff) return;
    ticketService
      .getSlaPolicies()
      .then((res) => {
        const policies = res.data.policies || [];
        const next = {};
        policies.forEach((p) => {
          next[p.priority] = `${p.hours}h${p.businessHoursOnly ? " (business)" : ""}`;
        });
        if (Object.keys(next).length) setSlaHours(next);
      })
      .catch(() => {});
  }, [isStaff]);

  // Link the company directory id when the staff picks a known company
  const handleCompanyChange = (e) => {
    const name = e.target.value;
    setForm({ ...form, company: name });
    const match = companies.find((c) => c.name === name);
    setCompanyId(match ? match._id : "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const { product, company, description } = form;
    if (!product || !company || !description.trim()) {
      toast.error(t("tickets.fillRequired"));
      return;
    }
    if (description.trim().length < 5) {
      toast.error(t("tickets.descMinLength"));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        description: description.trim(),
        tags: parseTags(tagsInput),
        ...(companyId ? { companyId } : {}),
        startDate: new Date().toISOString(),
      };
      const res = await ticketService.create(payload);
      const ticket = res.data.ticket;

      if (attachments.length > 0) {
        toast.info(t("tickets.uploadingN", { a: attachments.length }));
        let uploaded = 0;
        for (const file of attachments) {
          try {
            await ticketService.uploadAttachment(ticket._id, file);
            uploaded++;
          } catch {
            toast.error(t("tickets.uploadFailed", { a: file.name }));
          }
        }
        if (uploaded > 0) toast.success(t("tickets.uploadedN", { a: uploaded }));
      }

      toast.success(t("tickets.createdToast", { a: ticket.ticketNumber }));
      resetForm();
      setTagsInput("");
      setCompanyId("");
      setAttachments([]);
    } catch (err) {
      toast.error(err.message || t("tickets.createFailed"));
      if (err.details) {
        err.details.forEach((d) => toast.error(d.message || d));
      }
    } finally {
      setLoading(false);
    }
  };

  const companyNames = companies.length ? companies.map((c) => c.name) : FALLBACK_COMPANIES;

  return (
    <section className="p-4">
      <div className="container-fluid">
        <div className={styles.tabBar}>
          <div className="d-flex align-items-center gap-2">
            <i className="fa-solid fa-ticket" aria-hidden="true"></i>
            <span>{t("tickets.formTitle")}</span>
            {hasDraft && (
              <span className="badge text-bg-light border" style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                <i className="fa-solid fa-floppy-disk me-1" aria-hidden="true"></i>
                {t("tickets.draftRestored")}
              </span>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>{t("tickets.ticketInfo")}</div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-0">
              <TicketFormFields
                form={form}
                setForm={setForm}
                companyNames={companyNames}
                tagsInput={tagsInput}
                setTagsInput={setTagsInput}
                userName={user?.name}
                onCompanyChange={handleCompanyChange}
                disabled={loading}
              />

              <div className="col-12 col-lg-6">
                {/* QA-deep: right column previously mixed Bootstrap-default
                    labels + ad-hoc padding while the left column used
                    .formRow/.formLabel — unified so both columns share the
                    same rhythm (label lane, separators, sizes). */}
                <div className={styles.formCol}>
                  {/* Subject — short title shown in lists & search results */}
                  <div className={styles.formRow}>
                    <label htmlFor="subject" className={styles.formLabel}>
                      {t("tickets.subject")}
                    </label>
                    <input
                      id="subject"
                      type="text"
                      className="form-control"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      placeholder={t("tickets.subjectPlaceholder")}
                      maxLength={140}
                      disabled={loading}
                    />
                  </div>

                  <div className={`${styles.formRow} ${styles.formRowTop}`}>
                    <label htmlFor="description" className={styles.formLabel}>
                      {t("tickets.problemDescription")} <span className="text-danger">*</span>
                    </label>
                    <div className={styles.descCol}>
                      <textarea
                        id="description"
                        className={`${styles.customTextarea} form-control`}
                        rows="9"
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        placeholder={t("tickets.descriptionPlaceholder")}
                        style={{ resize: "none" }}
                        required
                        disabled={loading}
                        minLength={5}
                        maxLength={5000}
                      />
                      <small className="text-muted mt-1" style={{ fontSize: "0.75rem" }}>
                        {form.description.length}/5000
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <AttachmentsPicker
              attachments={attachments}
              setAttachments={setAttachments}
              disabled={loading}
            />

            <KbSuggestions suggestions={kbSuggestions} fetching={fetchingKb} />

            <SlaNotice priority={form.priority} slaHours={slaHours} />

            <div className={styles.formActions}>
              <button type="button" className={styles.btnClose} onClick={() => { resetForm(); setTagsInput(""); setCompanyId(""); setAttachments([]); }} disabled={loading}>
                {t("tickets.reset")}
              </button>
              <button type="submit" className={styles.btnSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Spinner size="sm" label={t("tickets.creating")} />
                    <span style={{ marginInlineStart: "8px" }}>{t("tickets.creating")}</span>
                  </>
                ) : (
                  t("tickets.createTicket")
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

export default Tickets;
