import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { dashboardApi, alertsApi, casesApi } from '../services/api';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import LightPillar from '../components/common/LightPillar';
import { useTheme } from '../hooks/useTheme';
import { formatDate, getInitials, formatIndianNumber } from '../utils/format';

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { data: stats, loading, error, refetch } = useApi(() => dashboardApi.getStats(), []);
  const { data: alertCounts } = useApi(() => alertsApi.getCounts(), []);
  const { data: caseStats } = useApi(() => casesApi.getStatistics(), []);

  if (loading) return <><Header title="Administrative Dashboard" subtitle="Overview of registered workers, renewals..." /><LoadingSpinner /></>;
  if (error || !stats) return <><Header title="Administrative Dashboard" subtitle="Overview of registered workers, renewals..." /><div className="p-6"><ErrorMessage message={error || 'Failed to load dashboard data.'} onRetry={refetch} /></div></>;

  const activeBoards = stats.board_distribution?.filter(b => b.worker_count > 0).length || 0;
  const totalSchemes = stats.total_schemes || 0;
  const availableBenefits = stats.available_benefits || 0;

  return (
    <>
      {/* LightPillar background — subtle ambient effect, dark mode only */}
      {isDark && (
        <div className="fixed inset-0 pointer-events-none z-0" style={{ opacity: 0.15 }}>
          <LightPillar
            topColor="#3B1F8E"
            bottomColor="#1a1040"
            intensity={0.6}
            rotationSpeed={0.15}
            glowAmount={0.003}
            pillarWidth={2.5}
            pillarHeight={0.3}
            noiseIntensity={0.3}
            mixBlendMode="screen"
            quality="medium"
          />
        </div>
      )}

      <Header title="Administrative Dashboard" subtitle="Overview of registered workers, renewals, and welfare statistics" />

      <div className="p-6 space-y-6 relative z-10">
        {/* Stat Cards Row 1 — Workers & Registration */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Applicants */}
          <div onClick={() => navigate('/workers')} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between min-h-[140px] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Applicants</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{formatIndianNumber(stats.total_registered_workers)}</p>
              </div>
              <div className="w-11 h-11 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">Across {activeBoards} welfare boards</span>
              <span className="text-[10px] font-medium text-accent bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{stats.total_family_members} family members</span>
            </div>
          </div>

          {/* Renewals Due Soon */}
          <div onClick={() => navigate('/renewals')} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between min-h-[140px] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Renewals Due Soon</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.renewals_due_soon}</p>
              </div>
              <div className="w-11 h-11 bg-red-50 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">{stats.renewals_7d} urgent within 7d</span>
              {stats.renewals_7d > 0 && <span className="text-[10px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full">Action Needed</span>}
              {alertCounts && alertCounts.total > 0 && (
                <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">{alertCounts.total} active alerts</span>
              )}
            </div>
          </div>

          {/* Potential Benefits */}
          <div onClick={() => navigate('/eligibility')} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between min-h-[140px] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Potential Benefits</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.potential_scheme_matches}</p>
              </div>
              <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">Rule matches ready</span>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Preliminary</span>
            </div>
          </div>

          {/* Pending Reviews */}
          <div onClick={() => navigate('/workers')} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between min-h-[140px] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending Reviews</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.pending_reviews}</p>
              </div>
              <div className="w-11 h-11 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">Requiring attention</span>
              {stats.overdue_registrations > 0 && (
                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">{stats.overdue_registrations} overdue</span>
              )}
            </div>
          </div>
        </div>

        {/* Stat Cards Row 2 — Schemes & Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Schemes */}
          <div onClick={() => navigate('/schemes')} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between min-h-[100px] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Schemes</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalSchemes}</p>
              </div>
              <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Active Schemes */}
          <div onClick={() => navigate('/schemes')} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between min-h-[100px] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Schemes</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalSchemes}</p>
              </div>
              <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Available Benefits */}
          <div onClick={() => navigate('/schemes')} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between min-h-[100px] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Available Benefits</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{availableBenefits}</p>
              </div>
              <div className="w-11 h-11 bg-violet-50 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-violet-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Potential Benefits */}
          <div onClick={() => navigate('/eligibility')} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between min-h-[100px] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Potential Benefits</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.potential_scheme_matches}</p>
              </div>
              <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Scheme Category Breakdown */}
        {stats.scheme_category_stats && stats.scheme_category_stats.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Scheme Categories</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Distribution of welfare schemes by category</p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {stats.scheme_category_stats.filter(c => c.scheme_count > 0).map((cat, idx) => {
                  const colors = [
                    'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
                    'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
                    'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
                    'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
                    'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400',
                    'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400',
                    'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400',
                    'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400',
                    'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400',
                  ];
                  return (
                    <div key={idx} onClick={() => navigate('/schemes')} className={`p-3 rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${colors[idx % colors.length]}`}>
                      <p className="text-2xl font-bold">{cat.scheme_count}</p>
                      <p className="text-xs mt-0.5 opacity-80">{cat.category_name}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Grid: Renewal Overview + Upcoming Renewals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Renewal Overview */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Renewal Overview</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Registration expiration timeline</p>
                </div>
              </div>
              <button onClick={() => navigate('/renewals')} className="text-xs font-medium text-accent hover:text-accent-hover">View All →</button>
            </div>
            <div className="p-5 space-y-3">
              <RenewalRow label="Overdue / Expired" description="Immediate attention required" count={stats.overdue_registrations} color="red" />
              <RenewalRow label="Due within 7 days" description="Critical — action needed now" count={stats.renewals_7d} color="red" />
              <RenewalRow label="Due within 30 days" description="High priority — schedule follow-up" count={stats.renewals_30d} color="amber" />
              <RenewalRow label="Due within 90 days" description="Advance tracking pipeline" count={stats.renewals_90d} color="blue" />
              {stats.renewal_breakdown?.missing_renewal_date !== undefined && stats.renewal_breakdown.missing_renewal_date > 0 && (
                <RenewalRow label="Missing Renewal Date" description="Applicants with no renewal information" count={stats.renewal_breakdown.missing_renewal_date} color="gray" />
              )}
              {stats.alert_counts && stats.alert_counts.total > 0 && (
                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-900/30">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Active Alerts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.alert_counts.total}</span>
                    <button onClick={() => navigate('/notifications')} className="text-[11px] font-medium text-accent hover:underline">View</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Renewals */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Upcoming Renewals</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Workers with renewals approaching</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-2">
              {stats.upcoming_renewals && stats.upcoming_renewals.length > 0 ? (
                stats.upcoming_renewals.slice(0, 5).map((r: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-slate-600/50 hover:shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-xs">
                        {getInitials(r.full_name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{r.full_name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">{r.registration_number} &middot; {r.board_name?.replace('Tamil Nadu ', 'TN ') || ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{formatDate(r.validity_date)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No upcoming renewals</p>
              )}
            </div>
          </div>
        </div>

        {/* Case Management Overview */}
        {(caseStats as any)?.total_cases > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                  <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Case Management Overview</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Welfare benefit cases in progress</p>
                </div>
              </div>
              <button onClick={() => navigate('/cases')} className="text-xs font-medium text-accent hover:text-accent-hover">View Cases →</button>
            </div>
            <div className="p-5 grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{(caseStats as any).open_cases || ((caseStats as any).total_cases - (caseStats as any).completed - (caseStats as any).closed)}</p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400">Open Cases</p>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-xl font-bold text-red-700 dark:text-red-400">{(caseStats as any).urgent_cases || 0}</p>
                <p className="text-[11px] text-red-600 dark:text-red-400">Urgent</p>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-xl font-bold text-orange-700 dark:text-orange-400">{(caseStats as any).documents_pending || 0}</p>
                <p className="text-[11px] text-orange-600 dark:text-orange-400">Docs Pending</p>
              </div>
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{(caseStats as any).follow_up_required || 0}</p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400">Follow-ups Due</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xl font-bold text-green-700 dark:text-green-400">{(caseStats as any).completed || 0}</p>
                <p className="text-[11px] text-green-600 dark:text-green-400">Completed</p>
              </div>
            </div>
          </div>
        )}

        {/* Scheme Category Stats */}

        {/* Board Distribution & Category Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Board Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Workers by Welfare Board</h3>
            </div>
            <div className="p-5 space-y-3">
              {stats.board_distribution?.filter(b => b.worker_count > 0).map((board, idx) => {
                const maxCount = Math.max(...(stats.board_distribution?.map(b => b.worker_count) || [1]));
                const width = Math.max((board.worker_count / maxCount) * 100, 5);
                const colors = ['bg-accent', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500'];
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{board.name.replace('Tamil Nadu ', 'TN ')}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{board.worker_count}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                      <div className={`${colors[idx % colors.length]} h-2 rounded-full transition-all`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Workers by Category</h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                {stats.category_distribution?.map((cat, idx) => {
                  const colors = ['bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400', 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400', 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400', 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400', 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'];
                  return (
                    <div key={idx} className={`p-3 rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${colors[idx % colors.length]}`}>
                      <p className="text-2xl font-bold">{cat.worker_count}</p>
                      <p className="text-xs mt-0.5 opacity-80">{cat.worker_category}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Applicants */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Applicants</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Board</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reg. No.</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {stats.recent_workers?.slice(0, 8).map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-xs">
                          {getInitials(w.full_name)}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{w.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{(w.board_name || '—').replace('Tamil Nadu ', 'TN ')}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{w.worker_category || '—'}</td>
                    <td className="px-5 py-3 text-xs font-mono text-gray-500 dark:text-gray-400">{(w as any).registration_number || '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(w.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function RenewalRow({ label, description, count, color }: { label: string; description: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    red: 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30',
    amber: 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/30',
    blue: 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/30',
    gray: 'bg-gray-50 border-gray-100 dark:bg-gray-900/20 dark:border-gray-700/30',
  };
  const dotColors: Record<string, string> = {
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    blue: 'bg-accent',
    gray: 'bg-gray-400',
  };
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 hover:shadow-sm cursor-default ${colors[color]}`}>
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${dotColors[color]}`} />
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-gray-900 dark:text-white">{count}</span>
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </div>
  );
}
