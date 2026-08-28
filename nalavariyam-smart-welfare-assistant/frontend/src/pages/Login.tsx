import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Email or username is required'); return; }
    if (!password) { setError('Password is required'); return; }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.error || 'Invalid email/username or password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* ── Animated Earth Background ── */}
      <div className="absolute inset-0">
        {/* Base dark fill */}
        <div className="absolute inset-0 bg-[#050a18]" />
        {/* The Earth image with slow Ken Burns drift animation */}
        <img
          src="/earth-bg.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ animation: 'earth-drift 30s ease-in-out infinite', opacity: 0.9 }}
        />
        {/* Radial vignette to keep card readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050a18]/70 via-transparent to-[#050a18]/60" />
        {/* Atmospheric horizon glow */}
        <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-t from-[#040b1a]/95 via-[#071830]/40 to-transparent" />
        {/* Top fade for depth */}
        <div className="absolute top-0 left-0 right-0 h-[25%] bg-gradient-to-b from-[#050a18]/80 to-transparent" />
        {/* Pulsing blue glow at the Earth's limb */}
        <div
          className="absolute bottom-[18%] left-1/2 -translate-x-1/2 w-[80%] h-[20%] rounded-full bg-blue-500/10 blur-3xl"
          style={{ animation: 'earth-glow-pulse 6s ease-in-out infinite' }}
        />
      </div>

      {/* ── Starfield Overlay ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Twinkling stars */}
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${Math.random() * 2 + 0.5}px`,
              height: `${Math.random() * 2 + 0.5}px`,
              top: `${Math.random() * 60}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.1,
              animation: `twinkle ${2 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}

        {/* Floating light particles rising slowly */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`p-${i}`}
            className="absolute bottom-0 rounded-full bg-blue-300/20"
            style={{
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              left: `${10 + Math.random() * 80}%`,
              animation: `float-up ${15 + Math.random() * 20}s linear infinite`,
              animationDelay: `${Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* ── Glassmorphism Card ── */}
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
            <span className="text-white/30 text-xs">Sign in to access the application</span>
          </p>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Username */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5 ml-0.5">Email or Username</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email or username"
                  autoComplete="username"
                  className="w-full pl-11 pr-4 py-3 text-sm bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400/30 transition-all"
                />
              </div>
            </div>

            {/* Password */}
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
                  className="w-full pl-11 pr-11 py-3 text-sm bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400/30 transition-all tracking-widest"
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

            {/* Login Button */}
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

          {/* Footer disclaimer */}
          <p className="text-center text-xs text-white/20 mt-6">
            Authorized personnel only. All access is monitored.
          </p>
        </div>
      </div>
    </div>
  );
}
