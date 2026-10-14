/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
import { BrowserRouter } from "react-router-dom";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// NOTE: Bootstrap CSS is NOT statically imported anymore — it is swapped
// between the LTR and RTL builds by the i18n provider (see src/i18n).
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./index.css";
import App from "./App.jsx";
import { LanguageProvider } from "./i18n";
import AppToaster from "./components/common/AppToaster";
import ATTRIBUTION from "./attribution";

// Console signature (standard practice — Next.js/Vue/React DevTools do the
// same): visible to anyone who opens devtools on the deployed app. Part of
// the attribution layer (LICENSE + NOTICE).
console.info(
  `%c ${ATTRIBUTION.product} %c © ${new Date().getFullYear()} ${ATTRIBUTION.author} — ${ATTRIBUTION.url} `,
  "background:#4f46e5;color:#fff;border-radius:3px 0 0 3px;padding:1px 6px;font-weight:600",
  "background:#111;color:#e5e7eb;border-radius:0 3px 3px 0;padding:1px 6px"
);
// Hidden DOM marker — survives minification, visible in page source.
document.documentElement.setAttribute("data-app-author", ATTRIBUTION.author);
document.documentElement.setAttribute("data-app-signature", ATTRIBUTION.signature);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <App />
        <AppToaster />
      </BrowserRouter>
    </LanguageProvider>
  </StrictMode>
);
