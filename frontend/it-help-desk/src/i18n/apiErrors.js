/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// API error localization — maps the backend's known ENGLISH messages to i18n
// keys so they render in the ACTIVE language (BUG-qa2-5: raw EN strings were
// showing inside the Arabic UI). Unknown messages pass through unchanged —
// never blanked, never guessed.
//
// Usage (inside a component that has the t() function):
//   import { tApiError } from "../i18n/apiErrors";
//   toast.error(tApiError(err.message, t) || t("errors.loginFailed"));

// Exact-match map: raw backend message → i18n key.
// Sources: Backend/controller/authController.js, authExtrasController.js,
// app.js (rate limiters), middleware/errorMiddleware.js.
const EXACT = {
  "Invalid credentials": "errors.invalidCredentials",
  "Account temporarily locked. Try again in 15 minutes.": "errors.accountLocked",
  "Account suspended. Contact your administrator.": "errors.accountSuspended",
  "Please verify your email address before logging in. Check your inbox (and spam folder).":
    "errors.emailNotVerified",
  "MFA verification required": "errors.mfaRequired",
  "Too many requests, please try again later.": "errors.tooManyRequests",
  "Too many attempts. Account temporarily locked.": "errors.tooManyAttempts",
  "Validation error": "errors.validation",
  "Current password is incorrect": "errors.currentPasswordIncorrect",
  "New password must be different from current password": "errors.newPasswordMustDiffer",
  "Password must be at least 8 characters": "errors.passwordMinLength",
  "Password cannot exceed 128 characters": "errors.passwordMaxLength",
  "Password must contain at least one uppercase letter": "errors.passwordRuleUppercase",
  "Password must contain at least one lowercase letter": "errors.passwordRuleLowercase",
  "Password must contain at least one letter": "errors.passwordRuleLetter",
  "Password must contain at least one digit": "errors.passwordRuleDigit",
  "Password is incorrect": "errors.passwordIncorrect",
  "Invalid verification code. Check your authenticator clock and try again.": "errors.mfaInvalidCode",
  "You have already voted on this article": "errors.alreadyVoted",
  "Article not found": "errors.kbNotFound",
  "An article with this title (or a very similar one) already exists": "errors.kbDuplicateTitle",
  "Title must contain letters or digits to build a slug": "errors.kbSlugRequired",
  "Canned response not found": "errors.cannedNotFound",
  "Company not found": "errors.companyNotFound",
  "A company with this name already exists": "errors.companyDuplicateName",
  "Email already in use": "errors.emailInUse",
  "Token is invalid or expired": "errors.invalidToken",
  "Token is required": "errors.tokenRequired",
  "User not found": "errors.userNotFound",
  "Network error": "errors.network",
  "Request failed": "errors.requestFailed",
};

// Fuzzy fallbacks for messages that embed dynamic values (Joi detail strings
// like `"password" with value "x" fails to match the required pattern: ...`).
const PATTERNS = [
  [/fails to match the required pattern/i, "errors.passwordPolicy"],
  [/password.*pattern|uppercase|lowercase.*digit/i, "errors.passwordPolicy"],
  [/must be a valid email/i, "errors.validation"],
];

/**
 * Translate a backend/API error message into the active language.
 * @param {string|string[]|null} msg raw message (or Joi details array)
 * @param {(key: string) => string} t the i18n translate function
 * @returns {string} localized message, or the original when unknown
 */
export const tApiError = (msg, t) => {
  if (msg == null) return "";
  if (Array.isArray(msg)) return msg.map((m) => tApiError(m, t)).join(" · ");
  const raw = String(msg).trim();
  if (!raw) return "";
  const exact = EXACT[raw];
  if (exact) return t(exact);
  const fuzzy = PATTERNS.find(([re]) => re.test(raw));
  if (fuzzy) return t(fuzzy[1]);
  return raw;
};

export default tApiError;
