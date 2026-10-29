/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// API client — centralized axios instance with interceptors
// - Adds Authorization header automatically
// - On 401, attempts ONE silent refresh using the stored refresh token.
//   If the refresh succeeds, the original request is retried. If it fails,
//   the user is redirected to /login.
// - Normalizes errors into a consistent shape
// - Times out requests after 30s
import axios from "axios";
import { ENV } from "./utils/env";
import { toast } from "sonner";
import { tPlain } from "./i18n/plain";

const TOKEN_KEY = "token";
const REFRESH_KEY = "refreshToken";

// Sessions may live in localStorage ("remember me") OR sessionStorage —
// read/write whichever currently holds the token (session-first).
const store = () => (sessionStorage.getItem(TOKEN_KEY) ? sessionStorage : localStorage);
const getToken = () => store().getItem(TOKEN_KEY);
const getRefresh = () => store().getItem(REFRESH_KEY);
const setTokens = (t, r) => {
  const s = store();
  s.setItem(TOKEN_KEY, t);
  if (r) s.setItem(REFRESH_KEY, r);
};

const api = axios.create({
  baseURL: ENV.apiBaseUrl,
  timeout: 30000,
  withCredentials: false,
});

// ---------------------------------------------------------------------
// Request interceptor — attach token
// ---------------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

// ---------------------------------------------------------------------
// Response interceptor — normalize errors, attempt refresh on 401
// ---------------------------------------------------------------------
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => refreshSubscribers.push(cb);
const onRefreshed = (token) => refreshSubscribers.forEach((cb) => cb(token));
refreshSubscribers = [];

const redirectToLogin = (msg) => {
  [localStorage, sessionStorage].forEach((s) => {
    s.removeItem(TOKEN_KEY);
    s.removeItem(REFRESH_KEY);
    s.removeItem("user");
  });
  // tPlain: this toast can fire before React mounts (e.g. a page reload
  // with an expired refresh token) — resolve the language from storage.
  // Stable id: when several parallel requests all fail their refresh, they
  // REPLACE this toast instead of stacking N identical copies (fix-5, F14).
  toast.error(msg || tPlain("errors.sessionExpired"), { id: "session-expired" });
  setTimeout(() => {
    window.location.href = "/login";
  }, 800);
};

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // FIX(QA-fix-race): requests cancelled via AbortController (page/filter
    // changed mid-flight) are NOT errors — the caller already moved on.
    // Before this guard, a cancelled request fell into the no-response
    // branch, got normalized as "errors.network", and pages toasted a
    // phantom "network error" (e.g. React StrictMode's double-mount in dev
    // cancelled the first ticket fetch on every page load).
    if (
      error.code === "ERR_CANCELED" ||
      error.name === "CanceledError" ||
      error.name === "AbortError"
    ) {
      return Promise.reject({ canceled: true, message: "", status: 0, details: null });
    }

    let normalized = {
      success: false,
      status: 0,
      message: tPlain("errors.network"),
      details: null,
    };

    if (error.response) {
      const { status, data } = error.response;
      normalized.status = status;
      normalized.success = data?.success || false;
      normalized.message = data?.error?.message || data?.msg || tPlain("errors.requestFailed");
      normalized.details = data?.error?.details || null;

      // 401 with refresh attempt — only if we haven't already tried on this request
      if (status === 401 && !originalRequest._retry) {
        const refreshToken = getRefresh();
        if (refreshToken && !isRefreshing) {
          originalRequest._retry = true;
          isRefreshing = true;
          try {
            const res = await axios.post(
              `${ENV.apiBaseUrl}/auth/refresh`,
              { refreshToken },
              { timeout: 10000 }
            );
            const newToken = res.data.data.token;
            const newRefresh = res.data.data.refreshToken;
            setTokens(newToken, newRefresh);
            isRefreshing = false;
            onRefreshed(newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          } catch {
            isRefreshing = false;
            // The rejected `normalized` is what page-level catch blocks toast —
            // route it through tPlain so a second, raw-English "Invalid token"
            // toast can never appear next to the localized session-expired
            // one (fix-5, item F14).
            normalized.message = tPlain("errors.sessionExpired");
            redirectToLogin(tPlain("errors.sessionExpired"));
            return Promise.reject(normalized);
          }
        }
        // If a refresh is already in flight, queue this request until it finishes
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            subscribeTokenRefresh((newToken) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              api(originalRequest).then(resolve).catch(reject);
            });
          });
        }
      } else if (status === 429) {
        toast.error(tPlain("errors.tooManyRequests"));
      } else if (status >= 500) {
        toast.error(tPlain("errors.serverError"));
      }
      // Any OTHER 401 on a request that carried our bearer token (no refresh
      // token stored, or the post-refresh retry failed again) is a dead
      // session too — localize the message so the raw backend string
      // ("Invalid token" / "Token expired") can never surface in a toast.
      if (status === 401 && originalRequest?.headers?.Authorization) {
        normalized.message = tPlain("errors.sessionExpired");
      }
    } else if (error.code === "ECONNABORTED") {
      normalized.message = tPlain("errors.timeout");
    }

    return Promise.reject(normalized);
  }
);

export default api;
