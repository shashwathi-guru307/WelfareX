import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setShowMenu(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const roleLabel = user?.role === 'ADMIN' ? 'Admin' : 'Staff';

  return (
    <header className="bg-[#0f0a2a]/50 backdrop-blur-xl border-b border-white/[0.07] px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title + Subtitle */}
        <div className="flex-shrink-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search worker name, reg no, phone..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/[0.05] border border-white/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400/30 placeholder-white/25 text-white"
            />
          </div>
        </div>

        {/* Right: Actions + Avatar */}
        <div className="flex items-center gap-3">
          {/* Analyze Worker Button */}
          <button
            onClick={() => navigate('/eligibility')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/70 bg-white/[0.06] border border-white/[0.08] rounded-lg hover:bg-white/[0.1] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
            Analyze Worker
          </button>

          {/* Add Applicant Button */}
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-purple-600/80 rounded-lg hover:bg-purple-600 transition-colors shadow-sm shadow-purple-500/15 border border-purple-400/20"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
            Add Applicant
          </button>

          {/* Notification Bell */}
          <button onClick={() => navigate('/notifications')} className="relative p-2 text-white/40 hover:text-white/70 hover:bg-white/[0.06] rounded-lg transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse-dot" />
          </button>

          {/* User Avatar + Dropdown */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2.5 pl-3 border-l border-white/[0.08] hover:bg-white/[0.06] rounded-lg pr-2 py-1 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-purple-600/70 flex items-center justify-center text-white text-sm font-bold shadow-sm shadow-purple-500/20 overflow-hidden">
                {(user as any)?.profile_picture ? (
                  <img src={`/api/auth/profile/picture/${(user as any).profile_picture}`} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
                ) : null}
                <span className={[(user as any)?.profile_picture ? 'hidden' : '']}>{initials}</span>
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-semibold text-white leading-tight">{user?.name || 'User'}</p>
                <p className="text-[11px] text-white/40">{roleLabel}</p>
              </div>
              <svg className="h-4 w-4 text-white/30" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1040]/80 backdrop-blur-2xl rounded-xl border border-white/[0.08] shadow-2xl shadow-purple-900/30 z-50">
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <p className="text-sm font-semibold text-white">{user?.name}</p>
                  <p className="text-xs text-white/40">{user?.email}</p>
                  <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-[10px] font-bold bg-accent/10 text-accent">
                    {roleLabel}
                  </span>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setShowMenu(false); navigate('/settings'); }}
                    className="w-full text-left px-4 py-2 text-sm text-white/70 hover:bg-white/[0.06] flex items-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
