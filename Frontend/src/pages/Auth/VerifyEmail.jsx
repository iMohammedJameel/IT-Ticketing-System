// Verify email page — called from email link
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "../../services/authService";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await authService.verifyEmail(token);
      setVerified(true);
      toast.success("Email verified successfully!");
    } catch (err) {
      toast.error(err.message || "Verification failed");
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
          textAlign: "center",
        }}
      >
        <h2 style={{ color: "var(--primary)", marginBottom: "8px" }}>Email Verification</h2>

        {verified ? (
          <>
            <div style={{ fontSize: "3rem", margin: "16px 0" }}>✓</div>
            <p style={{ color: "var(--success)", marginBottom: "20px" }}>
              Your email has been verified successfully.
            </p>
            <Link to="/login" className="btn btn-primary">
              Continue to Login
            </Link>
          </>
        ) : token ? (
          <>
            <p style={{ color: "var(--text-muted)", marginBottom: "20px" }}>
              Click the button below to verify your email address.
            </p>
            <button
              className="btn btn-primary w-100"
              onClick={handleVerify}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify Email"}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: "3rem", margin: "16px 0" }}>⚠️</div>
            <p style={{ color: "var(--danger)", marginBottom: "20px" }}>
              Invalid verification link.
            </p>
            <Link to="/login" className="btn btn-outline-primary">
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
