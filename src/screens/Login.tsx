// @ts-nocheck
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import dictLogo from '../assets/project-logo/DICT Logo.png';

export default function Login() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const result = login(form.username.trim(), form.password);
    setLoading(false);
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error);
    }
  };

  const handleGoogleSuccess = (credentialResponse) => {
    setError('');
    const result = googleLogin(credentialResponse.credential);
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error);
    }
  };

  const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_DOMAIN || 'dict.gov.ph';
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const googleConfigured = CLIENT_ID && CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE';

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="h-1.5 bg-linear-to-r from-[#CE1126] via-[#FCD116] to-[#0038A8] dark:from-blue-900 dark:via-blue-600 dark:to-slate-900" />

          <div className="p-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <img src={dictLogo} alt="DICT Logo" className="w-16 h-16 object-contain mb-3" />
              <h1 className="text-xl font-black text-gray-900 dark:text-white">KMS PortalX</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Sign in to your account</p>
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
                  Sign in with your <span className="font-semibold">@{ALLOWED_DOMAIN}</span> Google account
                </p>
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google sign-in failed or was cancelled.')}
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
                Google sign-in not configured. Set <code className="font-mono">VITE_GOOGLE_CLIENT_ID</code> in <code className="font-mono">.env.local</code>.
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">or use local account</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Local login form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Username</label>
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0038A8] focus:border-transparent text-sm transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
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
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0038A8] hover:bg-[#001a52] text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LogIn size={16} />
                )}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                Local demo: <span className="font-mono">admin / admin123</span> or <span className="font-mono">viewer / viewer123</span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          <Link to="/" className="hover:text-[#0038A8] dark:hover:text-blue-400 transition-colors">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}

