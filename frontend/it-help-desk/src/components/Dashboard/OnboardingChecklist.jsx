/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// First-run checklist (dismissible) — renders null once setup tasks are
// complete, so the reference layout is untouched in the steady state.
import { useNavigate } from "react-router-dom";
import { ticketService } from "../../services/ticketService";
import { authService } from "../../services/authService";
import { companyService } from "../../services/companyService";
import { kbService } from "../../services/kbService";
import { useAsync, useLocalStorage } from "../../hooks";
import { useI18n } from "../../i18n";
import styles from "./DashboardContent.module.css";

const OnboardingChecklist = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useLocalStorage("onboarding_dismissed", false);

  const { data: agentsData } = useAsync(
    () => authService.getAllUsers({ role: "agent", limit: 1, status: "active" }), []
  );
  const { data: companiesData } = useAsync(() => companyService.list({ limit: 1 }), []);
  const { data: kbData } = useAsync(() => kbService.list({ limit: 1 }), []);
  const { data: slaData } = useAsync(() => ticketService.getSlaPolicies(), []);

  const items = [
    { label: t("onboarding.agents"), done: (agentsData?.data?.pagination?.total ?? 0) > 0, path: "/users" },
    { label: t("onboarding.companies"), done: (companiesData?.data?.companies?.length ?? 0) > 0, path: "/settings" },
    { label: t("onboarding.kbArticle"), done: (kbData?.data?.articles?.length ?? 0) > 0, path: "/kb" },
    { label: t("onboarding.slaPolicy"), done: (slaData?.data?.policies?.length ?? 0) > 0, path: "/settings" },
  ];
  const allDone = items.every((i) => i.done);

  if (dismissed || allDone) return null;

  return (
    <div className={`${styles.card} ${styles.onboard}`} role="status">
      <div className={styles.onboardHead}>
        <h6 className={styles.cardTitle}>
          <i className="fa-solid fa-rocket me-1" aria-hidden="true"></i>
          {t("onboarding.title")}
        </h6>
        <button
          className={styles.onboardClose}
          onClick={() => setDismissed(true)}
          aria-label={t("common.close")}
        >
          <i className="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <div className={styles.onboardItems}>
        {items.map((item) => (
          <button
            key={item.label}
            className={styles.onboardItem}
            onClick={() => navigate(item.path)}
            style={{ opacity: item.done ? 0.65 : 1 }}
          >
            <i
              className={`fa-solid ${item.done ? "fa-circle-check" : "fa-circle"} ${styles.onboardIcon}`}
              style={{ color: item.done ? "var(--status-resolved)" : "var(--text-muted)" }}
              aria-hidden="true"
            ></i>
            <span style={{ textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default OnboardingChecklist;
