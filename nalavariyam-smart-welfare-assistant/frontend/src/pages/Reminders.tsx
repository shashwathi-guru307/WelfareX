import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { remindersApi } from '../services/api';
import type { Reminder, ReminderType, ReminderPriority } from '../types';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import {
  formatDate,
  getReminderPriorityColor,
  getReminderStatusColor,
  formatReminderType,
  getReminderTypeIcon,
  formatReminderDays,
} from '../utils/format';

const STATUS_FILTER = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const TYPE_FILTER = [
  { value: '', label: 'All Types' },
  { value: 'RENEWAL', label: 'Renewal' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'ELIGIBILITY', label: 'Eligibility' },
  { value: 'OTHER', label: 'Other' },
];

const PRIORITY_OPTIONS: { value: ReminderPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const TYPE_OPTIONS: { value: ReminderType; label: string }[] = [
  { value: 'RENEWAL', label: 'Renewal' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'ELIGIBILITY', label: 'Eligibility' },
  { value: 'OTHER', label: 'Other' },
];

export default function Reminders() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const { data: reminderData, loading, error, refetch } = useApi(
    () => remindersApi.list({
      status: statusFilter || undefined,
      type: typeFilter || undefined,
      page,
      per_page: 20,
    }),
    [statusFilter, typeFilter, page],
  );

  const { data: summary } = useApi(() => remindersApi.getSummary(), []);

  const reminders: Reminder[] = reminderData?.reminders || [];
  const totalPages = reminderData?.total_pages || 1;

  const handleComplete = async (id: number) => {
    try {
      await remindersApi.complete(id);
      refetch();
    } catch { /* silent */ }
  };

  const handleCancel = async (id: number) => {
    try {
      await remindersApi.cancel(id);
      refetch();
    } catch { /* silent */ }
  };

  return (
    <>
      <Header title="Reminders" subtitle="Manage staff reminders for follow-ups, renewals, and tasks" />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryCard label="Pending" value={summary?.total_pending ?? '—'} color="text-blue-600 dark:text-blue-400" />
          <SummaryCard label="Overdue" value={summary?.overdue ?? '—'} color="text-red-600 dark:text-red-400" />
          <SummaryCard label="Due Today" value={summary?.due_today ?? '—'} color="text-amber-600 dark:text-amber-400" />
          <SummaryCard label="This Week" value={summary?.due_this_week ?? '—'} color="text-purple-600 dark:text-purple-400" />
          <SummaryCard label="Completed Today" value={summary?.completed_today ?? '—'} color="text-green-600 dark:text-green-400" />
        </div>

        {/* Filters & Create Button */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 text-sm bg-gray-50 dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300"
              >
                {STATUS_FILTER.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 text-sm bg-gray-50 dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300"
              >
                {TYPE_FILTER.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            {(statusFilter || typeFilter) && (
              <button
                onClick={() => { setStatusFilter(''); setTypeFilter(''); setPage(1); }}
                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-medium"
              >
                Clear filters
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Reminder
            </button>
          </div>
        </div>

        {/* Create Reminder Form */}
        {showCreate && (
          <CreateReminderForm
            onClose={() => setShowCreate(false)}
            onCreated={() => { setShowCreate(false); refetch(); }}
          />
        )}

        {/* Reminders List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="p-6"><ErrorMessage message={error} onRetry={refetch} /></div>
          ) : reminders.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {reminders.map((reminder) => (
                <ReminderRow
                  key={reminder.id}
                  reminder={reminder}
                  onComplete={() => handleComplete(reminder.id)}
                  onCancel={() => handleCancel(reminder.id)}
                  onViewWorker={() => reminder.worker_id && navigate(`/workers/${reminder.worker_id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No Reminders</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Create a new reminder to track follow-ups.</p>
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

function SummaryCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function ReminderRow({ reminder, onComplete, onCancel, onViewWorker }: {
  reminder: Reminder;
  onComplete: () => void;
  onCancel: () => void;
  onViewWorker: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const priorityDot: Record<string, string> = {
    URGENT: 'bg-red-500',
    HIGH: 'bg-orange-500',
    MEDIUM: 'bg-yellow-500',
    LOW: 'bg-blue-500',
  };

  return (
    <div className={`px-5 py-4 transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-700/30 ${
      reminder.is_overdue ? 'border-l-4 border-red-400 dark:border-red-500' : ''
    }`}>
      <div className="flex items-start gap-3">
        {/* Priority dot */}
        <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${priorityDot[reminder.priority] || 'bg-gray-400'}`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm">{getReminderTypeIcon(reminder.reminder_type)}</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{reminder.title}</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getReminderPriorityColor(reminder.priority)}`}>
              {reminder.priority}
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getReminderStatusColor(reminder.status)}`}>
              {reminder.status}
            </span>
            {reminder.is_overdue && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                OVERDUE
              </span>
            )}
          </div>

          {reminder.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{reminder.description}</p>
          )}

          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatReminderType(reminder.reminder_type)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Due: {formatDate(reminder.reminder_date)}
            </span>
            {reminder.days_until !== null && reminder.days_until !== undefined && (
              <span className={`text-xs font-medium ${reminder.days_until < 0 ? 'text-red-600 dark:text-red-400' : reminder.days_until === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {formatReminderDays(reminder.days_until)}
              </span>
            )}
            {reminder.worker_name && (
              <button onClick={onViewWorker} className="text-xs text-accent hover:underline font-medium">
                {reminder.worker_name}
              </button>
            )}
          </div>

          {/* Expanded Actions */}
          {expanded && reminder.status === 'PENDING' && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
              {reminder.worker_id && (
                <button
                  onClick={onViewWorker}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  View Applicant
                </button>
              )}
              <button
                onClick={onComplete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
              >
                Complete
              </button>
              <button
                onClick={onCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Expand toggle */}
        {reminder.status === 'PENDING' && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
          >
            <svg className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function CreateReminderForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ReminderType>('OTHER');
  const [priority, setPriority] = useState<ReminderPriority>('MEDIUM');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await remindersApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        reminder_type: type,
        priority,
        reminder_date: date,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reminder.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Reminder</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300"
              placeholder="e.g., Follow up on renewal documents"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Due Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ReminderType)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300"
            >
              {TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as ReminderPriority)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300"
            >
              {PRIORITY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300"
            placeholder="Optional details about this reminder"
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {saving ? 'Creating...' : 'Create Reminder'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
