/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Centralized environment config for the frontend
// Reads from Vite env vars (must start with VITE_)

export const ENV = {
  apiBaseUrl: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  // "" = same-origin WebSocket (nginx proxies /socket.io in production).
  // NOTE: must check for undefined — an EMPTY string env var means same-origin
  // and must NOT fall back to localhost.
  wsUrl: import.meta.env.VITE_WS_URL !== undefined ? import.meta.env.VITE_WS_URL : "http://localhost:5000",
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};

// Toast configuration
export const TOAST_CONFIG = {
  position: "top-right",
  duration: 4000,
};
