import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { alertsApi } from '../services/api';
import type { Alert } from '../types';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatDateTime, getAlertSeverityColor, formatAlertType } from '../utils/format';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'eligibility', label: 'Eligibility' },
  { value: 'followup', label: 'Follow-up' },
];

const SEVERITY_FILTER = [
  { value: '', label: 'All Alerts' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const TYPE_MAP: Record<string, string[]> = {
  renewal: ['renewal_expired', 'renewal_expiring_soon', 'renewal_missing'],
  eligibility: ['eligibility_match', 'eligibility_insufficient_data'],
  followup: ['follow_up_required'],
};

export default function Notifications() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('');
  const [page, setPage] = useState(1);

  // Compute type filter from tab
  const { data: alertData, loading, error, refetch } = useApi(
    () => alertsApi.list({
      severity: severityFilter || undefined,
      status: activeTab === 'unread' ? 'active' : undefined,
      page,
      per_page: 20,
    }),
    [severityFilter, activeTab, page],
  );

  const { data: unreadData } = useApi(() => alertsApi.getUnreadCount(), []);

  const handleMarkRead = async (id: number) => {
    try {
      await alertsApi.markRead(id);
      refetch();
    } catch { /* silent */ }
  };

  const handleResolve = async (id: number) => {
    try {
      await alertsApi.resolve(id);
      refetch();
    } catch { /* silent */ }
  };

  const handleDismiss = async (id: number) => {
    try {
      await alertsApi.dismiss(id);
      refetch();
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertsApi.markAllRead();
      refetch();
    } catch { /* silent */ }
  };

  const allAlerts: Alert[] = alertData?.alerts || [];

  // Filter alerts by tab (client-side for renewal/eligibility/followup tabs)
  const alerts = activeTab !== 'all' && activeTab !== 'unread' && TYPE_MAP[activeTab]
    ? allAlerts.filter(a => TYPE_MAP[activeTab]?.includes(a.type))
    : allAlerts;

  const totalPages = alertData?.total_pages || 1;
  const total = alertData?.total || 0;
  const unreadCount = unreadData?.count ?? 0;

  return (
    <>
      <Header
        title="Notifications & Alerts"
        subtitle="View and manage system-generated alerts and notifications"
      />

      <div className="p-6 space-y-6">
        {/* Unread Counter Banner */}
        {unreadCount > 0 && (
          <div className="bg-gradient-to-r from-accent/10 to-blue-50 dark:from-accent/10 dark:to-blue-900/20 rounded-xl border border-accent/20 dark:border-accent/30 p-4 flex items-center gap-3">
            <span className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white font-bold text-sm">
              {unreadCount}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Click "Mark Read" on individual alerts or use the button below.
              </p>
            </div>
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mark All Read
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-1">
          <div className="flex items-center gap-1">
            {TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => { setActiveTab(tab.value); setPage(1); }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.value
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
                {tab.value === 'unread' && unreadCount > 0 && (
                  <span className="ml-1.5 text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Severity Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300"
              >
                {SEVERITY_FILTER.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            {severityFilter && (
              <button
                onClick={() => { setSeverityFilter(''); setPage(1); }}
                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-medium"
              >
                Clear
              </button>
            )}
            <div className="flex-1" />
            <span className="text-xs text-gray-500 dark:text-gray-400">{total} alert(s)</span>
          </div>
        </div>

        {/* Alerts List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="p-6">
              <ErrorMessage message={error} onRetry={refetch} />
            </div>
          ) : alerts.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {alerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onRead={() => handleMarkRead(alert.id)}
                  onResolve={() => handleResolve(alert.id)}
                  onDismiss={() => handleDismiss(alert.id)}
                  onViewWorker={() => alert.worker_id && navigate(`/workers/${alert.worker_id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No Alerts</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {activeTab === 'unread' ? 'All alerts have been read.' : 'No alerts match your current filters.'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function AlertRow({ alert, onRead, onResolve, onDismiss, onViewWorker }: {
  alert: Alert;
  onRead: () => void;
  onResolve: () => void;
  onDismiss: () => void;
  onViewWorker: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const severityIcon: Record<string, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🔵',
  };

  return (
    <div className={`px-5 py-4 transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-700/30 ${getAlertSeverityColor(alert.severity)}`}>
      <div className="flex items-start gap-3">
        {/* Severity indicator */}
        <span className="text-lg mt-0.5 shrink-0">{severityIcon[alert.severity] || '⚪'}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold text-gray-900 dark:text-white`}>{alert.title}</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getAlertSeverityColor(alert.severity)}`}>
              {alert.severity.toUpperCase()}
            </span>
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
              {formatAlertType(alert.type)}
            </span>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{alert.message}</p>

          <div className="flex items-center gap-4 mt-2">
            {alert.worker_name && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Worker: <button onClick={onViewWorker} className="font-medium text-accent hover:underline">{alert.worker_name}</button>
              </span>
            )}
            {alert.board_name && (
              <span className="text-xs text-gray-400 dark:text-gray-500">Board: {alert.board_name}</span>
            )}
            <span className="text-[11px] text-gray-400 dark:text-gray-500">{formatDateTime(alert.created_at)}</span>
          </div>

          {/* Expanded Actions */}
          {expanded && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
              {alert.worker_id && (
                <button
                  onClick={onViewWorker}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  View Applicant
                </button>
              )}
              <button
                onClick={onRead}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
              >
                Mark Read
              </button>
              <button
                onClick={onResolve}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
              >
                Resolve
              </button>
              <button
                onClick={onDismiss}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
        >
          <svg className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
