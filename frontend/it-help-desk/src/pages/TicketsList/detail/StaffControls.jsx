/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Staff controls — status / priority / assignee selects + save. Local edit
// state re-syncs on GRANULAR ticket field changes (not object identity —
// that would wipe in-progress dropdown selections on unrelated re-renders).
import { useState, useEffect } from "react";
import { toast } from "sonner";
import Spinner from "../../../components/common/Spinner";
import { useI18n } from "../../../i18n";
import { ticketService } from "../../../services/ticketService";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "../ticketConstants";
import styles from "../TicketsList.module.css";

const StaffControls = ({ ticket, staffList = [], onlineStaff = [], onSaved }) => {
  const { t } = useI18n();
  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync local edit state whenever a (possibly refreshed) ticket arrives.
  // Deps are intentionally GRANULAR (the specific fields) rather than the
  // whole `ticket` object — see file header.
  useEffect(() => {
    if (!ticket) return;
    setNewStatus(ticket.status);
    setNewPriority(ticket.priority);
    setSelectedAdmin(ticket.assignedTo?._id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- granular deps intentional (see comment above)
  }, [ticket?._id, ticket?.status, ticket?.priority, ticket?.assignedTo?._id]);

  const handleSaveChanges = async () => {
    if (!ticket) return;
    setSaving(true);
    try {
      if (newStatus !== ticket.status) {
        await ticketService.updateStatus(ticket._id, { status: newStatus });
        toast.success(`${t("tickets.status")}: ${t(`status.${newStatus}`)}`);
      }
      if (newPriority !== ticket.priority) {
        await ticketService.updatePriority(ticket._id, { priority: newPriority });
        toast.success(`${t("tickets.priority")}: ${t(`priority.${newPriority}`)}`);
      }
      if (selectedAdmin !== (ticket.assignedTo?._id || "") && selectedAdmin) {
        await ticketService.assign(ticket._id, { assignedTo: selectedAdmin });
        toast.success(t("tickets.assignedToast"));
      }
      onSaved?.();
    } catch (err) {
      toast.error(err.message || t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${styles.card} ${styles.detailCard} mb-3`}>
      <h2 className={styles.detailSectionTitle}>{t("tickets.adminControls")}</h2>
      <div className="d-flex flex-column gap-2">
        <div>
          <label htmlFor="detail-status" className="form-label">{t("tickets.status")}</label>
          <select id="detail-status" className="form-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{t(`status.${s.value}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="detail-priority" className="form-label">{t("tickets.priority")}</label>
          <select id="detail-priority" className="form-select" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{t(`priority.${p.value}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="detail-assign" className="form-label">{t("tickets.assignTo")}</label>
          <select id="detail-assign" className="form-select" value={selectedAdmin} onChange={(e) => setSelectedAdmin(e.target.value)}>
            <option value="">{t("common.notAssigned")}</option>
            {staffList.map((a) => (
              <option key={a.id} value={a.id}>
                {onlineStaff.includes(a.id) ? "🟢 " : ""}{a.name}{a.team ? ` (${a.team})` : ""}
              </option>
            ))}
          </select>
        </div>
        <button
          className={`btn ${styles.btnModalSave}`}
          onClick={handleSaveChanges}
          disabled={saving}
        >
          {saving ? <Spinner size="sm" /> : t("common.save")}
        </button>
      </div>
    </div>
  );
};

export default StaffControls;
