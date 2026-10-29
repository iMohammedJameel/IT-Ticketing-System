/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// AttachmentsPicker — file attachments section of the create-ticket form.
// Extracted from Tickets.jsx.
//
// Custom picker control (BUG-qa6-7): the native <input type="file"> chrome
// ("Choose Files" / "No file chosen") is browser-locale text we can't
// translate, so the input is visually hidden and a styled localized button
// drives it.
import { useRef } from "react";
import { toast } from "sonner";
import { useI18n } from "../../../i18n";
import { MAX_ATTACHMENT_BYTES } from "../ticketsFormConfig";
import styles from "../Tickets.module.css";

export default function AttachmentsPicker({ attachments, setAttachments, disabled }) {
  const { t } = useI18n();
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => {
      if (f.size > MAX_ATTACHMENT_BYTES) {
        toast.error(t("tickets.fileTooLarge", { a: f.name }));
        return false;
      }
      return true;
    });
    setAttachments((prev) => [...prev, ...valid]);
    // Reset the native input so picking the SAME file again (e.g. after
    // removing it from the list) still fires onChange.
    e.target.value = "";
  };

  const removeAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className={styles.attachmentSection}>
      <label htmlFor="attachments" className={styles.formLabel}>
        <i className="fa-solid fa-paperclip me-1" aria-hidden="true"></i>
        {t("tickets.attachments")}
      </label>
      <div className={styles.filePickerRow}>
        <input
          ref={fileInputRef}
          id="attachments"
          type="file"
          multiple
          onChange={handleFileChange}
          disabled={disabled}
          accept="image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
        />
        <button
          type="button"
          className={styles.fileBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <i className="fa-solid fa-folder-open" aria-hidden="true"></i>
          <span>{t("tickets.chooseFiles")}</span>
        </button>
        {attachments.length > 0 && (
          <span className={styles.fileCount}>
            {t("tickets.fileCount", { a: attachments.length })}
          </span>
        )}
      </div>
      <small className="text-muted d-block mt-1" style={{ fontSize: "0.75rem" }}>
        {t("tickets.fileHint")}
      </small>

      {attachments.length > 0 && (
        <ul className={styles.attachmentList}>
          {attachments.map((file, idx) => (
            <li key={idx} className={styles.attachmentItem}>
              <span className={styles.attachmentIcon}>
                <i className="fa-solid fa-file" aria-hidden="true"></i>
              </span>
              <span className={styles.attachmentName}>{file.name}</span>
              <span className={styles.attachmentSize}>
                {(file.size / 1024).toFixed(1)} KB
              </span>
              <button
                type="button"
                className={styles.attachmentRemove}
                onClick={() => removeAttachment(idx)}
                aria-label={t("tickets.removeFile", { a: file.name })}
                disabled={disabled}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
