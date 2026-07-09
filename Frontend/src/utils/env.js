// Centralized environment config for the frontend
// Reads from Vite env vars (must start with VITE_)

export const ENV = {
  apiBaseUrl: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  wsUrl: import.meta.env.VITE_WS_URL || "http://localhost:5000",
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};

// Toast configuration
export const TOAST_CONFIG = {
  position: "top-right",
  duration: 4000,
};
