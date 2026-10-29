/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// NotificationPrefs — per-user notification preference switches (saved as
// part of the profile). Extracted from Settings.jsx.
import { useAuth } from "../../../context/AuthContext";
import { useI18n } from "../../../i18n";
import { tApiError } from "../../../i18n/apiErrors";
import { toast } from "sonner";
import { authService } from "../../../services/authService";
import styles from "../Settings.module.css";

const PREF_KEYS = [
  "ticketCreated",
  "ticketAssigned",
  "ticketStatusChanged",
  "ticketCommented",
  "slaBreaching",
];

export default function NotificationPrefs({ notifPrefs, setNotifPrefs }) {
  const { t } = useI18n();
  const { updateUser } = useAuth();

  // Optimistic toggle: flip the switch, PATCH the profile, revert ONLY this
  // key on failure (restoring the whole snapshot could clobber another
  // toggle that succeeded meanwhile).
  const handleNotifPrefChange = (key) => async (e) => {
    const checked = e.target.checked;
    const newPrefs = { ...notifPrefs, [key]: checked };
    setNotifPrefs(newPrefs);
    try {
      const res = await authService.updateProfile({ notificationPrefs: newPrefs });
      updateUser(res.data.user);
      toast.success(t("settings.notifUpdated"));
    } catch (err) {
      toast.error(tApiError(err.message, t) || t("settings.notifUpdateFailed"));
      setNotifPrefs((prev) => ({ ...prev, [key]: !checked }));
    }
  };

  return (
    <div className={styles.card}>
      <h6 className={styles.cardTitle}>{t("settings.notifTitle")}</h6>
      <div className={styles.notifPrefs}>
        {PREF_KEYS.map((key) => (
          <div key={key} className={styles.notifPrefItem}>
            <label htmlFor={`notif-${key}`} className="form-check-label">
              {t(`settings.notif.${key}`)}
            </label>
            <div className="form-check form-switch">
              <input
                type="checkbox"
                className="form-check-input"
                id={`notif-${key}`}
                checked={notifPrefs[key] ?? true}
                onChange={handleNotifPrefChange(key)}
                role="switch"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
