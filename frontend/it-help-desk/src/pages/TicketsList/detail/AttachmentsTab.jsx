/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Attachments tab — image thumbnails grid + full file list with sizes.
import EmptyState from "../../../components/common/EmptyState";
import { useI18n } from "../../../i18n";
import styles from "../TicketsList.module.css";

const isImage = (att) =>
  att.mimetype?.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(att.filename || "");

const AttachmentsTab = ({ attachments }) => {
  const { t } = useI18n();
  const files = attachments || [];

  if (files.length === 0) {
    return (
      <div>
        <EmptyState icon="fa-regular fa-folder-open" title={t("tickets.noAttachments")} description={t("tickets.noAttachmentsHint")} />
      </div>
    );
  }

  return (
    <div>
      {files.filter(isImage).length > 0 && (
        <div className={styles.thumbGrid}>
          {files.filter(isImage).map((att, idx) => (
            <a
              key={idx}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.thumbItem}
              title={att.filename}
            >
              <img src={att.url} alt={att.filename} loading="lazy" />
            </a>
          ))}
        </div>
      )}
      <div className={styles.attachmentsList}>
        {files.map((att, idx) => (
          <div key={idx} className={styles.attachmentItem}>
            <i className={`${isImage(att) ? "fa-regular fa-file-image" : "fa-regular fa-file"} me-2`} aria-hidden="true"></i>
            <a
              href={att.url}
              download={att.filename}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.attachmentLink}
            >
              {att.filename}
            </a>
            <span className="text-muted ms-2" style={{ fontSize: "0.75rem" }}>
              ({(att.size / 1024).toFixed(1)} KB)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttachmentsTab;
