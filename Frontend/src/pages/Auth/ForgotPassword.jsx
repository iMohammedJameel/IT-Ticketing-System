// Forgot password page — sends reset link to email
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "../../services/authService";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
      toast.success("If the email exists, a reset link has been sent.");
    } catch (err) {
      toast.error(err.message || "Failed to send reset email");
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
        <h2 style={{ color: "var(--primary)", marginBottom: "8px" }}>Reset Password</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "24px", fontSize: "0.9rem" }}>
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {sent ? (
          <div
            className="alert alert-success"
            role="alert"
            style={{ marginBottom: "16px" }}
          >
            ✓ Reset link sent. Check your email inbox (and spam folder).
            <br />
            <Link
              to="/login"
              style={{ display: "inline-block", marginTop: "8px", fontWeight: 600 }}
            >
              ← Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading || !email}
            >
              {loading ? "Sending..." : "Send Reset Link"}
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
