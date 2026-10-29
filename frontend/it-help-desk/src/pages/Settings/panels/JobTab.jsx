/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// JobTab — job details form (title / department / phone), persisted to the
// backend (was localStorage before). Extracted from Settings.jsx.
import { useI18n } from "../../../i18n";
import Spinner from "../../../components/common/Spinner";

const DEPARTMENTS = ["IT", "HR", "Sales", "Support", "Finance", "Operations", "Marketing"];

export default function JobTab({ jobForm, setJobForm, loading, onSave }) {
  const { t } = useI18n();

  return (
    <form onSubmit={onSave}>
      <div className="mb-3">
        <label htmlFor="job-title" className="form-label">{t("settings.jobTitleLabel")}</label>
        <input
          id="job-title"
          type="text"
          className="form-control"
          value={jobForm.jobTitle}
          onChange={(e) => setJobForm({ ...jobForm, jobTitle: e.target.value })}
          placeholder={t("settings.jobTitlePh")}
          maxLength={100}
        />
      </div>
      <div className="mb-3">
        <label htmlFor="job-dept" className="form-label">{t("settings.department")}</label>
        <select
          id="job-dept"
          className="form-select"
          value={jobForm.department}
          onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
        >
          <option value="">{t("settings.selectDepartment")}</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label htmlFor="job-phone" className="form-label">{t("settings.phone")}</label>
        <input
          id="job-phone"
          type="tel"
          className="form-control"
          value={jobForm.phone}
          onChange={(e) => setJobForm({ ...jobForm, phone: e.target.value })}
          placeholder="+20 100 000 0000"
          autoComplete="tel"
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? <Spinner size="sm" label={t("settings.saving")} /> : t("settings.saveJob")}
      </button>
    </form>
  );
}
