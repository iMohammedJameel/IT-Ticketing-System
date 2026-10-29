/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Status stepper — visualizes the open → in-progress → resolved → closed flow
import { STATUS_FLOW } from "../ticketConstants";
import { useI18n } from "../../../i18n";

const StatusStepper = ({ status }) => {
  const { t } = useI18n();
  const currentIdx = STATUS_FLOW.indexOf(status);
  return (
    <div className="stepper" aria-label={t("tickets.statusFlow")}>
      {STATUS_FLOW.map((s, i) => {
        const cls = i < currentIdx ? "done" : i === currentIdx ? "current" : "";
        return (
          <div key={s} className={`stepper-step ${cls}`}>
            <div className="stepper-dot">
              {i < currentIdx ? <i className="fa-solid fa-check" aria-hidden="true"></i> : null}
            </div>
            <div>{t(`status.${s}`)}</div>
          </div>
        );
      })}
    </div>
  );
};

export default StatusStepper;
