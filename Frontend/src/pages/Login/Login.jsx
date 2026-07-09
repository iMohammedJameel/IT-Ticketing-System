// Login page — uses AuthContext, proper accessibility (label htmlFor, buttons instead of spans)
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../../components/common/Spinner";
import styles from "./Login.module.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Where to redirect after login (preserves intended URL)
  const from = location.state?.from || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // prevent double-submit
    setLoading(true);
    try {
      const res = await authService.login({ email, password });
      login(res.data.token, res.data.refreshToken, res.data.user);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      const target = from || (res.data.user.role === "admin" ? "/dashboard" : "/tickets");
      navigate(target, { replace: true });
    } catch (err) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        <div className={styles.formSection}>
          <div className={styles.logo}>
            <h1>IT Ticketing</h1>
            <p>Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="login-email" className="form-label">
                Email Address
              </label>
              <input
                id="login-email"
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

            <div className="mb-3">
              <label htmlFor="login-password" className="form-label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>

            <div className={styles.forgotRow}>
              <Link to="/forgot-password" className={styles.forgotLink}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading || !email || !password}
            >
              {loading ? (
                <>
                  <Spinner size="sm" label="" />
                  <span style={{ marginLeft: "8px" }}>Signing in...</span>
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className={styles.registerText}>
            Don't have an account?{" "}
            <Link to="/register" className={styles.registerLink}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
