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
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyResult, setNotifyResult] = useState<null | {
    notified: number;
    skipped: number;
    errors: number;
    total_workers: number;
    sms_configured: boolean;
    sms_sent: number;
    sms_failed: number;
    sms_skipped: number;
    notified_workers: Array<{ worker_id: number; worker_name: string; eligible_schemes: number; scheme_names: string[]; sms_sent?: boolean; sms_error?: string | null }>;
  }>(null);
  const [sendSmsEnabled, setSendSmsEnabled] = useState(true);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [smsStatus, setSmsStatus] = useState<null | { configured: boolean; message: string }>(null);
  const [testSmsPhone, setTestSmsPhone] = useState('');
  const [testSmsLoading, setTestSmsLoading] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState<string | null>(null);

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

  // Check SMS status when dialog opens
  const checkSmsStatus = async () => {
    try {
      const result = await alertsApi.getSmsStatus();
      if (result.data) {
        setSmsStatus({ configured: result.data.configured, message: result.data.message });
        if (!result.data.configured) {
          setSendSmsEnabled(false);
        }
      }
    } catch {
      setSmsStatus({ configured: false, message: 'Could not check SMS status.' });
      setSendSmsEnabled(false);
    }
  };

  const handleNotifyEligible = async () => {
    setNotifyLoading(true);
    setNotifyResult(null);
    setNotifyError(null);
    try {
      const result = await alertsApi.notifyEligible(undefined, sendSmsEnabled);
      if (result.data) {
        setNotifyResult(result.data);
      }
      refetch();
    } catch (err: any) {
      setNotifyError(err?.message || 'Failed to send notifications. Please try again.');
    } finally {
      setNotifyLoading(false);
    }
  };

  const handleTestSms = async () => {
    if (!testSmsPhone.trim()) return;
    setTestSmsLoading(true);
    setTestSmsResult(null);
    try {
      const result = await alertsApi.testSms(testSmsPhone.trim());
      setTestSmsResult(`SMS sent successfully! Status: ${result.data?.status ?? 'unknown'}, SID: ${result.data?.message_sid ?? 'n/a'}`);
    } catch (err: any) {
      setTestSmsResult(`SMS failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setTestSmsLoading(false);
    }
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

        {/* Bulk Notify Eligible */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800/40 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center shrink-0">
            <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Notify Eligible Applicants
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Run eligibility analysis for all workers and send notifications to those who qualify for welfare schemes.
            </p>
          </div>
          <button
            onClick={() => { setShowNotifyDialog(true); checkSmsStatus(); }}
            disabled={notifyLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {notifyLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                Notify All Eligible
              </>
            )}
          </button>
        </div>

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
                className="px-3 py-2 text-sm bg-gray-50 dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300"
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

      {/* Notify Eligible Confirmation Dialog */}
      {showNotifyDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-lg mx-4 overflow-hidden">
            {notifyResult ? (
              /* Results view */
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications Sent!</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Bulk eligibility notification complete</p>
                  </div>
                </div>

                <div className={`grid gap-3 mb-4 ${notifyResult.sms_configured ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{notifyResult.notified}</p>
                    <p className="text-[11px] text-green-700 dark:text-green-300 font-medium">Notified</p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{notifyResult.skipped}</p>
                    <p className="text-[11px] text-yellow-700 dark:text-yellow-300 font-medium">Skipped</p>
                  </div>
                  {notifyResult.sms_configured && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{notifyResult.sms_sent}</p>
                      <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">SMS Sent</p>
                    </div>
                  )}
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{notifyResult.total_workers}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Total Workers</p>
                  </div>
                </div>

                {notifyResult.sms_configured && (notifyResult.sms_failed > 0 || notifyResult.sms_skipped > 0) && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg p-3 mb-4 text-xs text-amber-700 dark:text-amber-300">
                    {notifyResult.sms_failed > 0 && <p> SMS failed: {notifyResult.sms_failed} worker(s) could not be reached.</p>}
                    {notifyResult.sms_skipped > 0 && <p> SMS skipped: {notifyResult.sms_skipped} worker(s) have no mobile number on file.</p>}
                  </div>
                )}
                {!notifyResult.sms_configured && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg p-3 mb-4 text-xs text-amber-700 dark:text-amber-300">
                    SMS is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env to enable real SMS delivery.
                  </div>
                )}

                {notifyResult.notified_workers.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Notified Workers:</p>
                    <div className="max-h-48 overflow-auto space-y-1">
                      {notifyResult.notified_workers.map((w) => (
                        <div key={w.worker_id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setShowNotifyDialog(false); navigate(`/workers/${w.worker_id}`); }}
                              className="font-medium text-accent hover:underline"
                            >
                              {w.worker_name}
                            </button>
                            {w.sms_sent && (
                              <span className="text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full">SMS ✓</span>
                            )}
                            {w.sms_error && (
                              <span className="text-[10px] font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded-full" title={w.sms_error}>SMS ✗</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {w.eligible_schemes} scheme{w.eligible_schemes !== 1 ? 's' : ''}: {w.scheme_names.slice(0, 2).join(', ')}{w.scheme_names.length > 2 ? '...' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { setShowNotifyDialog(false); setNotifyResult(null); }}
                  className="w-full px-4 py-2.5 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              /* Confirmation view */
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notify All Eligible</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Send eligibility notifications to all qualifying applicants</p>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/40 rounded-xl p-4 mb-4">
                  <p className="text-sm text-purple-800 dark:text-purple-200">
                    This will run eligibility analysis for <strong>every active worker</strong> in the system and send a notification to each worker who qualifies for one or more welfare schemes.
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-purple-700 dark:text-purple-300">
                    <li className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      Workers already notified today will be skipped
                    </li>
                    <li className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      Workers with no eligible schemes will be skipped
                    </li>
                    <li className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      This may take a moment for large datasets
                    </li>
                  </ul>
                </div>

                {/* SMS Status Warning */}
                {smsStatus && !smsStatus.configured && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 mb-4">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">SMS Not Configured</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">{smsStatus.message}</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="tel"
                        placeholder="Enter your number (e.g. 9876543210)"
                        value={testSmsPhone}
                        onChange={(e) => setTestSmsPhone(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-700 border border-amber-300 dark:border-amber-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <button
                        onClick={handleTestSms}
                        disabled={testSmsLoading || !testSmsPhone.trim()}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                      >
                        {testSmsLoading ? 'Sending...' : 'Test SMS'}
                      </button>
                    </div>
                    {testSmsResult && (
                      <p className={`text-xs mt-2 ${testSmsResult.includes('success') ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{testSmsResult}</p>
                    )}
                  </div>
                )}
                {smsStatus && smsStatus.configured && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl p-3 mb-4">
                    <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      SMS is configured and ready to send
                    </p>
                  </div>
                )}

                {/* SMS Toggle */}
                <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl mb-4">
                  <button
                    type="button"
                    onClick={() => setSendSmsEnabled(!sendSmsEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${sendSmsEnabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${sendSmsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Send SMS Notifications</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {!smsStatus?.configured ? 'Configure Twilio first to enable SMS' : sendSmsEnabled ? 'Real SMS will be sent to workers with mobile numbers' : 'Only in-app notifications will be created'}
                    </p>
                  </div>
                </div>

                {/* Error display */}
                {notifyError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-3 mb-4">
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">Error</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{notifyError}</p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setShowNotifyDialog(false); setNotifyError(null); }}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNotifyEligible}
                    disabled={notifyLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    {notifyLoading ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Analyzing All Workers...
                      </>
                    ) : (
                      'Send Notifications'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#0a1a1e] px-2 py-0.5 rounded-full">
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
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
