/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// ProfileCard — left-column profile card: avatar (multipart upload, no more
// base64 in the DB), name, role label, email-verification alert + resend.
// Extracted from Settings.jsx.
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../../context/AuthContext";
import { useI18n } from "../../../i18n";
import { tApiError } from "../../../i18n/apiErrors";
import { authService } from "../../../services/authService";
import Spinner from "../../../components/common/Spinner";
import styles from "../Settings.module.css";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export default function ProfileCard() {
  const { user, updateUser, isAdmin, isStaff } = useAuth();
  const { t } = useI18n();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // MULTIPART upload via /auth/avatar (the old base64 endpoint bloated the
  // user document; files now live in storage).
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(t("settings.imageTooLarge"));
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error(t("settings.imageOnly"));
      return;
    }

    setPreviewImage(URL.createObjectURL(file));
    setUploadingImage(true);
    try {
      const res = await authService.uploadAvatar(file);
      updateUser(res.data.user);
      toast.success(t("settings.imageUpdated"));
      setPreviewImage(null);
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("settings.imageUpdateFailed"));
      setPreviewImage(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await authService.resendVerification();
      toast.success(t("settings.resendSent"));
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("settings.resendFailed"));
    }
  };

  const profileImageSrc = previewImage || user?.profileImage;

  return (
    <div className={`${styles.card} mb-4`}>
      <div className={`${styles.profileSection} text-center`}>
        <div className={styles.avatarWrapper}>
          <div className={styles.avatarLarge}>
            {profileImageSrc ? (
              <img
                src={profileImageSrc}
                alt={t("settings.profileAlt")}
                className="w-100 h-100 rounded-circle object-fit-cover"
              />
            ) : (
              <i className="fa-solid fa-user" aria-hidden="true"></i>
            )}
            {uploadingImage && (
              <div className={styles.avatarLoading}>
                <Spinner size="sm" label="" />
              </div>
            )}
          </div>
          <label htmlFor="imageUpload" className={styles.cameraBtn} aria-label={t("settings.uploadImageAria")}>
            <i className="fa-solid fa-camera" aria-hidden="true"></i>
          </label>
          <input
            type="file"
            id="imageUpload"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleImageUpload}
            style={{ display: "none" }}
            disabled={uploadingImage}
          />
        </div>
        <h6 className={styles.profileName}>{user?.name || t("settings.yourName")}</h6>
        <p className={styles.profileRole}>
          {isAdmin ? t("role.admin") : isStaff ? t("role.agent") : t("role.user")}
        </p>
        {user && !user.emailVerifiedAt && (
          <div className="alert alert-warning mt-3 py-2" style={{ fontSize: "0.8rem" }}>
            <i className="fa-solid fa-triangle-exclamation me-1" aria-hidden="true"></i>
            {t("settings.emailNotVerified")}
            <button
              type="button"
              className="btn btn-sm btn-link p-0 ms-2"
              onClick={handleResendVerification}
            >
              {t("settings.resend")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
