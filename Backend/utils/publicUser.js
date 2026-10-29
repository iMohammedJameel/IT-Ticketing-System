/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// publicUser — whitelist serializer shared by authController and
// userManagementController. Never send the raw user document to a client:
// password hash, tokenVersion, lockout counters, MFA secrets and reset
// tokens are all stripped by construction.
const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  team: user.team,
  profileImage: user.profileImage,
  status: user.status,
  emailVerifiedAt: user.emailVerifiedAt,
  mfaEnabled: !!user.mfaEnabled,
  notificationPrefs: user.notificationPrefs,
  jobTitle: user.jobTitle,
  department: user.department,
  phone: user.phone,
  createdAt: user.createdAt,
});

module.exports = publicUser;
