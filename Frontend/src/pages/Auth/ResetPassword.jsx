// Reset password page — called from email link with token
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "../../services/authService";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword({ token, newPassword: password });
      toast.success("Password reset successfully. Please login.");
      navigate("/login");
    } catch (err) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--bg-page)",
      }}
    >
      <div
        style={{
          maxWidth: "440px",
          width: "100%",
          padding: "32px",
          background: "var(--bg-card)",
          borderRadius: "16px",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <h2 style={{ color: "var(--primary)", marginBottom: "8px" }}>Set New Password</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "24px", fontSize: "0.9rem" }}>
          Enter your new password below.
        </p>

        {!token ? (
          <div className="alert alert-danger" role="alert">
            Invalid reset link. Please request a new password reset.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                New Password
              </label>
              <input
                id="password"
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
                autoComplete="new-password"
              />
              <small style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                Min 8 chars, with uppercase, lowercase, and a digit.
              </small>
            </div>
            <div className="mb-3">
              <label htmlFor="confirm" className="form-label">
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                className="form-control"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={loading}
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading || !password || !confirm}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <Link to="/login" style={{ fontSize: "0.875rem" }}>
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
