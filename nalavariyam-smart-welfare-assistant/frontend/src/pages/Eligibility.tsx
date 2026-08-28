import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { workersApi, eligibilityApi } from '../services/api';
import type { EligibilityAnalysis, SchemeEligibilityResult, EligibilityStatus } from '../types';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate, formatBenefitAmount, getInitials } from '../utils/format';

type FilterTab = 'all' | 'potential' | 'eligible' | 'insufficient' | 'not_eligible' | 'worker' | 'family';
type CategoryFilter = 'all' | 'education' | 'marriage' | 'maternity' | 'health' | 'pension' | 'death' | 'housing' | 'women';

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  education: ['education', 'edu_assist', 'spectacles'],
  marriage: ['marriage'],
  maternity: ['maternity'],
  health: ['spectacles', 'eyeglasses', 'health'],
  pension: ['pension'],
  death: ['death', 'disability', 'funeral', 'accidental'],
  housing: ['house', 'housing'],
  women: ['women', 'auto'],
};

export default function Eligibility() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialWorkerId = searchParams.get('worker') || '';
  const [workerId, setWorkerId] = useState(initialWorkerId);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<EligibilityAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [detailResult, setDetailResult] = useState<SchemeEligibilityResult | null>(null);

  const { data: workersData } = useApi(() => workersApi.list({ per_page: 200 }), []);

  const workers = workersData?.workers || [];

  // Auto-analyze if worker ID is provided in URL
  useEffect(() => {
    if (initialWorkerId && !analysis && !analyzing) {
      handleAnalyzeWithId(initialWorkerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWorkerId]);

  const handleAnalyzeWithId = async (id: string) => {
    if (!id) {
      setAnalysisError('Please select an applicant to analyze.');
      return;
    }
    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysis(null);
    try {
      const response = await eligibilityApi.analyzeWorker(Number(id));
      if (response.success && response.data) {
        setAnalysis(response.data);
      } else {
        setAnalysisError(response.error || 'Eligibility analysis failed.');
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyze = () => handleAnalyzeWithId(workerId);

  // Filter results based on active filters
  const filteredResults = useMemo(() => {
    if (!analysis) return [];

    let allResults: (SchemeEligibilityResult & { claimant_label?: string })[] = [];

    // Worker results
    if (filterTab === 'all' || filterTab === 'worker') {
      allResults = [...allResults, ...analysis.worker_results.map(r => ({ ...r, claimant_label: 'Worker' }))];
    }

    // Family results
    if (filterTab === 'all' || filterTab === 'family') {
      for (const fr of analysis.family_results) {
        for (const r of fr.results) {
          allResults.push({
            ...r,
            claimant_label: `${fr.family_member.relationship} (${fr.family_member.name})`,
          });
        }
      }
    }

    // Status filter
    if (filterTab === 'potential') {
      allResults = allResults.filter(r => r.status === 'POTENTIAL_MATCH');
    } else if (filterTab === 'eligible') {
      allResults = allResults.filter(r => r.status === 'ELIGIBLE');
    } else if (filterTab === 'insufficient') {
      allResults = allResults.filter(r => r.status === 'INSUFFICIENT_DATA');
    } else if (filterTab === 'not_eligible') {
      allResults = allResults.filter(r => r.status === 'NOT_ELIGIBLE');
    }

    // Category filter
    if (categoryFilter !== 'all') {
      const keywords = CATEGORY_KEYWORDS[categoryFilter] || [];
      allResults = allResults.filter(r => {
        const name = (r.scheme_name || '').toLowerCase();
        const code = (r.scheme_code || '').toLowerCase();
        const cat = (r.category_name || '').toLowerCase();
        return keywords.some(kw => name.includes(kw) || code.includes(kw) || cat.includes(kw));
      });
    }

    return allResults;
  }, [analysis, filterTab, categoryFilter]);

  // Counts for filter tabs
  const counts = useMemo(() => {
    if (!analysis) return { all: 0, potential: 0, eligible: 0, insufficient: 0, not_eligible: 0, worker: 0, family: 0 };
    const allResults = [
      ...analysis.worker_results,
      ...analysis.family_results.flatMap(fr => fr.results),
    ];
    return {
      all: allResults.length,
      potential: allResults.filter(r => r.status === 'POTENTIAL_MATCH').length,
      eligible: allResults.filter(r => r.status === 'ELIGIBLE').length,
      insufficient: allResults.filter(r => r.status === 'INSUFFICIENT_DATA').length,
      not_eligible: allResults.filter(r => r.status === 'NOT_ELIGIBLE').length,
      worker: analysis.worker_results.length,
      family: analysis.family_results.reduce((sum, fr) => sum + fr.results.length, 0),
    };
  }, [analysis]);

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'worker', label: 'Worker', count: counts.worker },
    { key: 'family', label: 'Family', count: counts.family },
    { key: 'potential', label: 'Potential Match', count: counts.potential },
    { key: 'eligible', label: 'Eligible', count: counts.eligible },
    { key: 'insufficient', label: 'Insufficient Data', count: counts.insufficient },
    { key: 'not_eligible', label: 'Not Eligible', count: counts.not_eligible },
  ];

  return (
    <>
      <Header title="Eligibility Analysis" subtitle="Data-driven rule-based engine for welfare scheme eligibility determination" />

      <div className="p-6 space-y-6">
        {/* Disclaimer Banner */}
        <div className="bg-primary rounded-xl px-5 py-4 flex items-start gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-white">Decision-Support Tool</h3>
              <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">RULE-BASED MATCHING</span>
            </div>
            <p className="text-sm text-white/70 mt-1 leading-relaxed">
              Eligibility results are preliminary and must be verified against current official scheme rules.
              Results show potential applicability based on registered family profiles.
              Official sanction requires physical document review and competent authority approval.
            </p>
          </div>
        </div>

        {/* Applicant Selection */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Eligibility Rules Engine</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Multi-claimant rule evaluator — worker + family members
                </p>
              </div>
            </div>
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
              v4.0.0
            </span>
          </div>

          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Select Applicant to Analyze
              </label>
              <select
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                className="block w-full px-3 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-gray-50 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              >
                <option value="">— Choose an applicant —</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.full_name} ({w.district || 'Unknown'} — {w.board_name || 'No Board'})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !workerId}
              className="px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                  Analyze Eligibility
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {analysisError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
            <svg className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-400">Analysis Error</p>
              <p className="text-sm text-red-600 dark:text-red-300 mt-0.5">{analysisError}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {analyzing && <LoadingSpinner message="Running eligibility analysis across all schemes and family members..." />}

        {/* Analysis Results */}
        {analysis && !analyzing && (
          <>
            {/* Worker Profile Header */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-lg shrink-0">
                    {getInitials(analysis.worker_name)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{analysis.worker_name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{analysis.worker.board_name || 'No Board'}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{analysis.worker.registration_status || 'Not Registered'}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Age: {analysis.worker.age ?? '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Analysis</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(analysis.analysis_date)}</p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-gray-100 dark:bg-slate-700">
                <SummaryCard label="Schemes Evaluated" value={analysis.summary.total_schemes_evaluated} color="gray" />
                <SummaryCard label="Potential Benefits" value={analysis.summary.potential_benefits} color="blue" />
                <SummaryCard label="Eligible Matches" value={analysis.summary.eligible_matches} color="green" />
                <SummaryCard label="Insufficient Data" value={analysis.summary.insufficient_data} color="purple" />
                <SummaryCard label="Not Eligible" value={analysis.summary.not_eligible} color="red" />
              </div>

              {/* Family Members Evaluated */}
              <div className="px-5 py-3 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    Worker Potential Benefits: <span className="font-bold">{analysis.summary.worker_potential_benefits}</span>
                  </span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    Family Members Evaluated: <span className="font-bold">{analysis.family_members_count}</span>
                  </span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    Family Potential Benefits: <span className="font-bold">{analysis.summary.family_potential_benefits}</span>
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">Engine v{analysis.engine_version}</span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 flex-wrap">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filterTab === tab.key
                      ? 'bg-accent text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Category:</span>
              {(['all', 'education', 'marriage', 'maternity', 'health', 'pension', 'death', 'housing', 'women'] as CategoryFilter[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                    categoryFilter === cat
                      ? 'bg-accent/10 text-accent border border-accent/30'
                      : 'text-gray-500 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600'
                  }`}
                >
                  {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            {/* Results List */}
            <div className="space-y-3">
              {filteredResults.length === 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No results match the current filters.</p>
                </div>
              )}

              {filteredResults.map((result, idx) => (
                <ResultCard
                  key={`${result.scheme_id}-${result.claimant_id}-${idx}`}
                  result={result}
                  isExpanded={expandedResult === `${result.scheme_id}-${result.claimant_id}`}
                  onToggle={() => {
                    const key = `${result.scheme_id}-${result.claimant_id}`;
                    setExpandedResult(expandedResult === key ? null : key);
                  }}
                  onViewDetail={() => setDetailResult(result)}
                  onEditFamilyMember={result.claimant_id !== analysis.worker_id ? () => navigate(`/workers/${analysis.worker_id}`) : undefined}
                />
              ))}
            </div>

            {/* Disclaimer Footer */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{analysis.disclaimer}</p>
              </div>
            </div>
          </>
        )}

        {/* Detail Modal */}
        {detailResult && (
          <DetailModal result={detailResult} onClose={() => setDetailResult(null)} />
        )}
      </div>
    </>
  );
}

// ============================================================
// Sub-components
// ============================================================

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    gray: 'bg-white dark:bg-slate-800',
    blue: 'bg-blue-50 dark:bg-blue-900/20',
    green: 'bg-emerald-50 dark:bg-emerald-900/20',
    purple: 'bg-purple-50 dark:bg-purple-900/20',
    red: 'bg-red-50 dark:bg-red-900/20',
  };
  const textColors: Record<string, string> = {
    gray: 'text-gray-900 dark:text-white',
    blue: 'text-blue-700 dark:text-blue-400',
    green: 'text-emerald-700 dark:text-emerald-400',
    purple: 'text-purple-700 dark:text-purple-400',
    red: 'text-red-700 dark:text-red-400',
  };
  return (
    <div className={`${colorClasses[color]} p-4`}>
      <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${textColors[color]}`}>{value}</p>
    </div>
  );
}

function getStatusConfig(status: EligibilityStatus) {
  switch (status) {
    case 'ELIGIBLE':
      return { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', icon: 'text-emerald-500', label: 'Eligible' };
    case 'POTENTIAL_MATCH':
      return { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: 'text-blue-500', label: 'Potential Match' };
    case 'NOT_ELIGIBLE':
      return { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', icon: 'text-red-500', label: 'Not Eligible' };
    case 'INSUFFICIENT_DATA':
      return { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', icon: 'text-purple-500', label: 'Insufficient Data' };
    default:
      return { bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', icon: 'text-gray-500', label: status };
  }
}

function StatusIcon({ status }: { status: EligibilityStatus }) {
  switch (status) {
    case 'ELIGIBLE':
    case 'POTENTIAL_MATCH':
      return (
        <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'NOT_ELIGIBLE':
      return (
        <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      );
    case 'INSUFFICIENT_DATA':
      return (
        <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      );
    default:
      return (
        <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      );
  }
}

function ResultCard({
  result,
  isExpanded,
  onToggle,
  onViewDetail,
  onEditFamilyMember,
}: {
  result: SchemeEligibilityResult & { claimant_label?: string };
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetail: () => void;
  onEditFamilyMember?: () => void;
}) {
  const config = getStatusConfig(result.status);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden`}>
      <div className="px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <StatusIcon status={result.status} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{result.scheme_name}</h4>
                {result.variant_name && (
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded truncate hidden sm:inline">
                    {result.variant_name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">{result.claimant_name}</span>
                {result.claimant_relationship && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">({result.claimant_relationship})</span>
                )}
                {result.benefit_amount && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {formatBenefitAmount(result.benefit_amount, result.benefit_unit)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${config.bg} ${config.border}`}>
              {config.label}
            </span>
            <svg className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-700 space-y-4">
          {/* Explanation */}
          {result.explanation && (
            <div className={`rounded-lg p-3 ${config.bg} ${config.border} border`}>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.explanation}</p>
            </div>
          )}

          {/* Matched Conditions */}
          {result.matched_rules.length > 0 && (
            <div>
              <h5 className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                Matched Conditions
              </h5>
              <div className="space-y-1.5">
                {result.matched_rules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5 shrink-0">&#10003;</span>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{rule.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed Conditions */}
          {result.failed_rules.length > 0 && (
            <div>
              <h5 className="text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">
                Failed Conditions
              </h5>
              <div className="space-y-1.5">
                {result.failed_rules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5 shrink-0">&#10007;</span>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{rule.reason}</p>
                    {rule.is_mandatory && (
                      <span className="text-[10px] font-medium text-red-500 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded shrink-0">Mandatory</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Information */}
          {result.missing_information.length > 0 && (
            <div>
              <h5 className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">
                Missing Information
              </h5>
              <div className="space-y-1.5">
                {result.missing_information.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5 shrink-0">&#9888;</span>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{rule.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source & Verification */}
          {result.source_info && (
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Source Scheme Information</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">{result.source_info}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={(e) => { e.stopPropagation(); onViewDetail(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent/5 border border-accent/20 rounded-lg hover:bg-accent/10 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              View Details
            </button>
            {onEditFamilyMember && result.missing_information.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); onEditFamilyMember(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Update Family Member
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailModal({ result, onClose }: { result: SchemeEligibilityResult; onClose: () => void }) {
  const config = getStatusConfig(result.status);
  const totalRules = result.matched_rules.length + result.failed_rules.length + result.missing_information.length;
  const passedRules = result.matched_rules.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{result.scheme_name}</h3>
            {result.variant_name && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{result.variant_name}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Banner */}
          <div className={`rounded-lg p-4 ${config.bg} ${config.border} border`}>
            <div className="flex items-center gap-3">
              <StatusIcon status={result.status} />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">{config.label}</h4>
                {result.explanation && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{result.explanation}</p>
                )}
              </div>
            </div>
          </div>

          {/* Claimant & Benefit Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Claimant</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{result.claimant_name}</p>
              {result.claimant_relationship && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{result.claimant_relationship}</p>
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Potential Benefit</p>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                {formatBenefitAmount(result.benefit_amount, result.benefit_unit)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Welfare Board</p>
              <p className="text-sm text-gray-900 dark:text-white mt-1">{result.board_name || 'Global'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</p>
              <p className="text-sm text-gray-900 dark:text-white mt-1">{result.category_name || '—'}</p>
            </div>
          </div>

          {/* Rule Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rule Evaluation Progress</p>
              <span className="text-xs text-gray-500 dark:text-gray-400">{passedRules}/{totalRules} conditions matched</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-accent rounded-full h-2 transition-all"
                style={{ width: totalRules > 0 ? `${(passedRules / totalRules) * 100}%` : '0%' }}
              />
            </div>
          </div>

          {/* Matched Rules */}
          {result.matched_rules.length > 0 && (
            <div>
              <h5 className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                Matched Conditions
              </h5>
              <div className="space-y-2">
                {result.matched_rules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                    <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{rule.rule_type}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{rule.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed Rules */}
          {result.failed_rules.length > 0 && (
            <div>
              <h5 className="text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">
                Failed Conditions
              </h5>
              <div className="space-y-2">
                {result.failed_rules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                    <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{rule.rule_type}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{rule.reason}</p>
                    </div>
                    {rule.is_mandatory && (
                      <span className="text-[10px] font-medium text-red-500 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded">Mandatory</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Information */}
          {result.missing_information.length > 0 && (
            <div>
              <h5 className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">
                Missing Information
              </h5>
              <div className="space-y-2">
                {result.missing_information.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                    <svg className="h-4 w-4 text-purple-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{rule.rule_type}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{rule.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source Information */}
          {result.source_info && (
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Source Scheme Information</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{result.source_info}</p>
            </div>
          )}

          {/* Verification Notice */}
          {result.verification_required && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
              <svg className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Official Verification Required</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  This preliminary match requires document verification and competent authority approval before any benefit can be sanctioned.
                </p>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">{result.disclaimer}</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
