/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Attachments tab — image thumbnails grid + full file list with sizes.
// FIX(QA-td7): the attachment endpoint is AUTHENTICATED (Bearer token) and
// forces download (octet-stream). A raw <img src> / <a href> carries NO
// Authorization header, so every thumbnail rendered as a broken image and
// every download link 401'd — the whole tab was dead weight. Previews and
// downloads now stream through the api client (token attached by the
// interceptor) as blobs: images become object URLs for the thumbnail grid,
// file rows trigger a programmatic download. A fetch failure renders a
// neutral "preview unavailable" tile instead of the browser's broken-image
// glyph, and a toast tells the user when a download fails.
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import api from "../../../api";
import EmptyState from "../../../components/common/EmptyState";
import { useI18n } from "../../../i18n";
import styles from "../TicketsList.module.css";

const isImage = (att) =>
  att.mimetype?.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(att.filename || "");

// Stored URLs are "/api/tickets/…" — the api client's baseURL already ends
// in /api, so strip the duplicate prefix before requesting.
const apiPath = (url) => url.replace(/^\/api(?=\/)/, "");

const AttachmentsTab = ({ attachments }) => {
  const { t } = useI18n();
  const files = attachments || [];
  const images = files.filter(isImage);
  // FIX(QA-td7): per-url preview state — "loading" | "ok" | "error"
  const [previews, setPreviews] = useState({});
  const key = images.map((a) => a.url).join("|");

  useEffect(() => {
    let cancelled = false;
    const objectUrls = [];
    setPreviews({});
    for (const att of images) {
      api
        .get(apiPath(att.url), { responseType: "blob" })
        .then((data) => {
          if (cancelled) return;
          // The endpoint serves octet-stream — re-type the blob so <img>
          // accepts it (use the attachment's stored mimetype).
          const raw = data instanceof Blob ? data : new Blob([data]);
          const blob = raw.type?.startsWith("image/") ? raw : new Blob([raw], { type: att.mimetype || "image/png" });
          const src = URL.createObjectURL(blob);
          objectUrls.push(src);
          setPreviews((p) => ({ ...p, [att.url]: { status: "ok", src } }));
        })
        .catch(() => {
          if (!cancelled) setPreviews((p) => ({ ...p, [att.url]: { status: "error" } }));
        });
    }
    return () => {
      cancelled = true;
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the exact URL set
  }, [key]);

  // FIX(QA-td7): authenticated download — anchor hrefs carry no token, so
  // fetch the blob via the api client and trigger a programmatic download.
  const downloadFile = useCallback(
    async (e, att) => {
      e.preventDefault();
      try {
        const data = await api.get(apiPath(att.url), { responseType: "blob" });
        const raw = data instanceof Blob ? data : new Blob([data]);
        const blob = new Blob([raw], { type: att.mimetype || "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = att.filename || "attachment";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } catch {
        toast.error(t("tickets.downloadFailed"));
      }
    },
    [t]
  );

  if (files.length === 0) {
    return (
      <div>
        <EmptyState icon="fa-regular fa-folder-open" title={t("tickets.noAttachments")} description={t("tickets.noAttachmentsHint")} />
      </div>
    );
  }

  return (
    <div>
      {images.length > 0 && (
        <div className={styles.thumbGrid}>
          {images.map((att, idx) => {
            const p = previews[att.url] || { status: "loading" };
            if (p.status === "ok") {
              return (
                <a
                  key={idx}
                  href={p.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.thumbItem}
                  title={att.filename}
                >
                  <img src={p.src} alt={att.filename} />
                </a>
              );
            }
            if (p.status === "error") {
              // graceful fallback — never show the browser's broken-image glyph
              return (
                <div key={idx} className={`${styles.thumbItem} ${styles.thumbFallback}`} title={att.filename}>
                  <i className="fa-regular fa-file-image" aria-hidden="true"></i>
                  <span>{t("tickets.previewUnavailable")}</span>
                </div>
              );
            }
            return <div key={idx} className={`${styles.thumbItem} ${styles.thumbLoading}`} title={att.filename}></div>;
          })}
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
              onClick={(e) => downloadFile(e, att)}
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
