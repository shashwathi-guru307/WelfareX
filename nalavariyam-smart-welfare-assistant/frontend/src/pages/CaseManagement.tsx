import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { casesApi, boardsApi, schemesApi } from '../services/api';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import CreateCaseModal from '../components/CreateCaseModal';
import { formatDate, getCaseStatusColor, formatCaseStatus, getCasePriorityColor, formatCasePriority, formatIndianNumber } from '../utils/format';
import type { Case, CaseStatistics, WelfareBoard, WelfareScheme } from '../types';

export default function CaseManagement() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [boardFilter, setBoardFilter] = useState<number | ''>('');
  const [schemeFilter, setSchemeFilter] = useState<number | ''>('');
  const [page, setPage] = useState(1);

  const fetchCases = useCallback(() => {
    return casesApi.list({
      search: search || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      board_id: boardFilter !== '' ? Number(boardFilter) : undefined,
      scheme_id: schemeFilter !== '' ? Number(schemeFilter) : undefined,

      page,
      per_page: 15,
    });
  }, [search, statusFilter, priorityFilter, boardFilter, schemeFilter, page]);

  const { data: casesResponse, loading, error, refetch } = useApi(fetchCases, [search, statusFilter, priorityFilter, boardFilter, schemeFilter, page]);
  const { data: stats } = useApi(() => casesApi.getStatistics(), []);
  const { data: boards } = useApi(() => boardsApi.list(), []);
  const { data: schemes } = useApi(() => schemesApi.list(), []);

  const cases = casesResponse?.cases || [];
  const totalCases = casesResponse?.total || 0;
  const totalPages = casesResponse?.total_pages || 1;

  const handleCaseCreated = () => {
    setShowCreateModal(false);
    refetch();
  };

  const activeTotal = (stats as CaseStatistics | null)?.total_cases || 0;

  return (
    <>
      <Header title="Case Management" subtitle="Track and manage welfare benefit cases" />

      <div className="p-6 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <StatCard label="Total Cases" value={activeTotal} color="slate" />
          <StatCard label="New" value={(stats as CaseStatistics | null)?.new_cases || 0} color="blue" />
          <StatCard label="Under Review" value={(stats as CaseStatistics | null)?.under_review || 0} color="yellow" />
          <StatCard label="Docs Pending" value={(stats as CaseStatistics | null)?.documents_pending || 0} color="orange" />
          <StatCard label="Follow-up" value={(stats as CaseStatistics | null)?.follow_up_required || 0} color="amber" />
          <StatCard label="Completed" value={(stats as CaseStatistics | null)?.completed || 0} color="green" />
          <StatCard label="Urgent" value={(stats as CaseStatistics | null)?.urgent_cases || 0} color="red" />
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search cases..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder-gray-400 dark:text-white w-64"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 text-sm bg-white dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="NEW">New</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="DOCUMENTS_PENDING">Documents Pending</option>
              <option value="ELIGIBILITY_REVIEW">Eligibility Review</option>
              <option value="READY_FOR_SUBMISSION">Ready for Submission</option>
              <option value="FOLLOW_UP_REQUIRED">Follow-up Required</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CLOSED">Closed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 text-sm bg-white dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 dark:text-white"
            >
              <option value="">All Priority</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Board Filter */}
            <select
              value={boardFilter}
              onChange={(e) => { setBoardFilter(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
              className="px-3 py-2.5 text-sm bg-white dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 dark:text-white"
            >
              <option value="">All Boards</option>
              {(boards as WelfareBoard[] | null)?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            {/* Scheme Filter */}
            <select
              value={schemeFilter}
              onChange={(e) => { setSchemeFilter(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
              className="px-3 py-2.5 text-sm bg-white dark:bg-[#0a1a1e] border border-gray-200 dark:border-[#1a3a40] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 dark:text-white"
            >
              <option value="">All Schemes</option>
              {(schemes as WelfareScheme[] | null)?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => casesApi.exportCsv({ status: statusFilter || undefined, priority: priorityFilter || undefined }).then(r => r.blob()).then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'cases_export.csv'; a.click();
                URL.revokeObjectURL(url);
              })}
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-[#1a3a40] rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export CSV
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors shadow-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create Case
            </button>
          </div>
        </div>

        {/* Case Table */}
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage message={error} onRetry={refetch} />
        ) : cases.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-12 text-center">
            <svg className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-sm font-medium text-gray-900 dark:text-white">No cases found</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {search || statusFilter || priorityFilter ? 'Try adjusting your filters.' : 'Create a new case to get started.'}
            </p>
            {!search && !statusFilter && !priorityFilter && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors"
              >
                Create First Case
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Case Number</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Applicant</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Scheme</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Claimant</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {cases.map((c: Case) => (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/cases/${c.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-semibold text-accent">{c.case_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-[10px]">
                            {(c.worker_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{c.worker_name || 'Unknown'}</p>
                            {c.worker_district && <p className="text-[11px] text-gray-500 dark:text-gray-400">{c.worker_district}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{c.scheme_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{c.claimant_name || '—'}</span>
                        {c.claimant_type === 'FAMILY_MEMBER' && (
                          <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">(Family)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getCaseStatusColor(c.status)}`}>
                          {formatCaseStatus(c.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getCasePriorityColor(c.priority)}`}>
                          {formatCasePriority(c.priority)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{c.assigned_to || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(c.opened_at)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/cases/${c.id}`)}
                          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, totalCases)} of {formatIndianNumber(totalCases)} cases
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-[#1a3a40] rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400 px-2">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-[#1a3a40] rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Requires Official Verification — Case management tracks administrative processing only.
        </p>
      </div>

      {/* Create Case Modal */}
      {showCreateModal && (
        <CreateCaseModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCaseCreated}
        />
      )}
    </>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const bgColors: Record<string, string> = {
    slate: 'bg-white dark:bg-slate-800',
    blue: 'bg-white dark:bg-slate-800',
    yellow: 'bg-white dark:bg-slate-800',
    orange: 'bg-white dark:bg-slate-800',
    amber: 'bg-white dark:bg-slate-800',
    green: 'bg-white dark:bg-slate-800',
    red: 'bg-white dark:bg-slate-800',
  };
  const dotColors: Record<string, string> = {
    slate: 'bg-slate-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    amber: 'bg-amber-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
  };
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4 ${bgColors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${dotColors[color]}`} />
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatIndianNumber(value)}</p>
    </div>
  );
}
