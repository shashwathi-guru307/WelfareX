import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsApi, renewalsApi, workersApi } from '../services/api';
import type { Worker, RenewalSummaryItem, BoardStatistic, DistrictStatistic } from '../types';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatDate, getRenewalStatusColor, formatRenewalStatus, getUrgencyColor, formatUrgency, formatDaysRemaining } from '../utils/format';

const REPORT_TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'applicants', label: 'Applicants', icon: '👤' },
  { id: 'renewals', label: 'Renewals', icon: '🔄' },
  { id: 'family', label: 'Family', icon: '👨‍👩‍👧' },
  { id: 'schemes', label: 'Schemes', icon: '🛡️' },
  { id: 'board-stats', label: 'By Board', icon: '📋' },
  { id: 'district-stats', label: 'By District', icon: '📍' },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <>
      <Header title="Reports" subtitle="Generate and view administrative reports" />
      <div className="p-6 space-y-6">
        {/* Tab Navigation */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-1">
          <div className="flex flex-wrap items-center gap-1">
            {REPORT_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.id ? 'bg-accent text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                <span className="mr-1">{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && <OverviewReport />}
        {activeTab === 'applicants' && <ApplicantReport />}
        {activeTab === 'renewals' && <RenewalReport />}
        {activeTab === 'family' && <FamilyReport />}
        {activeTab === 'schemes' && <SchemeReport />}
        {activeTab === 'board-stats' && <BoardStatsReport />}
        {activeTab === 'district-stats' && <DistrictStatsReport />}
      </div>
    </>
  );
}

// ============================================================
// Overview / Statistics
// ============================================================
function OverviewReport() {
  const { data: stats, loading, error, refetch } = useApi(() => reportsApi.getStatistics(), []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Main stats */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Applicant Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Applicants" value={stats.total_applicants} color="text-blue-600 dark:text-blue-400" />
          <StatCard label="Active Registrations" value={stats.active_registrations} color="text-green-600 dark:text-green-400" />
          <StatCard label="Expired Registrations" value={stats.expired_registrations} color="text-red-600 dark:text-red-400" />
          <StatCard label="Family Members" value={stats.total_family_members} color="text-purple-600 dark:text-purple-400" />
          <StatCard label="Welfare Schemes" value={stats.total_schemes} color="text-accent" />
          <StatCard label="Pending Reminders" value={stats.pending_reminders} color="text-amber-600 dark:text-amber-400" />
          <StatCard label="Unread Alerts" value={stats.unread_alerts} color="text-orange-600 dark:text-orange-400" />
        </div>
      </div>

      {/* Board distribution */}
      <ReportCard title="Workers by Welfare Board">
        <BarChart data={(stats.board_distribution ?? []).map(b => ({ label: b.name.replace('Tamil Nadu ', 'TN '), value: b.count }))} />
      </ReportCard>

      {/* District distribution */}
      <ReportCard title="Workers by District">
        <BarChart data={(stats.district_distribution ?? []).map(d => ({ label: d.district, value: d.count }))} />
      </ReportCard>

      {/* Occupation distribution */}
      <ReportCard title="Workers by Nature of Work">
        <BarChart data={(stats.occupation_distribution ?? []).map(o => ({ label: o.occupation, value: o.count }))} />
      </ReportCard>
    </div>
  );
}

// ============================================================
// Applicant Report
// ============================================================
function ApplicantReport() {
  const { data, loading, error, refetch } = useApi(() => reportsApi.getApplicants(), []);
  const workers: Worker[] = data || [];

  const handleExport = () => { window.open('/api/reports/export/applicants', '_blank'); };
  const handlePrint = () => { window.print(); };

  return (
    <div className="space-y-4">
      <ReportHeader title="Applicant Report" count={workers.length} onExport={handleExport} onPrint={handlePrint} />

      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} onRetry={refetch} /> : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                  {['Name', 'Gender', 'DOB', 'Age', 'Phone', 'District', 'Board', 'Occupation', 'Reg No', 'Reg Date', 'Renewal'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {workers.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{w.full_name}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300">{w.gender}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDate(w.date_of_birth)}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300">{(w as any).age ?? '—'}</td>
                    <td className="px-3 py-2.5 text-xs font-mono text-gray-500 dark:text-gray-400">{w.mobile_number ? w.mobile_number.slice(-4).padStart(10, 'X') : '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300">{w.district || '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 max-w-[120px] truncate">{(w.board_name || '—').replace('Tamil Nadu ', 'TN ')}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300">{w.occupation || '—'}</td>
                    <td className="px-3 py-2.5 text-xs font-mono text-gray-500 dark:text-gray-400">{w.registration_number || '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDate(w.registration_date)}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDate(w.validity_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Renewal Report
// ============================================================
function RenewalReport() {
  const { data, loading, error, refetch } = useApi(() => renewalsApi.getSummary(), []);
  const items: RenewalSummaryItem[] = data || [];

  const handleExport = () => { window.open('/api/renewals/export', '_blank'); };

  return (
    <div className="space-y-4">
      <ReportHeader title="Renewal Status Report" count={items.length} onExport={handleExport} />

      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} onRetry={refetch} /> : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                  {['Applicant', 'Board', 'Reg Date', 'Validity', 'Days', 'Status', 'Urgency'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {items.map(w => (
                  <tr key={w.worker_id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white">{w.full_name}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 max-w-[120px] truncate">{(w.board_name || '—').replace('Tamil Nadu ', 'TN ')}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDate(w.registration_date)}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDate(w.validity_date)}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDaysRemaining(w.days_until_renewal)}</td>
                    <td className="px-3 py-2.5"><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getRenewalStatusColor(w.computed_status)}`}>{formatRenewalStatus(w.computed_status)}</span></td>
                    <td className="px-3 py-2.5"><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getUrgencyColor(w.urgency)}`}>{formatUrgency(w.urgency)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Family Report
// ============================================================
function FamilyReport() {
  const { data, loading, error, refetch } = useApi(() => reportsApi.getFamily(), []);
  const members: any[] = data || [];

  const handleExport = () => { window.open('/api/reports/export/family', '_blank'); };

  return (
    <div className="space-y-4">
      <ReportHeader title="Family Member Report" count={members.length} onExport={handleExport} />

      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} onRetry={refetch} /> : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                  {['Worker', 'Family Member', 'Relationship', 'DOB', 'Age', 'Gender', 'Education', 'Dependent'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {members.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white">{m.worker_name}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300">{m.name}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300">{m.relationship}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDate(m.date_of_birth)}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300">{m.age ?? '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300">{m.gender}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300">{m.education_level || '—'}</td>
                    <td className="px-3 py-2.5 text-sm">{m.is_dependent ? <span className="text-green-600 dark:text-green-400 font-medium">Yes</span> : <span className="text-gray-400">No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Scheme Report
// ============================================================
function SchemeReport() {
  const { data, loading, error, refetch } = useApi(() => reportsApi.getSchemes(), []);
  const schemes: any[] = data || [];

  const handleExport = () => { window.open('/api/reports/export/schemes', '_blank'); };

  return (
    <div className="space-y-4">
      <ReportHeader title="Welfare Scheme Report" count={schemes.length} onExport={handleExport} />

      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} onRetry={refetch} /> : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                  {['Scheme', 'Category', 'Claimant', 'Amount', 'Benefits', 'Qualifications', 'Rules'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {schemes.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white max-w-[200px]">{s.name}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300">{s.category_name || '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300">{s.claimant_type || '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 max-w-[150px] truncate">{s.amount_details || '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 text-center">{s.benefit_count}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 text-center">{s.qualification_count}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 text-center">{s.rule_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Board Statistics
// ============================================================
function BoardStatsReport() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi(() => reportsApi.getBoardStats(), []);
  const boards: BoardStatistic[] = data || [];

  return (
    <div className="space-y-4">
      <ReportHeader title="Board-wise Statistics" count={boards.length} />
      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} onRetry={refetch} /> : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <p className="px-4 pt-3 text-xs text-gray-500 dark:text-gray-400">Click any board to view its applicants</p>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                  {['Welfare Board', 'Total Workers', 'Active', 'Expired', 'Family Members'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {boards.map(b => (
                  <tr key={b.id} className="hover:bg-accent/5 dark:hover:bg-accent/10 cursor-pointer transition-colors" onClick={() => navigate(`/applicants?board_id=${b.id}`)}>
                    <td className="px-4 py-3 text-sm font-medium text-accent hover:underline">{b.name}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{b.total_workers}</td>
                    <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 font-medium">{b.active}</td>
                    <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400 font-medium">{b.expired}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{b.family_members}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// District Statistics
// ============================================================
function DistrictStatsReport() {
  const navigate = useNavigate();
  const { data: districtStats, loading, error, refetch } = useApi(() => reportsApi.getDistrictStats(), []);
  const districts: DistrictStatistic[] = districtStats || [];
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [talukData, setTalukData] = useState<{ taluk: string; count: number }[]>([]);
  const [loadingTaluks, setLoadingTaluks] = useState(false);

  // When district is selected, fetch workers and aggregate by taluk
  useEffect(() => {
    if (!selectedDistrict) {
      setTalukData([]);
      return;
    }
    setLoadingTaluks(true);
    workersApi.list({ district: selectedDistrict, per_page: 1000 })
      .then(res => {
        const workers = res.data?.workers || [];
        const talukCounts: Record<string, number> = {};
        workers.forEach(w => {
          const t = w.taluk || 'Unknown';
          talukCounts[t] = (talukCounts[t] || 0) + 1;
        });
        const sorted = Object.entries(talukCounts)
          .map(([taluk, count]) => ({ taluk, count }))
          .sort((a, b) => b.count - a.count);
        setTalukData(sorted);
      })
      .catch(() => setTalukData([]))
      .finally(() => setLoadingTaluks(false));
  }, [selectedDistrict]);

  const maxTalukCount = Math.max(...talukData.map(t => t.count), 1);

  return (
    <div className="space-y-4">
      <ReportHeader title="District & Taluk Statistics" count={districts.length} />
      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} onRetry={refetch} /> : (
        <>
          {/* District Stats Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <p className="px-4 pt-3 text-xs text-gray-500 dark:text-gray-400">Select a district to view taluk-wise breakdown</p>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                    {['District', 'Total Workers', 'Active', 'Expired', 'Family Members'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {districts.map((d, i) => (
                    <tr key={i}
                      className={`hover:bg-accent/5 dark:hover:bg-accent/10 cursor-pointer transition-colors ${selectedDistrict === d.district ? 'bg-accent/10 dark:bg-accent/15' : ''}`}
                      onClick={() => setSelectedDistrict(selectedDistrict === d.district ? '' : d.district)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-accent">{d.district}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{d.total_workers}</td>
                      <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 font-medium">{d.active}</td>
                      <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400 font-medium">{d.expired}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{d.family_members}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Taluk Drill-down */}
          {selectedDistrict && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Workers by Taluk — {selectedDistrict}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Click any taluk to view its applicants</p>
                </div>
                <button
                  onClick={() => setSelectedDistrict('')}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  ✕ Clear
                </button>
              </div>
              {loadingTaluks ? (
                <LoadingSpinner />
              ) : talukData.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No workers found in {selectedDistrict}</p>
              ) : (
                <div className="space-y-2">
                  {talukData.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate(`/applicants?district=${encodeURIComponent(selectedDistrict)}&taluk=${encodeURIComponent(t.taluk)}`)}>
                      <span className="text-xs text-gray-600 dark:text-gray-400 w-40 truncate text-right shrink-0 group-hover:text-accent transition-colors">{t.taluk}</span>
                      <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-5 overflow-hidden">
                        <div className="bg-accent/80 h-full rounded-full transition-all duration-500 group-hover:bg-accent" style={{ width: `${(t.count / maxTalukCount) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-8 text-right group-hover:text-accent transition-colors">{t.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// Reusable Components
// ============================================================

function useApi<T>(fetcher: () => Promise<{ data?: T }>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => setTrigger(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetcher().then(res => {
      if (!cancelled) { setData(res.data); setLoading(false); }
    }).catch(err => {
      if (!cancelled) { setError(err instanceof Error ? err.message : 'Failed to load data'); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [trigger, ...deps]);

  return { data, loading, error, refetch };
}

function ReportHeader({ title, count, onExport, onPrint }: { title: string; count: number; onExport?: () => void; onPrint?: () => void }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">{count} record(s) &middot; Preliminary administrative data</p>
      </div>
      <div className="flex items-center gap-2">
        {onExport && (
          <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent/5 border border-accent/20 rounded-lg hover:bg-accent/10 transition-colors">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Export CSV
          </button>
        )}
        {onPrint && (
          <button onClick={onPrint} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659" /></svg>
            Print
          </button>
        )}
      </div>
    </div>
  );
}

function ReportCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center p-3">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase mt-1">{label}</p>
    </div>
  );
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.slice(0, 10).map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-600 dark:text-gray-400 w-40 truncate text-right shrink-0">{d.label}</span>
          <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-5 overflow-hidden">
            <div className="bg-accent/80 h-full rounded-full transition-all duration-500" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-8 text-right">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
