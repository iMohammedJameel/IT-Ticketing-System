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

const TOKEN_KEY = "token";
const REFRESH_KEY = "refreshToken";

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
    const token = localStorage.getItem(TOKEN_KEY);
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
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem("user");
  toast.error(msg || "Session expired. Please login again.");
  setTimeout(() => {
    window.location.href = "/login";
  }, 800);
};

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    let normalized = {
      success: false,
      status: 0,
      message: "Network error",
      details: null,
    };

    if (error.response) {
      const { status, data } = error.response;
      normalized.status = status;
      normalized.success = data?.success || false;
      normalized.message = data?.error?.message || data?.msg || "Request failed";
      normalized.details = data?.error?.details || null;

      // 401 with refresh attempt — only if we haven't already tried on this request
      if (status === 401 && !originalRequest._retry) {
        const refreshToken = localStorage.getItem(REFRESH_KEY);
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
            localStorage.setItem(TOKEN_KEY, newToken);
            localStorage.setItem(REFRESH_KEY, newRefresh);
            isRefreshing = false;
            onRefreshed(newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          } catch (refreshErr) {
            isRefreshing = false;
            redirectToLogin("Session expired. Please login again.");
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
        toast.error("Too many requests. Please slow down.");
      } else if (status >= 500) {
        toast.error("Server error. Please try again later.");
      }
    } else if (error.code === "ECONNABORTED") {
      normalized.message = "Request timed out. Please check your connection.";
    }

    return Promise.reject(normalized);
  }
);

export default api;
