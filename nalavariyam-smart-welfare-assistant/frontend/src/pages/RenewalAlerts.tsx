import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { renewalsApi, alertsApi } from '../services/api';
import type { RenewalSummaryItem, RenewalBreakdown, RenewalHistory } from '../types';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatDate, getInitials, getRenewalStatusColor, formatRenewalStatus, getUrgencyColor, formatUrgency, formatDaysRemaining } from '../utils/format';

const RENEWAL_FILTER_OPTIONS = [
  { value: '', label: 'All Workers' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'EXPIRING_SOON', label: 'Expiring Soon' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'NO_RENEWAL_DATE', label: 'Missing Date' },
];

const URGENCY_ORDER: Record<string, number> = {
  'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3, 'NONE': 4, 'unknown': 5,
};

export default function RenewalAlerts() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'urgency' | 'days' | 'name'>('urgency');
  const [searchQuery, setSearchQuery] = useState('');
  const [boardFilter, setBoardFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [generatingAlerts, setGeneratingAlerts] = useState(false);
  const [autoRemindersRunning, setAutoRemindersRunning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [renewingWorker, setRenewingWorker] = useState<RenewalSummaryItem | null>(null);
  const [newValidityDate, setNewValidityDate] = useState('');
  const [renewalNotes, setRenewalNotes] = useState('');
  const [renewing, setRenewing] = useState(false);
  const [renewSuccess, setRenewSuccess] = useState('');

  const { data: renewalData, loading: renewalLoading, error: renewalError, refetch: refetchRenewals } = useApi(
    () => renewalsApi.getSummary(),
    [],
  );

  const { data: breakdown } = useApi(
    () => renewalsApi.getBreakdown(),
    [],
  );

  const { data: historyData, refetch: refetchHistory } = useApi(
    () => renewalsApi.getHistory(),
    [showHistory],
  );

  const { refetch: refetchAlertCounts } = useApi(
    () => alertsApi.getCounts(),
    [],
  );

  const handleGenerateAlerts = async () => {
    setGeneratingAlerts(true);
    try {
      await alertsApi.generate();
      refetchAlertCounts();
    } catch {
      // silent
    } finally {
      setGeneratingAlerts(false);
    }
  };

  const handleAutoReminders = async () => {
    setAutoRemindersRunning(true);
    try {
      await renewalsApi.autoReminders();
    } catch {
      // silent
    } finally {
      setAutoRemindersRunning(false);
    }
  };

  const handleMarkRenewed = async () => {
    if (!renewingWorker || !newValidityDate) return;
    setRenewing(true);
    setRenewSuccess('');
    try {
      await renewalsApi.markRenewed(renewingWorker.worker_id, {
        new_validity_date: newValidityDate,
        performed_by: 'Staff',
        notes: renewalNotes || undefined,
      });
      setRenewingWorker(null);
      setNewValidityDate('');
      setRenewalNotes('');
      setRenewSuccess(`Registration renewed for ${renewingWorker.full_name}`);
      refetchRenewals();
      refetchAlertCounts();
      refetchHistory();
      setTimeout(() => setRenewSuccess(''), 4000);
    } catch {
      // silent
    } finally {
      setRenewing(false);
    }
  };

  const items: RenewalSummaryItem[] = renewalData || [];
  const bk: RenewalBreakdown | undefined = breakdown ?? undefined;

  // Extract unique boards and districts for filters
  const boards = [...new Set(items.map(i => i.board_name).filter(Boolean))] as string[];
  const districts = [...new Set(items.map(i => i.district).filter(Boolean))] as string[];

  // Search + Filter
  const filtered = items.filter(i => {
    if (statusFilter && i.computed_status !== statusFilter) return false;
    if (boardFilter && i.board_name !== boardFilter) return false;
    if (districtFilter && i.district !== districtFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        i.full_name.toLowerCase().includes(q) ||
        (i.registration_number || '').toLowerCase().includes(q) ||
        (i.board_name || '').toLowerCase().includes(q) ||
        (i.district || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'urgency') {
      return (URGENCY_ORDER[a.urgency] ?? 5) - (URGENCY_ORDER[b.urgency] ?? 5);
    }
    if (sortBy === 'days') {
      const aDays = a.days_until_renewal ?? 99999;
      const bDays = b.days_until_renewal ?? 99999;
      return aDays - bDays;
    }
    return a.full_name.localeCompare(b.full_name);
  });

  const expiredCount = bk?.expired ?? 0;
  const missingCount = bk?.missing_date ?? 0;
  const criticalCount = bk?.critical ?? 0;
  const highCount = bk?.high ?? 0;
  const dueTodayCount = items.filter(i => i.days_until_renewal === 0).length;
  const due7dCount = items.filter(i => i.days_until_renewal !== null && i.days_until_renewal > 0 && i.days_until_renewal <= 7).length;
  const due30dCount = items.filter(i => i.days_until_renewal !== null && i.days_until_renewal > 7 && i.days_until_renewal <= 30).length;
  const due90dCount = items.filter(i => i.days_until_renewal !== null && i.days_until_renewal > 30 && i.days_until_renewal <= 90).length;

  return (
    <>
      <Header title="Renewal Intelligence Center" subtitle="Track registration renewals, manage alerts, and monitor urgency levels" />

      <div className="p-6 space-y-6">
        {/* Success Message */}
        {renewSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-sm text-green-700 dark:text-green-300 font-medium">
            {renewSuccess}
          </div>
        )}

        {/* Summary Cards — Enhanced with time buckets */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard label="Expired" count={expiredCount} color="red"
            icon={<svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            onClick={() => setStatusFilter(statusFilter === 'EXPIRED' ? '' : 'EXPIRED')} active={statusFilter === 'EXPIRED'} />
          <SummaryCard label="Due Today" count={dueTodayCount} color="amber"
            icon={<svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            onClick={() => {}} active={false} />
          <SummaryCard label="Due in 7d" count={due7dCount} color="orange"
            icon={<svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg>}
            onClick={() => setStatusFilter(statusFilter === 'EXPIRING_SOON' ? '' : 'EXPIRING_SOON')} active={statusFilter === 'EXPIRING_SOON'} />
          <SummaryCard label="Due in 30d" count={due30dCount} color="purple"
            icon={<svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
            onClick={() => {}} active={false} />
          <SummaryCard label="Due in 90d" count={due90dCount} color="blue"
            icon={<svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
            onClick={() => {}} active={false} />
          <SummaryCard label="Missing" count={missingCount} color="gray"
            icon={<svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>}
            onClick={() => setStatusFilter(statusFilter === 'NO_RENEWAL_DATE' ? '' : 'NO_RENEWAL_DATE')} active={statusFilter === 'NO_RENEWAL_DATE'} />
        </div>

        {/* Urgency Alerts Strip */}
        {(criticalCount > 0 || highCount > 0) && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2">
              {criticalCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded-full">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  {criticalCount} Critical
                </span>
              )}
              {highCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 rounded-full">
                  <span className="w-2 h-2 bg-orange-500 rounded-full" />
                  {highCount} High
                </span>
              )}
            </div>
            <span className="text-sm text-red-700 dark:text-red-300 ml-2">registrations require immediate attention</span>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, reg. no., board, district..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-gray-50 dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300"
            >
              {RENEWAL_FILTER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Board Filter */}
            <select
              value={boardFilter}
              onChange={(e) => setBoardFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-gray-50 dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300"
            >
              <option value="">All Boards</option>
              {boards.map(b => <option key={b} value={b}>{b.replace('Tamil Nadu ', 'TN ')}</option>)}
            </select>

            {/* District Filter */}
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-gray-50 dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300"
            >
              <option value="">All Districts</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'urgency' | 'days' | 'name')}
              className="px-3 py-2 text-sm bg-gray-50 dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300"
            >
              <option value="urgency">Sort: Urgency</option>
              <option value="days">Sort: Days Remaining</option>
              <option value="name">Sort: Name</option>
            </select>

            <div className="flex-1" />

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  showHistory ? 'bg-accent text-white' : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#0a1a1e] hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                History
              </button>
              <button
                onClick={handleAutoReminders}
                disabled={autoRemindersRunning}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#0a1a1e] rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                {autoRemindersRunning ? 'Generating...' : 'Auto-Reminders'}
              </button>
              <button
                onClick={handleGenerateAlerts}
                disabled={generatingAlerts}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {generatingAlerts ? 'Generating...' : 'Generate Alerts'}
              </button>
            </div>

            {(statusFilter || searchQuery || boardFilter || districtFilter) && (
              <button
                onClick={() => { setStatusFilter(''); setSearchQuery(''); setBoardFilter(''); setDistrictFilter(''); }}
                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-medium"
              >
                Clear all filters
              </button>
            )}

            <span className="text-xs text-gray-500 dark:text-gray-400">
              {sorted.length} of {items.length} worker(s)
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-1">
          <div className="flex items-center gap-1">
            <button onClick={() => setShowHistory(false)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${!showHistory ? 'bg-accent text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
              Renewal List
            </button>
            <button onClick={() => setShowHistory(true)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${showHistory ? 'bg-accent text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
              Renewal History
              {historyData && historyData.length > 0 && <span className="ml-1.5 text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">{historyData.length}</span>}
            </button>
          </div>
        </div>

        {/* Renewal List View */}
        {!showHistory && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {renewalLoading ? (
              <LoadingSpinner />
            ) : renewalError ? (
              <div className="p-6"><ErrorMessage message={renewalError} onRetry={refetchRenewals} /></div>
            ) : sorted.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {sorted.map((item) => (
                  <RenewalRow
                    key={item.worker_id}
                    item={item}
                    onClick={() => navigate(`/workers/${item.worker_id}`)}
                    onRenew={() => { setRenewingWorker(item); setNewValidityDate(''); setRenewalNotes(''); }}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-green-50 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">All Clear</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">No workers match the selected filter.</p>
              </div>
            )}
          </div>
        )}

        {/* Renewal History View */}
        {showHistory && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {historyData && historyData.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {historyData.map((h: RenewalHistory) => (
                  <div key={h.id} className="px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center mt-0.5">
                          <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {h.worker_name || `Worker #${h.worker_id}`}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {h.old_validity_date && <span>Previous: {formatDate(h.old_validity_date)}</span>}
                            {h.old_validity_date && h.new_validity_date && <span> → </span>}
                            {h.new_validity_date && <span>New: {formatDate(h.new_validity_date)}</span>}
                          </p>
                          {h.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{h.notes}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          {h.action}
                        </span>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{formatDate(h.created_at)}</p>
                        {h.performed_by && <p className="text-[11px] text-gray-400 dark:text-gray-500">by {h.performed_by}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">No renewal history yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Mark as Renewed Modal */}
        {renewingWorker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Mark as Renewed</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Update registration for <span className="font-medium text-gray-900 dark:text-white">{renewingWorker.full_name}</span>
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">New Validity Date *</label>
                  <input
                    type="date"
                    value={newValidityDate}
                    onChange={(e) => setNewValidityDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Notes</label>
                  <textarea
                    value={renewalNotes}
                    onChange={(e) => setRenewalNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300"
                    placeholder="Optional renewal notes"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-5">
                <button onClick={() => setRenewingWorker(null)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">Cancel</button>
                <button
                  onClick={handleMarkRenewed}
                  disabled={!newValidityDate || renewing}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {renewing ? 'Renewing...' : 'Mark as Renewed'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function SummaryCard({ label, count, color, icon, onClick, active }: {
  label: string; count: number; color: string; icon: React.ReactNode;
  onClick: () => void; active: boolean;
}) {
  const colors: Record<string, string> = {
    red: active ? 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
    orange: active ? 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
    purple: active ? 'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
    green: active ? 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
    blue: active ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
    amber: active ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
    gray: active ? 'bg-gray-100 dark:bg-gray-900/40 border-gray-300 dark:border-gray-700' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
  };
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-xl border shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${colors[color] || colors.gray}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
    </div>
  );
}

function RenewalRow({ item, onClick, onRenew }: { item: RenewalSummaryItem; onClick: () => void; onRenew: () => void }) {
  const urgencyDot: Record<string, string> = {
    CRITICAL: 'bg-red-500 animate-pulse',
    HIGH: 'bg-orange-500',
    MEDIUM: 'bg-yellow-500',
    LOW: 'bg-blue-500',
    NONE: 'bg-green-500',
    unknown: 'bg-gray-400',
  };

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
      {/* Urgency Dot */}
      <div className={`w-3 h-3 rounded-full shrink-0 ${urgencyDot[item.urgency] || 'bg-gray-400'}`} />

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-sm shrink-0">
        {getInitials(item.full_name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-white hover:text-accent transition-colors truncate">
            {item.full_name}
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getRenewalStatusColor(item.computed_status)}`}>
            {formatRenewalStatus(item.computed_status)}
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getUrgencyColor(item.urgency)}`}>
            {formatUrgency(item.urgency)}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">{(item.board_name || '—').replace('Tamil Nadu ', 'TN ')}</span>
          {item.registration_number && <span className="text-[11px] font-mono text-gray-400">{item.registration_number}</span>}
          {item.district && <span className="text-xs text-gray-400 dark:text-gray-500">{item.district}</span>}
        </div>
      </div>

      {/* Renewal Date & Days */}
      <div className="text-right shrink-0">
        {item.validity_date ? (
          <>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(item.validity_date)}</p>
            <p className={`text-xs font-medium ${
              item.days_until_renewal !== null && item.days_until_renewal < 0 ? 'text-red-600 dark:text-red-400'
              : item.days_until_renewal !== null && item.days_until_renewal <= 14 ? 'text-orange-600 dark:text-orange-400'
              : 'text-gray-500 dark:text-gray-400'
            }`}>
              {formatDaysRemaining(item.days_until_renewal)}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">No date</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onRenew(); }}
          className="px-2.5 py-1.5 text-[11px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
          title="Mark as Renewed"
        >
          Renew
        </button>
        <button onClick={onClick} className="p-1.5 text-gray-400 hover:text-accent transition-colors" title="View Applicant">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
