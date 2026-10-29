/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// MFA (TOTP) login verification — runs only for accounts with MFA enabled.
// Extracted from the login handler so its control flow stays readable.
//
// Missing/invalid token → 401 with a recognizable code so the frontend
// can render the MFA input step instead of a generic "bad credentials".
const totp = require("../../services/totpService");
const { AppError } = require("../../middleware/errorMiddleware");
const { registerFailedLoginAttempt, LOGIN_ERRORS } = require("./authHelpers");

// Verify the supplied token against the user's TOTP secret, falling back to
// single-use recovery codes (each works once, then is burned).
// `user` carries the failed-attempt counters; `mfaUser` carries the hidden
// MFA fields (re-selected with .select("+mfaSecret +mfaRecoveryCodes")).
const verifyMfaLogin = async (user, mfaUser, supplied) => {
  const token = (supplied || "").trim();

  let ok = false;
  if (token && mfaUser.mfaSecret) {
    ok = totp.verifyTotp(mfaUser.mfaSecret, token);
    // Fall back to single-use recovery codes (each works once, then is burned)
    if (!ok && token.includes("-") && mfaUser.mfaRecoveryCodes?.length) {
      if (totp.matchRecoveryCode(mfaUser.mfaRecoveryCodes, token)) {
        ok = true;
        mfaUser.mfaRecoveryCodes = mfaUser.mfaRecoveryCodes.filter(
          (h) => h !== totp.sha256(token.trim().toUpperCase())
        );
        await mfaUser.save();
      }
    }
  }

  if (!ok) {
    // Count MFA failures toward the brute-force lockout too
    registerFailedLoginAttempt(user);
    await user.save();
    throw new AppError(
      user.isLocked ? LOGIN_ERRORS.LOCKED : "MFA verification required",
      user.isLocked ? 423 : 401,
      [{ code: user.isLocked ? "account_locked" : "mfa_required" }]
    );
  }

  return true;
};

module.exports = { verifyMfaLogin };
