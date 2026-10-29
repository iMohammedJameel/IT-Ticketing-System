/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Stat card (reference layout: tinted icon square + label row, big
// value, trend row with colored arrow + "vs. last week").
// Trend COLOR is semantic like the reference — rising is GREEN for
// good metrics (Total/Resolved) and RED for bad ones (Open/SLA),
// falling is the inverse — so `inverted` cards flip the palette.
import { useI18n } from "../../i18n";
import { Skeleton } from "../../components/common/Skeleton";
import styles from "./DashboardContent.module.css";
import { IconTrendUp, IconTrendDown } from "./icons";

const StatCard = ({ card, loading }) => {
  const { t } = useI18n();
  const good = card.trend
    ? card.inverted
      ? card.trend.dir === "down"
      : card.trend.dir === "up"
    : false;
  return (
    <div className={styles.statCard}>
      <div className={styles.statTop}>
        <span className={styles.statIcon} style={{ background: card.tint, color: card.accent }}>
          {card.icon}
        </span>
        <span className={styles.statLabel}>{card.label}</span>
      </div>
      <div className={styles.statValue}>
        {loading ? <Skeleton width="2.4rem" /> : card.value}
      </div>
      <div className={styles.statTrend}>
        {card.trend && card.trend.dir !== "flat" && (
          <span className={`${styles.trendVal} ${good ? styles.trendGood : styles.trendBad}`}>
            {card.trend.dir === "up" ? <IconTrendUp /> : <IconTrendDown />}
            {Math.abs(card.trend.pct)}%
          </span>
        )}
        <span className={styles.statVs}>{t("dashboard.vsLastWeek")}</span>
      </div>
    </div>
  );
};

export default StatCard;
