/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// i18n — lightweight bilingual (EN/AR) system with RTL support.
// Usage:
//   const { t, lang, setLang, dir } = useI18n();
//   <h1>{t("tickets.title")}</h1>
// Language is persisted in localStorage and applied to <html lang/dir> so the
// WHOLE app (Bootstrap included) flips to RTL when Arabic is active.
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { EN } from "./en";
import { AR } from "./ar";

const LanguageContext = createContext(null);

const LANG_KEY = "app_language";

// Flat "a.b.c" key lookup with EN fallback
const resolve = (dict, key) => {
  const parts = key.split(".");
  let cur = dict;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object" || !(p in cur)) return undefined;
    cur = cur[p];
  }
  return cur;
};

export const LanguageProvider = ({ children }) => {
  // Arabic-first product: EXPLICIT default "ar" (matches the anti-flash
  // script in index.html) so a first visit is consistently AR + RTL —
  // never Arabic text trapped in an LTR document.
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem(LANG_KEY);
    return stored === "ar" || stored === "en" ? stored : "ar";
  });

  const dir = lang === "ar" ? "rtl" : "ltr";

  // Apply to <html> so document direction + Bootstrap RTL utilities engage.
  // ALSO swap the Bootstrap stylesheet between the LTR and RTL builds —
  // setting dir="rtl" alone is NOT enough: the LTR build uses physical
  // properties for ms-*/me-*/text-start utilities, so half the layout would
  // stay flipped. Both builds are self-hosted in /public/vendor.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    const link = document.getElementById("bootstrap-css");
    if (link) {
      link.href = dir === "rtl" ? "/vendor/bootstrap.rtl.min.css" : "/vendor/bootstrap.min.css";
    }
  }, [lang, dir]);

  const setLang = useCallback((next) => {
    const l = next === "ar" ? "ar" : "en";
    localStorage.setItem(LANG_KEY, l);
    setLangState(l);
  }, []);

  const toggleLang = useCallback(() => setLang(lang === "ar" ? "en" : "ar"), [lang, setLang]);

  // t("key") — resolves the ACTIVE language dictionary first, falls back
  // to the other dictionary for missing keys, then to the key itself.
  // (Previously this always resolved AR first, which made an English UI
  // unattainable — the P1 i18n defect from the QA pass.)
  const t = useCallback(
    (key, vars) => {
      const primary = lang === "ar" ? AR : EN;
      const fallback = lang === "ar" ? EN : AR;
      let str = resolve(primary, key);
      if (str === undefined) str = resolve(fallback, key);
      if (str === undefined) return key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        });
      }
      return str;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ t, lang, setLang, toggleLang, isRtl: lang === "ar" }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
};

export default LanguageContext;
