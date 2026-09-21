import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LightPillar from '../components/common/LightPillar';

// Google OAuth types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [requestSent, setRequestSent] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Fetch Google client ID on mount
  useEffect(() => {
    fetch('/api/auth/google/config')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.enabled) {
          setGoogleClientId(data.data.client_id);
        }
      })
      .catch(() => {});
  }, []);

  // Load Google Identity Services script
  useEffect(() => {
    if (!googleClientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      if (window.google && googleButtonRef.current) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
          auto_select: false,
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: '100%',
          text: 'continue_with',
          shape: 'rectangular',
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [googleClientId]);

  const handleGoogleResponse = async (response: { credential: string }) => {
    setError('');
    setGoogleLoading(true);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        window.location.href = '/';
      } else if (data.pending) {
        setPendingApproval(true);
      } else {
        setError(data.error || 'Google sign-in failed.');
      }
    } catch {
      setError('Server unavailable. Please try again.');
    } finally {
      setLoading(false);
      setGoogleLoading(false);
    }
  };

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email address is required.'); return; }
    if (!isValidEmail(email)) { setError('Please enter a valid email address.'); return; }
    if (!password) { setError('Password is required.'); return; }
    setLoading(true);
    const result = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.error || 'Invalid email or password.');
    }
  };

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const createEmail = (formData.get('create_email') as string || '').trim();
    const createPassword = (formData.get('create_password') as string || '');
    const confirmPassword = (formData.get('confirm_password') as string || '');

    if (!createEmail) { setError('Email address is required.'); return; }
    if (!isValidEmail(createEmail)) { setError('Please enter a valid email address.'); return; }
    if (!createPassword) { setError('Password is required.'); return; }
    if (createPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (createPassword !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createEmail.toLowerCase(),
          password: createPassword,
        }),
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        setRequestSent(true);
        setEmail(createEmail.toLowerCase());
      } else {
        setError(data.error || 'Failed to create account.');
      }
    } catch {
      setLoading(false);
      setError('Server unavailable. Please try again.');
    }
  };

  // Pending approval screen
  if (pendingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[#081215]">
          <LightPillar topColor="#3B1F8E" bottomColor="#1a1040" intensity={1.0} rotationSpeed={0.2} glowAmount={0.006} pillarWidth={3.5} pillarHeight={0.35} noiseIntensity={0.25} mixBlendMode="screen" quality="medium" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#081215]/40 via-transparent to-[#081215]/60" />
        </div>
        <div className="relative z-10 w-full max-w-[420px] mx-4">
          <div className="bg-white/[0.07] backdrop-blur-xl border border-white/[0.12] rounded-3xl p-8 shadow-2xl shadow-black/30 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Account Pending Approval</h1>
            <p className="text-sm text-white/50 mb-6 leading-relaxed">
              Your account has been registered and is waiting for admin approval.
              You will be able to sign in once an administrator approves your access.
            </p>
            <button
              onClick={() => { setPendingApproval(false); setEmail(''); setPassword(''); setError(''); }}
              className="w-full py-3 bg-white/[0.08] border border-white/[0.12] text-white font-medium rounded-xl text-sm hover:bg-white/[0.12] transition-all"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Account created confirmation
  if (requestSent) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[#081215]">
          <LightPillar topColor="#3B1F8E" bottomColor="#1a1040" intensity={1.0} rotationSpeed={0.2} glowAmount={0.006} pillarWidth={3.5} pillarHeight={0.35} noiseIntensity={0.25} mixBlendMode="screen" quality="medium" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#081215]/40 via-transparent to-[#081215]/60" />
        </div>
        <div className="relative z-10 w-full max-w-[420px] mx-4">
          <div className="bg-white/[0.07] backdrop-blur-xl border border-white/[0.12] rounded-3xl p-8 shadow-2xl shadow-black/30 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Account Created!</h1>
            <p className="text-sm text-white/50 mb-6 leading-relaxed">
              Your account request has been sent to the administrator for approval.
              Once approved, you can sign in using your email and password.
            </p>
            <button
              onClick={() => { setRequestSent(false); setEmail(''); setPassword(''); setError(''); }}
              className="w-full py-3 bg-white/[0.08] border border-white/[0.12] text-white font-medium rounded-xl text-sm hover:bg-white/[0.12] transition-all"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated LightPillar Background */}
      <div className="absolute inset-0 bg-[#081215]">
        <LightPillar
          topColor="#3B1F8E"
          bottomColor="#1a1040"
          intensity={1.0}
          rotationSpeed={0.2}
          glowAmount={0.006}
          pillarWidth={3.5}
          pillarHeight={0.35}
          noiseIntensity={0.25}
          mixBlendMode="screen"
          quality="medium"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#081215]/40 via-transparent to-[#081215]/60" />
      </div>

      {/* Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-[420px] mx-4">
        <div className="bg-white/[0.07] backdrop-blur-xl border border-white/[0.12] rounded-3xl p-8 shadow-2xl shadow-black/30">
          {/* Sun / Star icon */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center">
              <svg className="h-6 w-6 text-teal-300/80" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-white text-center mb-1.5">Nalavariyam</h1>
          <p className="text-sm text-white/40 text-center mb-7 leading-relaxed">
            Smart Welfare Assistant<br />
            <span className="text-white/30 text-xs">
              {mode === 'login' ? 'Sign in to access the application' : 'Create your account to get started'}
            </span>
          </p>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <>
              {/* Email/Password Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 ml-0.5">Email Address</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      autoComplete="email"
                      className="w-full pl-11 pr-4 py-3 text-sm bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400/30 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 ml-0.5">Password</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full pl-11 pr-11 py-3 text-sm bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400/30 transition-all tracking-widest"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-white text-gray-900 font-semibold rounded-xl transition-all duration-200 text-sm hover:bg-white/90 active:scale-[0.98] disabled:opacity-50 mt-2 shadow-lg shadow-white/10"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Logging in...
                    </span>
                  ) : 'Log In'}
                </button>
              </form>

              {/* Create Account Link */}
              <div className="mt-5 text-center">
                <button
                  onClick={() => { setMode('register'); setError(''); setPassword(''); }}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  Don't have access? <span className="text-purple-400/70 font-medium">Create Account</span>
                </button>
              </div>

              {/* Divider + Google Sign-In (only when configured) */}
              {googleClientId && (
                <>
                  <div className="flex items-center gap-3 mt-5 mb-4">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-white/30">or continue with Google</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  <div className="w-full flex justify-center">
                    <div ref={googleButtonRef} />
                  </div>
                  {googleLoading && (
                    <div className="flex items-center justify-center gap-2 text-white/40 text-sm mt-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in with Google...
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            /* ===== Create Account Form ===== */
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-2">
                <p className="text-xs text-purple-300/80 leading-relaxed">
                  Create your account below. Your request will be sent to the administrator for approval.
                  Once approved, you can sign in with your email and password.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 ml-0.5">Email Address</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    name="create_email"
                    placeholder="Enter your email address"
                    autoComplete="email"
                    className="w-full pl-11 pr-4 py-3 text-sm bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 ml-0.5">Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </span>
                  <input
                    type="password"
                    name="create_password"
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    className="w-full pl-11 pr-4 py-3 text-sm bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400/30 transition-all tracking-widest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 ml-0.5">Confirm Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </span>
                  <input
                    type="password"
                    name="confirm_password"
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    className="w-full pl-11 pr-4 py-3 text-sm bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400/30 transition-all tracking-widest"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-white text-gray-900 font-semibold rounded-xl transition-all duration-200 text-sm hover:bg-white/90 active:scale-[0.98] disabled:opacity-50 mt-2 shadow-lg shadow-white/10"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating Account...
                  </span>
                ) : 'Send Access Request'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  Already have access? <span className="text-purple-400/70 font-medium">Sign In</span>
                </button>
              </div>
            </form>
          )}

          {/* Footer disclaimer */}
          <p className="text-center text-xs text-white/20 mt-6">
            Authorized personnel only. All access is monitored.
          </p>
          <p className="text-center text-[10px] text-white/15 mt-2">
            Data is associated with your registered email address.
          </p>
        </div>
      </div>
    </div>
  );
}
