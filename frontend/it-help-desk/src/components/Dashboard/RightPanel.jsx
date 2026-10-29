/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Right panel of the dashboard — profile menu card, quick actions and the
// "need help" card. One visual column, one module.
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import styles from "./DashboardContent.module.css";
import {
  IconUser, IconLock, IconBell, IconLogout, IconPlus, IconList,
  IconBookOpen, IconGear, IconHeadset, IconArrowRight,
} from "./icons";

/* ------------------ Profile menu card ------------------ */
const ProfileCard = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  const userName = user?.name || "User";
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  const menu = [
    { icon: <IconUser />, label: t("side.profile"), run: () => navigate("/settings") },
    { icon: <IconLock />, label: t("side.changePassword"), run: () => navigate("/settings") },
    {
      icon: <IconBell />, label: t("nav.notifications"), badge: unreadCount,
      run: () => navigate("/notifications"),
    },
    { icon: <IconLogout />, label: t("nav.logout"), run: () => logout(), danger: true },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.profileHead}>
        <div className={styles.profileAvatar} aria-hidden="true">
          {user?.profileImage ? (
            <img src={user.profileImage} alt="" />
          ) : (
            initials || <IconUser />
          )}
        </div>
        <div className={styles.profileMeta}>
          <div className={styles.profileName}>{userName}</div>
          <div className={styles.profileRole}>{t(`role.${user?.role || "user"}`)}</div>
        </div>
      </div>
      <div className={styles.menuDivider} aria-hidden="true"></div>
      <nav className={styles.profileMenu} aria-label={t("nav.profileMenu")}>
        {menu.map((m) => (
          <button key={m.label} className={`${styles.menuItem} ${m.danger ? styles.menuDanger : ""}`} onClick={m.run}>
            {m.icon}
            <span className={styles.menuLabel}>{m.label}</span>
            {m.badge > 0 && (
              <span className={styles.menuBadge}>{m.badge > 9 ? "9+" : m.badge}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

/* ------------------ Quick actions ------------------ */
const QuickActions = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isStaff } = useAuth();

  const actions = [
    { icon: <IconPlus />, label: t("side.newTicket"), cls: "qaBlue", run: () => navigate("/tickets") },
    ...(isStaff
      ? [{ icon: <IconList />, label: t("side.myQueue"), cls: "qaPurple", run: () => navigate("/queue") }]
      : []),
    { icon: <IconBookOpen />, label: t("side.knowledgeBase"), cls: "qaGreen", run: () => navigate("/kb") },
    { icon: <IconGear />, label: t("side.settings"), cls: "qaSlate", run: () => navigate("/settings") },
  ];

  return (
    <div className={styles.card}>
      <h6 className={styles.sideTitle}>{t("side.quickActions")}</h6>
      <div className={styles.qaGrid}>
        {actions.map((a) => (
          <button key={a.label} className={styles.qaTile} onClick={a.run}>
            <span className={`${styles.qaIcon} ${styles[a.cls]}`}>{a.icon}</span>
            <span className={styles.qaLabel}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ------------------ Need help ------------------ */
const NeedHelp = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <div className={styles.needHelp}>
      <div className={styles.nhIcon} aria-hidden="true"><IconHeadset /></div>
      <h6 className={styles.nhTitle}>{t("side.needHelp")}</h6>
      <p className={styles.nhText}>{t("side.needHelpText")}</p>
      <button className={styles.nhBtn} onClick={() => navigate("/tickets")}>
        {t("side.contactSupport")}
        <IconArrowRight />
      </button>
    </div>
  );
};

const RightPanel = () => (
  <aside className={styles.sideCol}>
    <ProfileCard />
    <QuickActions />
    <NeedHelp />
  </aside>
);

export default RightPanel;
