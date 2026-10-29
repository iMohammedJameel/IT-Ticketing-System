/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// SettingsTabs — the settings tab bar (personal / job / password / security,
// plus admin-only canned-responses and companies tabs).
// Extracted from Settings.jsx; driven entirely by `activeTab` + `setActiveTab`.
import { useI18n } from "../../../i18n";

const PUBLIC_TABS = [
  { id: "personal", labelKey: "settings.tabs.personal" },
  { id: "job", labelKey: "settings.tabs.job" },
  { id: "password", labelKey: "settings.tabs.password" },
  { id: "security", labelKey: "settings.tabs.security" },
];

const ADMIN_TABS = [
  { id: "canned", labelKey: "settings.tabs.canned" },
  { id: "companies", labelKey: "settings.tabs.companies" },
];

export default function SettingsTabs({ activeTab, setActiveTab, isAdmin }) {
  const { t } = useI18n();
  const tabs = isAdmin ? [...PUBLIC_TABS, ...ADMIN_TABS] : PUBLIC_TABS;

  return (
    <ul className="nav nav-tabs mb-4" role="tablist">
      {tabs.map(({ id, labelKey }) => (
        <li key={id} className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === id ? "active" : ""}`}
            onClick={() => setActiveTab(id)}
            role="tab"
            aria-selected={activeTab === id}
          >
            {t(labelKey)}
          </button>
        </li>
      ))}
    </ul>
  );
}
