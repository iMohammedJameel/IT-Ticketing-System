// Register page — uses authService, AuthContext, proper accessibility
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../../components/common/Spinner";
import styles from "./Register.module.css";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const passwordStrength = (() => {
    const p = form.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score; // 0-5
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"][passwordStrength];
  const strengthColor = ["", "#dc3545", "#f0ad4e", "#ffc107", "#28a745", "#28a745"][passwordStrength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (form.password !== form.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await authService.register({
        name: form.name,
        email: form.email,
        password: form.password,
      });
      login(res.data.token, res.data.refreshToken, res.data.user);
      toast.success("Account created! Please check your email to verify your account.");
      navigate("/tickets", { replace: true });
    } catch (err) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.registerPage}>
      <div className={styles.formSection}>
        <div className={styles.logo}>
          <h1>Create Account</h1>
          <p>Join the IT Ticketing system</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="reg-name" className="form-label">
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              className="form-control"
              value={form.name}
              onChange={update("name")}
              required
              disabled={loading}
              minLength={3}
              maxLength={50}
              autoComplete="name"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="reg-email" className="form-label">
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              className="form-control"
              value={form.email}
              onChange={update("email")}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="reg-password" className="form-label">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              className="form-control"
              value={form.password}
              onChange={update("password")}
              required
              disabled={loading}
              minLength={8}
              autoComplete="new-password"
            />
            {form.password && (
              <div style={{ marginTop: "6px" }}>
                <div
                  style={{
                    height: "4px",
                    borderRadius: "2px",
                    background: "#e0e0e8",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(passwordStrength / 5) * 100}%`,
                      background: strengthColor,
                      transition: "all 0.2s",
                    }}
                  />
                </div>
                <small style={{ color: strengthColor, fontSize: "0.75rem" }}>
                  {strengthLabel}
                </small>
              </div>
            )}
            <small style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block" }}>
              Min 8 chars, with uppercase, lowercase, and a digit.
            </small>
          </div>

          <div className="mb-3">
            <label htmlFor="reg-confirm" className="form-label">
              Confirm Password
            </label>
            <input
              id="reg-confirm"
              type="password"
              className="form-control"
              value={form.confirm}
              onChange={update("confirm")}
              required
              disabled={loading}
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading || !form.name || !form.email || !form.password || !form.confirm}
          >
            {loading ? (
              <>
                <Spinner size="sm" label="" />
                <span style={{ marginLeft: "8px" }}>Creating...</span>
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <p className={styles.loginText}>
          Already have an account?{" "}
          <Link to="/login" className={styles.loginLink}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
