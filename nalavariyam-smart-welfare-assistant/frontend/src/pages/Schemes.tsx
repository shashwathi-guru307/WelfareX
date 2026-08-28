import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { schemesApi, schemeCategoriesApi } from '../services/api';
import type { WelfareScheme, SchemeCategory, SchemeBenefit, SchemeQualification } from '../types';
import Header from '../components/layout/Header';
import SearchInput from '../components/common/SearchInput';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';

function formatAmount(amount: string | null | undefined): string {
  if (!amount) return '—';
  return amount;
}

function BenefitTable({ benefits, qualifications }: { benefits: SchemeBenefit[]; qualifications?: SchemeQualification[] }) {
  if (!benefits || benefits.length === 0) return <p className="text-sm text-gray-500">No board-specific benefits configured.</p>;

  // Check if this is an education scheme with qualification variants
  const hasQualifications = qualifications && qualifications.length > 0;

  if (hasQualifications) {
    // Education-style table: qualifications as rows, boards as columns
    const boardIds = [...new Set(benefits.map(b => b.board_id))].sort();

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-semibold text-gray-700">Qualification</th>
              {boardIds.map(bid => {
                const bName = benefits.find(b => b.board_id === bid)?.board_name || `Board ${bid}`;
                return (
                  <th key={bid} className="text-right py-2 px-3 font-semibold text-gray-700 min-w-[140px]">
                    {bName}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {qualifications.map(qual => (
              <tr key={qual.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 text-gray-700">{qual.qualification_text}</td>
                {boardIds.map(bid => {
                  const benefit = benefits.find(b => b.board_id === bid && b.qualification_id === qual.id);
                  if (!benefit || !benefit.is_available) {
                    return (
                      <td key={bid} className="text-right py-2 px-3 text-gray-400 italic">
                        Not listed
                      </td>
                    );
                  }
                  return (
                    <td key={bid} className="text-right py-2 px-3 font-medium text-emerald-700">
                      {formatAmount(benefit.amount)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Non-education: simple board → amount table
  return (
    <div className="space-y-2">
      {benefits.map((benefit) => (
        <div
          key={benefit.id}
          className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100"
        >
          <span className="text-sm text-gray-700 font-medium">{benefit.board_name || `Board ${benefit.board_id}`}</span>
          {benefit.is_available ? (
            <span className="text-sm font-semibold text-emerald-700">{formatAmount(benefit.amount)}</span>
          ) : (
            <span className="text-sm text-gray-400 italic">Not listed</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Schemes() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedScheme, setSelectedScheme] = useState<WelfareScheme | null>(null);
  const [schemeDetails, setSchemeDetails] = useState<WelfareScheme | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const { data: categories } = useApi(() => schemeCategoriesApi.list(), []);

  const { data: schemes, loading, error, refetch } = useApi(
    () => schemesApi.list({
      search: search || undefined,
      category_id: categoryFilter ? Number(categoryFilter) : undefined,
    }),
    [search, categoryFilter],
  );

  // Load detailed scheme data when a scheme is selected
  useEffect(() => {
    if (selectedScheme) {
      setLoadingDetails(true);
      schemesApi.getById(selectedScheme.id).then(res => {
        if (res.data) setSchemeDetails(res.data);
        setLoadingDetails(false);
      }).catch(() => {
        setSchemeDetails(selectedScheme);
        setLoadingDetails(false);
      });
    } else {
      setSchemeDetails(null);
    }
  }, [selectedScheme]);

  return (
    <>
      <Header title="Welfare Schemes" subtitle="Board-specific welfare benefits from official Nalavariyam data" />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search schemes..."
              className="w-64"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-gray-700 min-w-[200px]"
            >
              <option value="">All Categories</option>
              {categories?.map((c: SchemeCategory) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Schemes */}
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage message={error} onRetry={refetch} />
        ) : !schemes || schemes.length === 0 ? (
          <EmptyState message="No welfare schemes found matching the current filters." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {schemes.map((scheme) => (
              <div
                key={scheme.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                onClick={() => setSelectedScheme(scheme)}
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-accent uppercase tracking-wider">
                        {scheme.category_name || 'General'}
                      </p>
                      <h3 className="text-sm font-bold text-gray-900 mt-1 leading-tight">
                        {scheme.name}
                      </h3>
                    </div>
                    <StatusBadge status={scheme.is_active ? 'Active' : 'Inactive'} />
                  </div>

                  {scheme.claimant_type && (
                    <p className="text-[11px] text-gray-500">
                      Claimant: {scheme.claimant_type.replace(/_/g, ' ')}
                    </p>
                  )}

                  {scheme.max_usage && (
                    <p className="text-[11px] text-amber-600 font-medium">
                      Max {scheme.max_usage} time{scheme.max_usage > 1 ? 's' : ''}
                    </p>
                  )}

                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {scheme.description || 'No description available.'}
                  </p>

                  {/* Board availability summary */}
                  {scheme.available_boards !== undefined && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      <p className="text-xs text-blue-700">
                        Available on {scheme.available_boards} board{scheme.available_boards !== 1 ? 's' : ''}
                        {scheme.qualification_count ? ` · ${scheme.qualification_count} variants` : ''}
                      </p>
                    </div>
                  )}

                  <button className="w-full mt-2 text-center text-sm font-medium text-accent hover:text-accent-hover py-1 transition-colors">
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedScheme}
        onClose={() => setSelectedScheme(null)}
        title={selectedScheme?.name || 'Scheme Details'}
        maxWidth="max-w-4xl"
      >
        {loadingDetails ? (
          <LoadingSpinner />
        ) : schemeDetails && (
          <div className="space-y-5">
            {/* Header info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Category</p>
                <p className="text-sm text-gray-900 mt-1">{schemeDetails.category_name || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Claimant Type</p>
                <p className="text-sm text-gray-900 mt-1">{(schemeDetails.claimant_type || 'WORKER').replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Max Usage</p>
                <p className="text-sm text-gray-900 mt-1">{schemeDetails.max_usage ? `${schemeDetails.max_usage} time(s)` : 'Unlimited'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</p>
                <div className="mt-1"><StatusBadge status={schemeDetails.is_active ? 'Active' : 'Inactive'} /></div>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed">{schemeDetails.description || 'No description available.'}</p>
            </div>

            {/* Source Qualification Text */}
            {schemeDetails.qualification_text && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider mb-1">Source Qualification</p>
                <p className="text-sm text-amber-900">{schemeDetails.qualification_text}</p>
              </div>
            )}

            {/* Benefits by Board */}
            {schemeDetails.board_benefits && schemeDetails.board_benefits.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Benefits by Board
                </p>
                <BenefitTable
                  benefits={schemeDetails.board_benefits}
                  qualifications={schemeDetails.qualifications}
                />
              </div>
            )}

            {/* Eligibility Rules */}
            {schemeDetails.scheme_rules && schemeDetails.scheme_rules.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Eligibility Rules</p>
                <div className="space-y-2">
                  {schemeDetails.scheme_rules.map((rule) => (
                    <div key={rule.id} className="flex items-center gap-3 text-sm bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                      <StatusBadge status={rule.is_active ? 'Required' : 'Optional'} />
                      <span className="font-medium text-gray-700">{rule.field}</span>
                      <span className="text-gray-400">{rule.operator}</span>
                      <span className="text-gray-600">{rule.value}</span>
                      {rule.description && (
                        <span className="text-gray-500 text-xs ml-auto">{rule.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Required Documents */}
            {schemeDetails.required_documents && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Required Documents</p>
                <p className="text-sm text-gray-700 leading-relaxed">{schemeDetails.required_documents}</p>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Disclaimer:</strong> This is an administrative decision-support tool. Final eligibility
                determination is subject to official document verification and applicable government rules.
                Amounts shown are as per the provided source dataset.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
