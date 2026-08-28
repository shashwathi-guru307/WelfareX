import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { workersApi, renewalsApi, activitiesApi, casesApi, eligibilityApi } from '../services/api';
import type { FamilyMember, EducationRecord, WorkerRenewalDetail, ActivityLog, Case, WorkerNote, EligibilityAnalysis } from '../types';
import Header from '../components/layout/Header';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import ConfirmModal from '../components/common/ConfirmModal';
import { formatDate, getInitials, getRenewalStatusColor, formatRenewalStatus, getUrgencyColor, formatUrgency, formatDaysRemaining, getCaseStatusColor, formatCaseStatus } from '../utils/format';

export default function WorkerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const workerId = Number(id);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [lastReviewed, setLastReviewed] = useState<{ at: string | null; by: string | null }>({ at: null, by: null });

  const { data: worker, loading, error, refetch } = useApi(
    () => workersApi.getById(workerId),
    [workerId],
  );

  const { data: renewalDetail } = useApi(
    () => renewalsApi.getWorkerDetail(workerId),
    [workerId],
  );

  const { data: activityData } = useApi(
    () => activitiesApi.getWorkerActivities(workerId, { limit: 15 }),
    [workerId],
  );

  const { data: workerCases } = useApi(
    () => casesApi.getWorkerCases(workerId),
    [workerId],
  );

  // Eligibility analysis
  const [eligibility, setEligibility] = useState<EligibilityAnalysis | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState(false);

  // Worker notes
  const [notes, setNotes] = useState<WorkerNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const fetchNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const result = await workersApi.getNotes(workerId);
      if (result.success && result.data) setNotes(result.data);
    } catch { /* ignore */ }
    setLoadingNotes(false);
  }, [workerId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  useEffect(() => {
    if (worker) {
      setLastReviewed({
        at: (worker as any).last_reviewed_at || null,
        by: (worker as any).last_reviewed_by || null,
      });
    }
  }, [worker]);

  const handleRunEligibility = async () => {
    setLoadingEligibility(true);
    try {
      const result = await eligibilityApi.analyzeWorker(workerId);
      if (result.success && result.data) setEligibility(result.data);
    } catch { /* ignore */ }
    setLoadingEligibility(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const result = await workersApi.addNote(workerId, { content: newNote.trim(), author: 'Staff' });
      if (result.success) {
        setNewNote('');
        fetchNotes();
      }
    } catch { /* ignore */ }
    setSavingNote(false);
  };

  const handleDelete = async () => {
    try {
      await workersApi.delete(workerId);
      navigate('/applicants');
    } catch {
      refetch();
    }
  };

  if (loading) return <><Header title="Applicant Details" /><LoadingSpinner /></>;
  if (error || !worker) return <><Header title="Applicant Details" /><div className="p-6"><ErrorMessage message={error || 'Applicant not found.'} onRetry={refetch} /></div></>;

  const familyMembers: FamilyMember[] = worker.family_members || [];
  const educationRecords: EducationRecord[] = worker.education_records || [];
  const registrations = worker.registrations || [];
  const applications = worker.scheme_applications || [];
  const activeCases = (workerCases || []).filter((c: Case) => !['COMPLETED', 'REJECTED', 'CLOSED'].includes(c.status));
  const completedCases = (workerCases || []).filter((c: Case) => ['COMPLETED'].includes(c.status));

  return (
    <>
      <Header title="Applicant Details" subtitle={`Viewing profile of ${worker.full_name}`} />

      <div className="p-6 space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/applicants')}
          className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Applicants
        </button>

        {/* Profile Header Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xl shrink-0">
              {getInitials(worker.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{worker.full_name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {worker.worker_category || '—'} &middot; {worker.district || '—'} &middot; {worker.board_name || '—'}
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {worker.registration_status && <StatusBadge status={worker.registration_status} />}
                {worker.registration_number && (
                  <span className="text-xs font-mono text-gray-400">{worker.registration_number}</span>
                )}
                <span className="text-xs text-gray-400">ID: {worker.id}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => navigate(`/workers/${worker.id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => navigate(`/eligibility?worker=${worker.id}`)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-accent bg-accent/5 border border-accent/20 rounded-lg hover:bg-accent/10 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Analyze Eligibility
              </button>
              <button
                onClick={() => setDeleteTarget(worker.full_name)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-2">Quick Actions</span>
            <button onClick={() => navigate(`/workers/${worker.id}/edit`)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
              Edit Profile
            </button>
            <button onClick={() => navigate(`/eligibility?worker=${worker.id}`)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Check Eligibility
            </button>
            <button onClick={() => navigate('/cases', { state: { createFor: worker.id } })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              Create Case
            </button>
            <button onClick={() => navigate('/renewals')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              View Renewals
            </button>
            <button onClick={() => navigate('/reports')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
              Generate Report
            </button>
          </div>
        </div>

        {/* Last Reviewed */}
        {lastReviewed.at && (
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 flex items-center gap-3 text-sm">
            <svg className="h-4 w-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-blue-700 dark:text-blue-300">
              Last reviewed: <span className="font-medium">{formatDate(lastReviewed.at)}</span>
              {lastReviewed.by && <> by <span className="font-medium">{lastReviewed.by}</span></>}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Section title="Personal Information">
            <InfoField label="Full Name" value={worker.full_name} />
            <InfoField label="Father's / Husband's Name" value={worker.father_husband_name} />
            <InfoField label="Gender" value={worker.gender} />
            <InfoField label="Date of Birth" value={formatDate(worker.date_of_birth)} />
            <InfoField label="Age" value={worker.age != null ? `${worker.age} years` : null} />
            <InfoField label="Mobile" value={worker.mobile_number ? `${worker.mobile_number.slice(0,5)}***${worker.mobile_number.slice(-2)}` : null} />
            <InfoField label="Alternate Mobile" value={worker.alternate_mobile ? `${worker.alternate_mobile.slice(0,5)}***${worker.alternate_mobile.slice(-2)}` : null} />
            <InfoField label="Marital Status" value={worker.marital_status} />
            <InfoField label="Education Level" value={worker.education_level} />
          </Section>

          {/* Location */}
          <Section title="Location">
            <InfoField label="District" value={worker.district} />
            <InfoField label="Taluk" value={worker.taluk} />
            <InfoField label="Village / Town" value={worker.village_town} />
            <InfoField label="Pincode" value={worker.pincode} />
            <InfoField label="Address" value={worker.address} fullWidth />
          </Section>

          {/* Identification */}
          <Section title="Identification">
            <InfoField label="Aadhaar Number" value={worker.ration_card_number ? 'XXXX XXXX ' + worker.ration_card_number.slice(-4) : null} />
            <InfoField label="Ration / Smart Card" value={worker.ration_card_number ? worker.ration_card_number.slice(0,4) + '****' + worker.ration_card_number.slice(-3) : null} />
            <InfoField label="Reference ID" value={worker.reference_id} />
            <InfoField label="Disability Status" value={worker.has_disability ? `Yes — ${worker.disability_details || 'Details not specified'}` : 'No'} fullWidth />
          </Section>

          {/* Worker Information */}
          <Section title="Worker Information">
            <InfoField label="Welfare Board" value={worker.board_name} />
            <InfoField label="Occupation" value={worker.occupation} />
            <InfoField label="Nature of Work" value={worker.nature_of_work} />
            <InfoField label="Worker Category" value={worker.worker_category} />
          </Section>
        </div>

        {/* Renewal Information Card */}
        <RenewalCard renewalDetail={renewalDetail} workerId={workerId} onNavigate={navigate} />

        {/* Registration History */}
        <Section title="Registration History" badge={`${registrations.length} record(s)`}>
          {registrations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    {['Reg. Number', 'Board', 'Registration Date', 'Validity', 'Renewal Date', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {registrations.map((reg: any) => (
                    <tr key={reg.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">{reg.registration_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{reg.board_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(reg.registration_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(reg.validity_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(reg.renewal_date)}</td>
                      <td className="px-4 py-3"><StatusBadge status={reg.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-2">No registrations found for this applicant.</p>
          )}
        </Section>

        {/* Family Members */}
        <Section title="Family Members" badge={`${familyMembers.length} member(s)`}>
          {familyMembers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    {['Name', 'Relationship', 'DOB', 'Age', 'Gender', 'Education', 'Dependent', 'Employed'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {familyMembers.map((fm) => (
                    <tr key={fm.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{fm.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          fm.relationship === 'Spouse' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
                          : fm.relationship === 'Son' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : fm.relationship === 'Daughter' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {fm.relationship}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(fm.date_of_birth)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{fm.age != null ? `${fm.age} yrs` : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{fm.gender || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{fm.education_level || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${fm.is_dependent ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {fm.is_dependent ? '● Dependent' : '○ Not Dependent'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {fm.is_employed ? 'Yes' : 'No'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-2">No family members recorded.</p>
          )}
        </Section>

        {/* Education Records */}
        <Section title="Education Records" badge={`${educationRecords.length} record(s)`}>
          {educationRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    {['Person', 'Level', 'Course', 'Institution', 'Year', 'Studying', 'Score'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {educationRecords.map((edu) => (
                    <tr key={edu.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {edu.family_member_name || 'Self'}
                        </span>
                        {edu.relationship && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({edu.relationship})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{edu.education_level}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{edu.course || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate" title={edu.institution || ''}>{edu.institution || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{edu.year_of_study || '—'}</td>
                      <td className="px-4 py-3">
                        {edu.is_currently_studying ? (
                          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Yes</span>
                        ) : (
                          <span className="text-[11px] text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{edu.percentage_cgpa || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-2">No education records found.</p>
          )}
        </Section>

        {/* Cases */}
        <CasesSection cases={workerCases || []} navigate={navigate} />

        {/* Scheme Applications */}
        <Section title="Scheme Applications" badge={`${applications.length} application(s)`}>
          {applications.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    {['Scheme', 'Category', 'Applied', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {applications.map((app: any) => (
                    <tr key={app.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{app.scheme_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{app.category_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(app.application_date)}</td>
                      <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-2">No scheme applications found.</p>
          )}
        </Section>

        {/* Eligibility Results */}
        <Section title="Eligibility Analysis" badge={eligibility ? `${eligibility.summary.potential_benefits} potential matches` : undefined}>
          {!eligibility ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Run eligibility analysis to see potential welfare scheme matches.</p>
              <button
                onClick={handleRunEligibility}
                disabled={loadingEligibility}
                className="flex items-center gap-2 px-4 py-2 mx-auto text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {loadingEligibility ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
                {loadingEligibility ? 'Analyzing...' : 'Run Eligibility Analysis'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Potential Benefits" value={eligibility.summary.potential_benefits} color="text-emerald-600 dark:text-emerald-400" />
                <StatCard label="Not Eligible" value={eligibility.summary.not_eligible} color="text-red-600 dark:text-red-400" />
                <StatCard label="Insufficient Data" value={eligibility.summary.insufficient_data} color="text-orange-600 dark:text-orange-400" />
                <StatCard label="Schemes Evaluated" value={eligibility.summary.total_schemes_evaluated} color="text-blue-600 dark:text-blue-400" />
              </div>

              {/* Worker Results */}
              {eligibility.worker_results.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Worker Eligibility</h4>
                  <div className="space-y-2">
                    {eligibility.worker_results.slice(0, 8).map((result, idx) => (
                      <EligibilityResultCard key={idx} result={result} />
                    ))}
                  </div>
                </div>
              )}

              {/* Family Results */}
              {eligibility.family_results.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Family Member Eligibility</h4>
                  <div className="space-y-3">
                    {eligibility.family_results.map((familyAnalysis, idx) => (
                      <FamilyEligibilityCard key={idx} analysis={familyAnalysis} />
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleRunEligibility}
                disabled={loadingEligibility}
                className="text-xs font-medium text-accent hover:text-accent-hover"
              >
                Re-run Analysis
              </button>
            </div>
          )}
        </Section>

        {/* Activity Timeline */}
        <ActivityTimeline activities={activityData?.activities || []} />

        {/* Notes Section */}
        <NotesSection
          notes={notes}
          loadingNotes={loadingNotes}
          newNote={newNote}
          savingNote={savingNote}
          onNewNoteChange={setNewNote}
          onAddNote={handleAddNote}
        />

        {/* Documents Section */}
        <Section title="Documents" badge="Coming Soon">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Document management will be available in a future phase.</p>
          </div>
        </Section>

        {/* Profile Summary */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Profile Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-accent">{familyMembers.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Family Members</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCases.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active Cases</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{eligibility?.summary.potential_benefits || '—'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Potential Benefits</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{notes.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Notes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Applicant"
        message={`Are you sure you want to delete the record for ${deleteTarget}? This action will deactivate the record. An administrator can restore it later if needed.`}
        confirmLabel="Delete Applicant"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

// ============================================================
// Sub-components
// ============================================================

function EligibilityResultCard({ result }: { result: any }) {
  const statusColors: Record<string, string> = {
    POTENTIAL_MATCH: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800',
    ELIGIBLE: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800',
    NOT_ELIGIBLE: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
    INSUFFICIENT_DATA: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800',
  };
  const statusLabels: Record<string, string> = {
    POTENTIAL_MATCH: 'Potential Match',
    ELIGIBLE: 'Eligible',
    NOT_ELIGIBLE: 'Not Eligible',
    INSUFFICIENT_DATA: 'Insufficient Data',
  };
  const statusTextColors: Record<string, string> = {
    POTENTIAL_MATCH: 'text-emerald-700 dark:text-emerald-400',
    ELIGIBLE: 'text-emerald-700 dark:text-emerald-400',
    NOT_ELIGIBLE: 'text-red-700 dark:text-red-400',
    INSUFFICIENT_DATA: 'text-orange-700 dark:text-orange-400',
  };
  return (
    <div className={`border rounded-lg p-3 ${statusColors[result.status] || 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-900 dark:text-white">{result.scheme_name}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusTextColors[result.status] || 'text-gray-600'}`}>
          {statusLabels[result.status] || result.status}
        </span>
      </div>
      {result.explanation && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{result.explanation}</p>
      )}
      {result.matched_rules && result.matched_rules.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {result.matched_rules.map((rule: any, i: number) => (
            <span key={i} className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
              ✓ {rule.reason}
            </span>
          ))}
        </div>
      )}
      {result.failed_rules && result.failed_rules.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {result.failed_rules.map((rule: any, i: number) => (
            <span key={i} className="text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
              ✗ {rule.reason}
            </span>
          ))}
        </div>
      )}
      {result.missing_information && result.missing_information.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {result.missing_information.map((rule: any, i: number) => (
            <span key={i} className="text-[10px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded">
              ? {rule.reason}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FamilyEligibilityCard({ analysis }: { analysis: any }) {
  const potentialCount = analysis.results.filter((r: any) => r.status === 'POTENTIAL_MATCH' || r.status === 'ELIGIBLE').length;
  const notEligibleCount = analysis.results.filter((r: any) => r.status === 'NOT_ELIGIBLE').length;
  const insufficientCount = analysis.results.filter((r: any) => r.status === 'INSUFFICIENT_DATA').length;

  return (
    <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{analysis.family_member.name}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({analysis.family_member.relationship})</span>
          {analysis.family_member.age != null && (
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">· Age {analysis.family_member.age}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {potentialCount > 0 && <span className="font-medium text-emerald-600 dark:text-emerald-400">{potentialCount} potential</span>}
          {notEligibleCount > 0 && <span className="font-medium text-red-600 dark:text-red-400">{notEligibleCount} not eligible</span>}
          {insufficientCount > 0 && <span className="font-medium text-orange-600 dark:text-orange-400">{insufficientCount} needs info</span>}
        </div>
      </div>
      <div className="space-y-1.5">
        {analysis.results.filter((r: any) => r.status !== 'NOT_ELIGIBLE').slice(0, 4).map((result: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            {result.status === 'POTENTIAL_MATCH' || result.status === 'ELIGIBLE' ? (
              <span className="text-emerald-500">✓</span>
            ) : (
              <span className="text-orange-500">?</span>
            )}
            <span className="text-gray-700 dark:text-gray-300">{result.scheme_name}</span>
            {result.benefit_amount_display && (
              <span className="text-gray-400 dark:text-gray-500">— {result.benefit_amount_display}</span>
            )}
          </div>
        ))}
        {analysis.results.length > 4 && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500">+ {analysis.results.length - 4} more schemes evaluated</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function NotesSection({ notes, loadingNotes, newNote, savingNote, onNewNoteChange, onAddNote }: {
  notes: WorkerNote[];
  loadingNotes: boolean;
  newNote: string;
  savingNote: boolean;
  onNewNoteChange: (val: string) => void;
  onAddNote: () => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notes</h3>
      </div>
      <div className="p-5">
        {/* Add Note */}
        <div className="flex gap-2 mb-4">
          <textarea
            value={newNote}
            onChange={(e) => onNewNoteChange(e.target.value)}
            placeholder="Add a note about this applicant..."
            rows={2}
            className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder-gray-400 text-gray-900 dark:text-gray-100 resize-none"
          />
          <button
            onClick={onAddNote}
            disabled={!newNote.trim() || savingNote}
            className="self-end px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors shrink-0"
          >
            {savingNote ? 'Saving...' : 'Add Note'}
          </button>
        </div>

        {/* Notes List */}
        {loadingNotes ? (
          <p className="text-sm text-gray-400 py-2">Loading notes...</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-2">No notes yet. Add a note above.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 border border-gray-100 dark:border-slate-600">
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                  <span className="font-medium">{note.author}</span>
                  <span>·</span>
                  <span>{formatDate(note.created_at)}</span>
                  {note.is_internal === 1 && (
                    <>
                      <span>·</span>
                      <span className="text-blue-500 dark:text-blue-400">Internal</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RenewalCard({ renewalDetail, workerId, onNavigate }: { renewalDetail: WorkerRenewalDetail | null | undefined; workerId: number; onNavigate: (path: string) => void }) {
  if (!renewalDetail) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Registration Renewal</h3>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">No registration found for this applicant.</p>
    </div>
  );

  const isExpired = renewalDetail.computed_status === 'EXPIRED';
  const isExpiringSoon = renewalDetail.computed_status === 'EXPIRING_SOON';
  const bgColor = isExpired ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10' : isExpiringSoon ? 'border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/10' : '';

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm p-5 ${bgColor}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isExpired ? 'bg-red-100 dark:bg-red-900/30' : isExpiringSoon ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-100 dark:bg-slate-700'}`}>
          <svg className={`h-4 w-4 ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-orange-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Registration Renewal</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Current registration status and renewal intelligence</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Status</p>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${getRenewalStatusColor(renewalDetail.computed_status)}`}>
            {renewalDetail.computed_status === 'EXPIRED' && '⚠ '}
            {formatRenewalStatus(renewalDetail.computed_status)}
          </span>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Urgency</p>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${getUrgencyColor(renewalDetail.urgency)}`}>
            {formatUrgency(renewalDetail.urgency)}
          </span>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
            {isExpired ? 'Expired On' : 'Renewal Date'}
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(renewalDetail.validity_date)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
            {renewalDetail.days_until_renewal !== null && renewalDetail.days_until_renewal < 0 ? 'Days Overdue' : 'Days Remaining'}
          </p>
          <p className={`text-sm font-medium ${
            renewalDetail.days_until_renewal !== null && renewalDetail.days_until_renewal < 0
              ? 'text-red-600 dark:text-red-400'
              : renewalDetail.days_until_renewal !== null && renewalDetail.days_until_renewal <= 14
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-gray-900 dark:text-white'
          }`}>
            {formatDaysRemaining(renewalDetail.days_until_renewal)}
          </p>
        </div>
      </div>

      {renewalDetail.description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">{renewalDetail.description}</p>
      )}

      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
        <button
          onClick={() => onNavigate(`/workers/${workerId}/edit`)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          Renew Now
        </button>
        <button
          onClick={() => onNavigate('/renewals')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          Create Reminder
        </button>
      </div>
    </div>
  );
}

function ActivityTimeline({ activities }: { activities: ActivityLog[] }) {
  if (!activities || activities.length === 0) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Activity</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">No activity recorded yet.</p>
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Activity</h3>
      </div>
      <div className="p-5">
        <div className="space-y-3">
          {activities.map((act) => (
            <div key={act.id} className="flex items-start gap-3">
              <span className="text-sm mt-0.5 shrink-0">{act.icon || '📌'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{act.title}</p>
                {act.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{act.description}</p>
                )}
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{act.formatted_date} {act.formatted_time} · {act.relative_time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CasesSection({ cases, navigate }: { cases: Case[]; navigate: (path: string) => void }) {
  const activeCases = cases.filter(c => !['COMPLETED', 'REJECTED', 'CLOSED'].includes(c.status));
  return (
    <Section title="Cases" badge={`${activeCases.length} active / ${cases.length} total`}>
      {cases.length > 0 ? (
        <div className="space-y-3">
          {cases.slice(0, 10).map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/cases/${c.id}`)}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-semibold text-accent">{c.case_number}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{c.title}</span>
                {c.scheme_name && <span className="text-xs text-gray-500 dark:text-gray-400">({c.scheme_name})</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getCaseStatusColor(c.status)}`}>
                  {formatCaseStatus(c.status)}
                </span>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </div>
            </div>
          ))}
          {cases.length > 10 && (
            <button onClick={() => navigate('/cases')} className="text-xs font-medium text-accent hover:text-accent-hover">
              View all {cases.length} cases →
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">No cases yet for this applicant.</p>
        </div>
      )}
    </Section>
  );
}

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        {badge && (
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoField({ label, value, fullWidth = false }: { label: string; value: string | null | undefined; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{value || '—'}</p>
    </div>
  );
}
