// @ts-nocheck
import { secureStorage } from "@/lib/secureStorage";
import { useState, useEffect, FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import dictLogo from "../assets/project-logo/DICT Logo.png";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000;

const formatLockoutTime = (until: number) => {
  const secondsLeft = Math.max(0, Math.ceil((until - Date.now()) / 1000));
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return `${minutes}m ${seconds}s`;
};

export default function Login() {
  const { login, googleLogin, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/kms";

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate, from]);

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFramed, setIsFramed] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // ── click-jacking protection ───────────────────────────────────────────────
  useEffect(() => {
    try {
      if (window.self !== window.top) {
        window.top?.location.replace(window.location.href);
      }
    } catch {
      setIsFramed(true);
    }
  }, []);

  // ── load lockout state from encrypted storage ──────────────────────────────
  useEffect(() => {
    const stored = secureStorage.getItem("kms-login-lockout");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { lockoutUntil?: number };
      if (parsed.lockoutUntil && parsed.lockoutUntil > Date.now()) {
        setLockoutUntil(parsed.lockoutUntil);
      } else {
        secureStorage.removeItem("kms-login-lockout");
      }
    } catch {
      secureStorage.removeItem("kms-login-lockout");
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  // ── hidden admin reset: click logo 4 times ─────────────────────────────────
  const handleLogoClick = () => {
    const nextCount = logoClickCount + 1;
    setLogoClickCount(nextCount);
    if (nextCount >= 4) {
      setFailedAttempts(0);
      setLockoutUntil(null);
      secureStorage.removeItem("kms-login-lockout");
      setResetMessage("Login limit reset.");
      setLogoClickCount(0);
      window.setTimeout(() => setResetMessage(null), 2500);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (lockoutUntil && lockoutUntil > Date.now()) {
      setError(
        `Too many failed attempts. Please try again in ${formatLockoutTime(lockoutUntil)}.`
      );
      return;
    }
    if (!form.email.trim() || !form.password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(form.email.trim(), form.password);
      setFailedAttempts(0);
      setLockoutUntil(null);
      secureStorage.removeItem("kms-login-lockout");

      if (loggedUser.acc_lvl === 0) {
        navigate("/kms/admin", { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.non_field_errors?.[0] ||
        err?.response?.data?.detail ||
        "Invalid credentials. Please try again.";

      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (nextAttempts >= MAX_LOGIN_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_DURATION_MS;
        setLockoutUntil(until);
        secureStorage.setItem(
          "kms-login-lockout",
          JSON.stringify({ lockoutUntil: until })
        );
        setError(
          `Too many failed attempts. Please wait ${formatLockoutTime(until)} before trying again.`
        );
      } else {
        setError(
          `${msg} (${MAX_LOGIN_ATTEMPTS - nextAttempts} attempt${MAX_LOGIN_ATTEMPTS - nextAttempts === 1 ? "" : "s"} remaining)`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (credentialResponse) => {
    setError("");
    const result = googleLogin(credentialResponse.credential);
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error);
    }
  };

  const ALLOWED_DOMAIN =
    import.meta.env.VITE_ALLOWED_DOMAIN || "dict.gov.ph";
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  const googleConfigured =
    CLIENT_ID && CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID_HERE";

  // ── iframe block ───────────────────────────────────────────────────────────
  if (isFramed) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-[480px] rounded-2xl border border-border bg-card p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <span className="text-xl font-semibold">!</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Security Notice
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This sign-in page cannot be displayed inside another website or frame
            for your protection.
          </p>
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Open securely in a new tab
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="h-1.5 bg-linear-to-r from-[#CE1126] via-[#FCD116] to-[#0038A8] dark:from-blue-900 dark:via-blue-600 dark:to-slate-900" />

          <div className="p-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <button
                type="button"
                onClick={handleLogoClick}
                className="flex items-center gap-2 rounded-full px-3 py-1 transition"
                aria-label="Reset login limit"
              >
                <img
                  src={dictLogo}
                  alt="DICT Logo"
                  className="w-16 h-16 object-contain mb-3"
                />
              </button>
              {resetMessage && (
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {resetMessage}
                </p>
              )}
              <h1 className="text-xl font-black text-gray-900 dark:text-white">
                KMS PortalX
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Sign in to your account
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-orange-900/20 border border-red-200 dark:border-orange-800 text-red-700 dark:text-orange-400 rounded-lg px-4 py-3 mb-5 text-sm">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Google Sign-In */}
            {googleConfigured ? (
              <div className="mb-5">
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-3">
                  Sign in with your{" "}
                  <span className="font-semibold">@{ALLOWED_DOMAIN}</span>{" "}
                  Google account
                </p>
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() =>
                      setError("Google sign-in failed or was cancelled.")
                    }
                    hosted_domain={ALLOWED_DOMAIN}
                    theme="outline"
                    shape="rectangular"
                    size="large"
                    text="signin_with"
                    width="360"
                  />
                </div>
              </div>
            ) : (
              <div className="mb-5 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-400 text-center">
                Google sign-in not configured. Set{" "}
                <code className="font-mono">VITE_GOOGLE_CLIENT_ID</code> in{" "}
                <code className="font-mono">.env</code>.
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                or sign in with email
              </span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Login form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0038A8] focus:border-transparent text-sm transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0038A8] focus:border-transparent text-sm transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={
                  loading ||
                  Boolean(lockoutUntil && lockoutUntil > Date.now())
                }
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0038A8] hover:bg-[#001a52] text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LogIn size={16} />
                )}
                {loading ? "Signing in..." : "Sign In"}
              </button>

              {lockoutUntil && lockoutUntil > Date.now() && (
                <p className="text-center text-xs text-red-600 dark:text-red-400">
                  Account temporarily locked. Please wait{" "}
                  {formatLockoutTime(lockoutUntil)}.
                </p>
              )}
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                Local demo: <span className="font-mono">admin / admin123</span>{" "}
                or <span className="font-mono">viewer / viewer123</span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          <Link
            to="/kms"
            className="hover:text-[#0038A8] dark:hover:text-blue-400 transition-colors"
          >
            ← Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}

