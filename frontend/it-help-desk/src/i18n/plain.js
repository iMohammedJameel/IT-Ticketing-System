/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Plain (non-React) translation helper — for module-scope code that lives
// OUTSIDE the component tree (api.jsx interceptors fire before React mounts,
// service callbacks, ...). Reads the persisted language DIRECTLY from
// localStorage using the SAME key + default as LanguageProvider
// (src/i18n/index.jsx: LANG_KEY "app_language", default "ar").
//
// Usage:  import { tPlain } from "./i18n/plain";
//         toast.error(tPlain("errors.sessionExpired"));
import { EN } from "./en";
import { AR } from "./ar";

const LANG_KEY = "app_language";

// Same flat "a.b.c" lookup as the provider's resolver
const resolve = (dict, key) => {
  const parts = key.split(".");
  let cur = dict;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object" || !(p in cur)) return undefined;
    cur = cur[p];
  }
  return cur;
};

/**
 * Translate a key using the ACTIVE language (from storage, default "ar"),
 * falling back to the other dictionary, then to the key itself.
 * Mirrors useI18n().t() but works without React context.
 */
export const tPlain = (key) => {
  let lang = "ar";
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "ar" || stored === "en") lang = stored;
  } catch {
    // localStorage unavailable (privacy mode / SSR) — keep the AR default
  }
  const primary = lang === "ar" ? AR : EN;
  const fallback = lang === "ar" ? EN : AR;
  let str = resolve(primary, key);
  if (str === undefined) str = resolve(fallback, key);
  return str === undefined ? key : str;
};

export default tPlain;
