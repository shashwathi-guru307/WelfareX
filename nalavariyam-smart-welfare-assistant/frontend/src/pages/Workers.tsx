import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { workersApi, boardsApi, type WorkerListParams } from '../services/api';
import type { WelfareBoard } from '../types';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
import Pagination from '../components/common/Pagination';
import ConfirmModal from '../components/common/ConfirmModal';
import { formatDate, maskPhone, getInitials, getRenewalStatusColor, formatRenewalStatus, formatDaysRemaining } from '../utils/format';

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Date Added' },
  { value: 'name', label: 'Name' },
  { value: 'registration_number', label: 'Registration No.' },
  { value: 'registration_date', label: 'Registration Date' },
  { value: 'renewal_date', label: 'Renewal Date' },
  { value: 'board', label: 'Board' },
  { value: 'district', label: 'District' },
  { value: 'status', label: 'Status' },
];

export default function Workers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [boardFilter, setBoardFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [occupationFilter, setOccupationFilter] = useState('');
  const [renewalStatusFilter, setRenewalStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [params, setParams] = useState<WorkerListParams>({ page: 1, per_page: 15 });

  const { data: boards } = useApi(() => boardsApi.list(), []);

  const { data, loading, error, refetch } = useApi(
    () => workersApi.list(params),
    [params],
  );

  useEffect(() => {
    setParams({
      search: search || undefined,
      board_id: boardFilter ? Number(boardFilter) : undefined,
      status: statusFilter || undefined,
      district: districtFilter || undefined,
      occupation: occupationFilter || undefined,
      renewal_status: renewalStatusFilter || undefined,
      sort_by: sortBy,
      sort_order: sortDir,
      page,
      per_page: 15,
    });
  }, [search, boardFilter, statusFilter, districtFilter, occupationFilter, renewalStatusFilter, sortBy, sortDir, page]);

  useEffect(() => {
    setPage(1);
  }, [search, boardFilter, statusFilter, districtFilter, occupationFilter, renewalStatusFilter, sortBy, sortDir]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await workersApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return (
      <svg className="h-3 w-3 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
      </svg>
    );
    return (
      <svg className={`h-3 w-3 text-accent transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    );
  };

  const activeFilterCount = [boardFilter, statusFilter, districtFilter, occupationFilter, renewalStatusFilter].filter(Boolean).length;

  return (
    <>
      <Header title="Registered Workers & Family Rosters" subtitle="Worker directory, family rosters, registration records" />

      <div className="p-6 space-y-4">
        {/* Directory Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Registered Worker Directory</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Showing {data?.workers?.length || 0} of {data?.total || 0} registered applicant records
            </p>
          </div>
          <button
            onClick={() => navigate('/workers/new')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
            Add New Applicant
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
          {/* Main filter row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by worker name, reg no, phone..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder-gray-400 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Board Filter */}
            <select
              value={boardFilter}
              onChange={(e) => setBoardFilter(e.target.value)}
              className="px-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-gray-700 dark:text-gray-300 min-w-[180px]"
            >
              <option value="">All Welfare Boards</option>
              {boards?.map((b: WelfareBoard) => (
                <option key={b.id} value={b.id}>{b.name.replace('Tamil Nadu ', 'TN ')}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-gray-700 dark:text-gray-300 min-w-[160px]"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Renewal Due">Renewal Due</option>
              <option value="Expiring Soon">Expiring Soon</option>
              <option value="Expired">Expired</option>
              <option value="Suspended">Suspended</option>
              <option value="Pending Verification">Pending Verification</option>
            </select>

            {/* More Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-accent/10 text-accent border-accent/30'
                  : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-bold bg-accent text-white rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort */}
            <div className="flex items-center gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-gray-700 dark:text-gray-300"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="p-2.5 text-gray-500 hover:text-gray-700 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
              >
                <svg className={`h-4 w-4 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13-6L16.5 19m0 0L12 14.5m4.5 4.5V7.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Extended filters */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-gray-700 dark:text-gray-300 min-w-[160px]"
              >
                <option value="">All Districts</option>
                {[...new Set(data?.workers?.map(w => w.district).filter(Boolean) as string[])].sort().map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={occupationFilter}
                onChange={(e) => setOccupationFilter(e.target.value)}
                className="px-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-gray-700 dark:text-gray-300 min-w-[160px]"
              >
                <option value="">All Occupations</option>
                {[...new Set(data?.workers?.map(w => w.occupation).filter(Boolean) as string[])].sort().map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <select
                value={renewalStatusFilter}
                onChange={(e) => setRenewalStatusFilter(e.target.value)}
                className="px-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-gray-700 dark:text-gray-300 min-w-[160px]"
              >
                <option value="">All Renewal Status</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRING_SOON">Expiring Soon</option>
                <option value="EXPIRED">Expired</option>
                <option value="NO_RENEWAL_DATE">Missing Date</option>
              </select>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setBoardFilter(''); setStatusFilter(''); setDistrictFilter(''); setOccupationFilter(''); setRenewalStatusFilter(''); }}
                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="p-6">
              <ErrorMessage message={error} onRetry={refetch} />
            </div>
          ) : data?.workers && data.workers.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                      {[
                        { key: 'name', label: 'Applicant' },
                        { key: 'board', label: 'Welfare Board' },
                        { key: null, label: 'Reg. No.' },
                        { key: null, label: 'DOB / Age' },
                        { key: 'registration_date', label: 'Reg. Date' },
                        { key: null, label: 'Contact' },
                        { key: 'renewal_date', label: 'Renewal' },
                        { key: 'status', label: 'Status' },
                        { key: null, label: 'Actions' },
                      ].map((col, i) => (
                        <th
                          key={i}
                          className={`px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col.key ? 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none' : ''}`}
                          onClick={col.key ? () => handleSort(col.key) : undefined}
                        >
                          <span className="flex items-center gap-1">
                            {col.label}
                            {col.key && <SortIcon column={col.key} />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                    {data.workers.map((worker) => (
                      <tr key={worker.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        {/* Applicant */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-sm shrink-0">
                              {getInitials(worker.full_name)}
                            </div>
                            <div className="min-w-0">
                              <button
                                onClick={() => navigate(`/workers/${worker.id}`)}
                                className="text-sm font-semibold text-gray-900 dark:text-white hover:text-accent transition-colors text-left truncate block max-w-[160px]"
                              >
                                {worker.full_name}
                              </button>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[160px]">
                                {worker.worker_category || '—'} &middot; {worker.district || '—'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Board */}
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-300 max-w-[140px] truncate block" title={worker.board_name || ''}>
                            {(worker.board_name || '—').replace('Tamil Nadu ', 'TN ')}
                          </span>
                        </td>

                        {/* Reg No */}
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                            {worker.registration_number || '—'}
                          </span>
                        </td>

                        {/* DOB / Age */}
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {formatDate(worker.date_of_birth)}
                          </div>
                          {worker.age != null && (
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">{worker.age} yrs</div>
                          )}
                        </td>

                        {/* Registration Date */}
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {formatDate(worker.registration_date)}
                        </td>

                        {/* Contact */}
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono text-xs">
                          {maskPhone(worker.mobile_number || '')}
                        </td>

                        {/* Renewal */}
                        <td className="px-4 py-3">
                          {(worker as any).computed_status ? (
                            <div className="flex flex-col gap-1">
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border inline-block w-fit ${getRenewalStatusColor((worker as any).computed_status)}`}>
                                {formatRenewalStatus((worker as any).computed_status)}
                              </span>
                              {(worker as any).days_until_renewal !== null && (worker as any).days_until_renewal !== undefined && (
                                <span className={`text-[11px] ${(worker as any).days_until_renewal < 0 ? 'text-red-600 dark:text-red-400' : (worker as any).days_until_renewal <= 14 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {formatDaysRemaining((worker as any).days_until_renewal)}
                                </span>
                              )}
                            </div>
                          ) : worker.renewal_date ? (
                            <span className="text-sm text-gray-600 dark:text-gray-300">{formatDate(worker.renewal_date)}</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {worker.registration_status ? (
                            <StatusBadge status={worker.registration_status} />
                          ) : (
                            <span className="text-xs text-gray-400">No Registration</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => navigate(`/workers/${worker.id}`)}
                              className="p-1.5 text-gray-400 hover:text-accent hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                              title="View Details"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ id: worker.id, name: worker.full_name })}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                              title="Archive / Delete"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700">
                <Pagination
                  currentPage={data.page}
                  totalPages={data.total_pages}
                  onPageChange={setPage}
                />
              </div>
            </>
          ) : (
            <EmptyState
              icon={
                <svg className="h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              }
              title="No applicant records match your criteria"
              message="Try modifying search keywords or clearing filters."
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Archive Applicant"
        message={`Are you sure you want to archive ${deleteTarget?.name}? The applicant record will no longer appear in the active list. This action can be reversed by an administrator.`}
        confirmLabel={deleting ? 'Archiving...' : 'Archive Applicant'}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
