/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// useTicketDraft — create-ticket draft autosave.
// Extracted from Tickets.jsx: a half-filled form survives a refresh /
// accidental nav. Restored on mount, cleared on submit. "Has draft" is
// DERIVED at render time (no extra state → no sync setState in effects).
import { useEffect, useState } from "react";

const DRAFT_KEY = "ticket_draft";

export const EMPTY_FORM = {
  product: "",
  company: "",
  subject: "",
  category: "other",
  priority: "medium",
  description: "",
};

const loadDraft = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    return saved && typeof saved === "object" ? { ...EMPTY_FORM, ...saved } : EMPTY_FORM;
  } catch {
    return EMPTY_FORM;
  }
};

export function useTicketDraft() {
  const [form, setForm] = useState(loadDraft);

  const hasDraft = !!(form.product || form.company || form.subject || form.description);

  // Persist draft — external system write, only when it actually changed
  useEffect(() => {
    if (hasDraft) localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    else localStorage.removeItem(DRAFT_KEY);
  }, [form, hasDraft]);

  const updateField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const handleChange = (e) => updateField(e.target.name, e.target.value);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    localStorage.removeItem(DRAFT_KEY);
  };

  return { form, setForm, hasDraft, handleChange, updateField, resetForm };
}
