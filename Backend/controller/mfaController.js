/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// MFA (TOTP) controller — setup, enable, disable. Zero-dependency TOTP via
// services/totpService. Flow:
//   1. POST /auth/mfa/setup    → server stores a PENDING secret, returns
//                                otpauth:// URI + a self-hosted QR code
//                                (PNG data URL) for the user to scan
//   2. POST /auth/mfa/enable   → user submits a 6-digit code from their
//                                authenticator; on match mfaEnabled=true and
//                                5 single-use recovery codes are returned ONCE
//   3. Login: if mfaEnabled, `mfaToken` (TOTP or recovery code) is required
//   4. POST /auth/mfa/disable → password required to turn it off
const QRCode = require("qrcode");
const User = require("../models/User");
const { AppError } = require("../middleware/errorMiddleware");
const bcrypt = require("bcrypt");
const totp = require("../services/totpService");

// POST /auth/mfa/setup — authenticated
const setup = async (req, res, next) => {
  try {
    const user = await User.findById(req.user).select("+mfaSecret");
    if (!user) throw new AppError("User not found", 404);
    if (user.mfaEnabled) throw new AppError("MFA is already enabled. Disable it first to re-enroll.", 400);

    const secret = totp.generateSecret();
    user.mfaSecret = secret; // NOT enabled until verified in step 2
    await user.save();

    const otpauth = totp.otpauthUrl({ secret, email: user.email, issuer: "IT Help Desk" });

    // QR is rendered server-side into a PNG data URL — the otpauth URI (which
    // embeds the secret) NEVER leaves this machine. The old implementation
    // piped it through the third-party api.qrserver.com, leaking the TOTP
    // secret to an external service.
    let qrDataUrl = null;
    try {
      qrDataUrl = await QRCode.toDataURL(otpauth, { margin: 1, width: 220 });
    } catch (e) {
      // QR generation failing is not fatal — the manual secret still works
      qrDataUrl = null;
    }

    res.status(200).json({
      success: true,
      data: {
        secret, // shown for manual entry in authenticator apps
        otpauthUrl: otpauth,
        // Self-hosted QR (PNG data URL, safe to drop straight into <img src>)
        qrDataUrl,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /auth/mfa/enable { token } — authenticated
const enable = async (req, res, next) => {
  try {
    const { token } = req.body || {};
    if (!token || typeof token !== "string") throw new AppError("`token` (6-digit code) required", 400);

    const user = await User.findById(req.user).select("+mfaSecret +mfaRecoveryCodes");
    if (!user) throw new AppError("User not found", 404);
    if (!user.mfaSecret) throw new AppError("Run MFA setup first", 400);
    if (user.mfaEnabled) throw new AppError("MFA is already enabled", 400);

    if (!totp.verifyTotp(user.mfaSecret, token.trim())) {
      throw new AppError("Invalid verification code. Check your authenticator clock and try again.", 400);
    }

    const recoveryCodes = totp.generateRecoveryCodes(5);
    user.mfaEnabled = true;
    user.mfaRecoveryCodes = recoveryCodes.map((c) => totp.sha256(c));
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        message: "MFA enabled. Store your recovery codes somewhere safe — each works once and they are shown only now.",
        recoveryCodes, // plaintext — the ONLY time they exist in clear
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /auth/mfa/disable { password } — authenticated
const disable = async (req, res, next) => {
  try {
    const { password } = req.body || {};
    if (!password) throw new AppError("`password` required to disable MFA", 400);

    const user = await User.findById(req.user).select("+password +mfaSecret +mfaRecoveryCodes");
    if (!user) throw new AppError("User not found", 404);
    if (!user.mfaEnabled) throw new AppError("MFA is not enabled", 400);

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new AppError("Password is incorrect", 400);

    user.mfaEnabled = false;
    user.mfaSecret = null;
    user.mfaRecoveryCodes = [];
    await user.save();

    res.status(200).json({ success: true, data: { message: "MFA disabled" } });
  } catch (err) {
    next(err);
  }
};

// GET /auth/mfa/status — authenticated (lightweight, for the settings page)
const status = async (req, res, next) => {
  try {
    const user = await User.findById(req.user).select("mfaEnabled");
    if (!user) throw new AppError("User not found", 404);
    res.status(200).json({ success: true, data: { mfaEnabled: !!user.mfaEnabled } });
  } catch (err) {
    next(err);
  }
};

module.exports = { setup, enable, disable, status };
