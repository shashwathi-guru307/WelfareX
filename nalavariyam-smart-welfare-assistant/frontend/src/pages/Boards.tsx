import { useApi } from '../hooks/useApi';
import { boardsApi } from '../services/api';
import Header from '../components/layout/Header';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';

export default function Boards() {
  const { data: boards, loading, error, refetch } = useApi(() => boardsApi.list(), []);

  return (
    <>
      <Header title="Welfare Boards" subtitle="Manage welfare boards under the Tamil Nadu Unorganised Workers Welfare Board" />

      <div className="p-6">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage message={error} onRetry={refetch} />
        ) : !boards || boards.length === 0 ? (
          <EmptyState message="No welfare boards found." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {boards.map((board) => (
              <div key={board.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-gray-900 leading-tight">{board.name}</h3>
                    </div>
                    <StatusBadge status={board.is_active ? 'Active' : 'Inactive'} />
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed">
                    {board.description || 'No description available.'}
                  </p>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-[11px] text-gray-500 uppercase font-semibold tracking-wider">Workers</p>
                      <p className="text-xl font-bold text-gray-900 mt-1">{board.worker_count ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 uppercase font-semibold tracking-wider">Active Reg.</p>
                      <p className="text-xl font-bold text-emerald-600 mt-1">{board.active_registrations ?? 0}</p>
                    </div>
                  </div>

                  {board.registration_requirements && (
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-[11px] text-gray-500 uppercase font-semibold tracking-wider mb-1">Requirements</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{board.registration_requirements}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
