/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// useKbDeflection — KB deflection for the create-ticket form.
// Extracted from Tickets.jsx: while typing the description, matching
// published help articles appear so requesters may solve it without a
// ticket. Debounced 600ms on description/product typing.
//
// "Active" suggestions are DERIVED at render time (short query → empty
// list) instead of clearing state inside the effect — the same no-sync-
// setState-in-effect pattern the draft hook uses.
import { useEffect, useState } from "react";
import { kbService } from "../../../services/kbService";

const MIN_QUERY_LENGTH = 6;
const DEBOUNCE_MS = 600;

export function useKbDeflection(product, description, enabled = true) {
  const [fetchedSuggestions, setFetchedSuggestions] = useState([]);
  const [fetchingKb, setFetchingKb] = useState(false);

  const query = `${product} ${description}`.trim();
  const active = enabled && query.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(async () => {
      setFetchingKb(true);
      try {
        const res = await kbService.list({ search: product || description.slice(0, 60), limit: 3 });
        setFetchedSuggestions(res.data.articles || []);
      } catch {
        setFetchedSuggestions([]);
      } finally {
        setFetchingKb(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [product, description, active]);

  return {
    kbSuggestions: active ? fetchedSuggestions : [],
    fetchingKb: active && fetchingKb,
  };
}
