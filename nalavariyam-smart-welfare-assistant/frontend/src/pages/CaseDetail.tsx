import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { casesApi } from '../services/api';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import {
  formatDate, formatDateTime,
  getCaseStatusColor, formatCaseStatus,
  getCasePriorityColor, formatCasePriority,
  getCaseTaskStatusColor, formatCaseTaskType,
  formatClosureReason, formatDocumentStatus, getDocumentStatusColor,
  getCaseProgressSteps, getCaseStepIndex,
} from '../utils/format';
import type { Case, CaseDocument, CaseTask, CaseNote, CaseActivity } from '../types';

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const caseId = Number(id);

  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'tasks' | 'notes' | 'activity'>('overview');
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showRejectDoc, setShowRejectDoc] = useState<number | null>(null);

  // Form states
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [closureReason, setClosureReason] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [taskForm, setTaskForm] = useState({ task_type: 'OTHER', title: '', description: '', priority: 'MEDIUM', due_date: '', assigned_to: '' });
  const [docForm, setDocForm] = useState({ document_type: 'OTHER', document_name: '', required: true });
  const [rejectReason, setRejectReason] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCase = useCallback(() => casesApi.getById(caseId), [caseId]);
  const { data: caseData, loading, error, refetch } = useApi(fetchCase, [caseId]);

  const caseInfo = caseData as Case | null;
  const currentStepIndex = caseInfo ? getCaseStepIndex(caseInfo.status) : -1;
  const isTerminal = caseInfo?.status === 'COMPLETED' || caseInfo?.status === 'REJECTED' || caseInfo?.status === 'CLOSED';

  // ---- Status Change ----
  const handleStatusChange = async () => {
    if (!newStatus) return;
    setFormLoading(true); setFormError('');
    try {
      const r = await casesApi.changeStatus(caseId, {
        status: newStatus,
        reason: statusReason || undefined,
        closure_reason: closureReason || undefined,
      });
      if (r.success) { setShowStatusChange(false); setNewStatus(''); setStatusReason(''); setClosureReason(''); refetch(); }
      else setFormError(r.error || 'Failed');
    } catch (e) { setFormError(e instanceof Error ? e.message : 'Failed'); }
    finally { setFormLoading(false); }
  };

  // ---- Complete Case ----
  const handleComplete = async () => {
    setFormLoading(true); setFormError('');
    try {
      const r = await casesApi.complete(caseId);
      if (r.success) { setShowCompleteConfirm(false); refetch(); }
      else setFormError(r.error || 'Failed');
    } catch (e) { setFormError(e instanceof Error ? e.message : 'Failed'); }
    finally { setFormLoading(false); }
  };

  // ---- Close Case ----
  const handleClose = async () => {
    if (!closureReason) { setFormError('Closure reason is required.'); return; }
    setFormLoading(true); setFormError('');
    try {
      const r = await casesApi.changeStatus(caseId, { status: 'CLOSED', closure_reason: closureReason });
      if (r.success) { setShowCloseModal(false); setClosureReason(''); refetch(); }
      else setFormError(r.error || 'Failed');
    } catch (e) { setFormError(e instanceof Error ? e.message : 'Failed'); }
    finally { setFormLoading(false); }
  };

  // ---- Reopen Case ----
  const handleReopen = async () => {
    if (!reopenReason) { setFormError('Reason is required.'); return; }
    setFormLoading(true); setFormError('');
    try {
      const r = await casesApi.reopen(caseId, reopenReason);
      if (r.success) { setShowReopenModal(false); setReopenReason(''); refetch(); }
      else setFormError(r.error || 'Failed');
    } catch (e) { setFormError(e instanceof Error ? e.message : 'Failed'); }
    finally { setFormLoading(false); }
  };

  // ---- Add Note ----
  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setFormLoading(true);
    try {
      const r = await casesApi.addNote(caseId, { content: noteContent.trim(), author: 'Staff' });
      if (r.success) { setShowAddNote(false); setNoteContent(''); refetch(); }
    } catch { /* ignore */ }
    finally { setFormLoading(false); }
  };

  // ---- Add Task ----
  const handleAddTask = async () => {
    if (!taskForm.title.trim()) return;
    setFormLoading(true);
    try {
      const r = await casesApi.createTask(caseId, {
        task_type: taskForm.task_type,
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || undefined,
        priority: taskForm.priority,
        due_date: taskForm.due_date || undefined,
        assigned_to: taskForm.assigned_to.trim() || undefined,
      });
      if (r.success) { setShowAddTask(false); setTaskForm({ task_type: 'OTHER', title: '', description: '', priority: 'MEDIUM', due_date: '', assigned_to: '' }); refetch(); }
    } catch { /* ignore */ }
    finally { setFormLoading(false); }
  };

  // ---- Add Document ----
  const handleAddDocument = async () => {
    if (!docForm.document_name.trim()) return;
    setFormLoading(true);
    try {
      const r = await casesApi.addDocument(caseId, {
        document_type: docForm.document_type,
        document_name: docForm.document_name.trim(),
        required: docForm.required,
      });
      if (r.success) { setShowAddDocument(false); setDocForm({ document_type: 'OTHER', document_name: '', required: true }); refetch(); }
    } catch { /* ignore */ }
    finally { setFormLoading(false); }
  };

  // ---- Verify/Reject Document ----
  const handleVerifyDoc = async (docId: number) => {
    setFormLoading(true);
    try {
      await casesApi.verifyDocument(docId, 'Staff');
      refetch();
    } catch { /* ignore */ }
    finally { setFormLoading(false); }
  };

  const handleRejectDoc = async (docId: number) => {
    if (!rejectReason.trim()) return;
    setFormLoading(true);
    try {
      await casesApi.rejectDocument(docId, 'Staff', rejectReason.trim());
      setShowRejectDoc(null); setRejectReason('');
      refetch();
    } catch { /* ignore */ }
    finally { setFormLoading(false); }
  };

  // ---- Complete/Cancel Task ----
  const handleCompleteTask = async (taskId: number) => {
    await casesApi.completeTask(taskId);
    refetch();
  };
  const handleCancelTask = async (taskId: number) => {
    await casesApi.cancelTask(taskId);
    refetch();
  };

  if (loading) return <><Header title="Case Details" /><LoadingSpinner /></>;
  if (error || !caseInfo) return <><Header title="Case Details" /><div className="p-6"><ErrorMessage message={error || 'Case not found.'} onRetry={refetch} /></div></>;

  return (
    <>
      <Header title={`Case ${caseInfo.case_number}`} subtitle={caseInfo.title} />

      <div className="p-6 space-y-6">
        {/* Top Bar with Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getCaseStatusColor(caseInfo.status)}`}>
              {formatCaseStatus(caseInfo.status)}
            </span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getCasePriorityColor(caseInfo.priority)}`}>
              {formatCasePriority(caseInfo.priority)}
            </span>
            {caseInfo.assigned_to && (
              <span className="text-xs text-gray-500 dark:text-gray-400">Assigned to: <strong className="text-gray-700 dark:text-gray-300">{caseInfo.assigned_to}</strong></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isTerminal && (
              <>
                <button onClick={() => setShowStatusChange(true)} className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                  Change Status
                </button>
                {caseInfo.status === 'READY_FOR_SUBMISSION' && (
                  <button onClick={() => setShowCompleteConfirm(true)} className="px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                    Complete Case
                  </button>
                )}
                <button onClick={() => setShowCloseModal(true)} className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  Close Case
                </button>
              </>
            )}
            {isTerminal && (
              <button onClick={() => setShowReopenModal(true)} className="px-3 py-2 text-xs font-medium text-accent bg-white dark:bg-slate-800 border border-accent/30 rounded-lg hover:bg-accent/5 transition-colors">
                Reopen Case
              </button>
            )}
            <button onClick={() => casesApi.getExportData(caseId).then(r => { if (r.success && r.data) { const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `case_${caseInfo.case_number}.json`; a.click(); URL.revokeObjectURL(url); } })} className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              Export
            </button>
          </div>
        </div>

        {/* Progress Timeline */}
        {!isTerminal && currentStepIndex >= 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Case Progress</h3>
            <div className="flex items-center justify-between">
              {getCaseProgressSteps().map((step, idx) => (
                <div key={step.status} className="flex-1 flex flex-col items-center relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    idx < currentStepIndex
                      ? 'bg-green-500 border-green-500 text-white'
                      : idx === currentStepIndex
                      ? 'bg-accent border-accent text-white'
                      : 'bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-400 dark:text-gray-500'
                  }`}>
                    {idx < currentStepIndex ? '✓' : idx + 1}
                  </div>
                  <p className={`text-[10px] mt-1.5 text-center font-medium ${
                    idx === currentStepIndex ? 'text-accent' : idx < currentStepIndex ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                  }`}>{step.label}</p>
                  {idx < getCaseProgressSteps().length - 1 && (
                    <div className={`absolute top-4 left-1/2 w-full h-0.5 ${
                      idx < currentStepIndex ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-600'
                    }`} style={{ zIndex: -1 }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700">
          {(['overview', 'documents', 'tasks', 'notes', 'activity'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                activeTab === tab
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'documents' && caseInfo.document_summary && (
                <span className="ml-1 text-[10px] bg-gray-200 dark:bg-slate-600 px-1.5 py-0.5 rounded-full">{caseInfo.document_summary.verified}/{caseInfo.document_summary.required}</span>
              )}
              {tab === 'tasks' && caseInfo.tasks && (
                <span className="ml-1 text-[10px] bg-gray-200 dark:bg-slate-600 px-1.5 py-0.5 rounded-full">{caseInfo.tasks.length}</span>
              )}
              {tab === 'notes' && caseInfo.notes && (
                <span className="ml-1 text-[10px] bg-gray-200 dark:bg-slate-600 px-1.5 py-0.5 rounded-full">{caseInfo.notes.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Case Info */}
            <div className="lg:col-span-2 space-y-6">
              <InfoCard title="Case Information">
                <InfoRow label="Case Number" value={caseInfo.case_number} mono />
                <InfoRow label="Title" value={caseInfo.title} />
                <InfoRow label="Description" value={caseInfo.description || '—'} />
                <InfoRow label="Status" value={formatCaseStatus(caseInfo.status)} />
                <InfoRow label="Priority" value={formatCasePriority(caseInfo.priority)} />
                <InfoRow label="Created By" value={caseInfo.created_by || '—'} />
                <InfoRow label="Opened" value={formatDateTime(caseInfo.opened_at)} />
                <InfoRow label="Last Updated" value={formatDateTime(caseInfo.updated_at)} />
                {caseInfo.closed_at && <InfoRow label="Closed" value={formatDateTime(caseInfo.closed_at)} />}
                {caseInfo.closure_reason && <InfoRow label="Closure Reason" value={formatClosureReason(caseInfo.closure_reason)} />}
              </InfoCard>

              {/* Readiness */}
              {caseInfo.readiness && (
                <InfoCard title="Case Readiness">
                  <div className={`p-3 rounded-lg ${caseInfo.readiness.ready ? 'bg-green-50 dark:bg-green-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                    <div className="flex items-center gap-2">
                      {caseInfo.readiness.ready ? (
                        <>
                          <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span className="text-sm font-semibold text-green-700 dark:text-green-400">READY</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                          <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">NOT READY</span>
                        </>
                      )}
                    </div>
                    {caseInfo.readiness.missing.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Missing:</p>
                        {caseInfo.readiness.missing.map((m, i) => (
                          <p key={i} className="text-xs text-amber-700 dark:text-amber-400 ml-3">• {m}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </InfoCard>
              )}
            </div>

            {/* Sidebar Info */}
            <div className="space-y-6">
              <InfoCard title="Applicant">
                <InfoRow label="Name" value={caseInfo.worker_name || '—'} />
                <InfoRow label="District" value={caseInfo.worker_district || '—'} />
                <InfoRow label="Board" value={caseInfo.board_name || '—'} />
                {caseInfo.worker_mobile && <InfoRow label="Mobile" value={caseInfo.worker_mobile} />}
                <button
                  onClick={() => navigate(`/workers/${caseInfo.worker_id}`)}
                  className="mt-2 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                >
                  View Applicant Profile →
                </button>
              </InfoCard>

              <InfoCard title="Claimant">
                <InfoRow label="Name" value={caseInfo.claimant_name || '—'} />
                <InfoRow label="Relationship" value={caseInfo.claimant_relationship || '—'} />
                <InfoRow label="Type" value={caseInfo.claimant_type === 'FAMILY_MEMBER' ? 'Family Member' : 'Self'} />
              </InfoCard>

              <InfoCard title="Scheme">
                <InfoRow label="Scheme" value={caseInfo.scheme_name || '—'} />
                {caseInfo.variant_name && <InfoRow label="Variant" value={caseInfo.variant_name} />}
              </InfoCard>

              <InfoCard title="Document Progress">
                {caseInfo.document_summary && (
                  <>
                    <div className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Required documents verified</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{caseInfo.document_summary.required_verified} / {caseInfo.document_summary.required}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${caseInfo.document_summary.completeness === 100 ? 'bg-green-500' : 'bg-accent'}`}
                          style={{ width: `${caseInfo.document_summary.completeness}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{caseInfo.document_summary.completeness}% complete</p>
                    </div>
                  </>
                )}
              </InfoCard>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowAddDocument(true)} className="px-3 py-2 text-xs font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors">
                + Add Document
              </button>
            </div>
            {(!caseInfo.documents || caseInfo.documents.length === 0) ? (
              <EmptyState message="No documents in checklist yet." />
            ) : (
              <div className="space-y-3">
                {caseInfo.documents.map((doc: CaseDocument) => (
                  <div key={doc.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{doc.document_name}</h4>
                          {doc.required ? (
                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">Required</span>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">Optional</span>
                          )}
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getDocumentStatusColor(doc.status)}`}>
                            {formatDocumentStatus(doc.status)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Type: {doc.document_type}</p>
                        {doc.file_name && <p className="text-xs text-gray-500 dark:text-gray-400">File: {doc.file_name}</p>}
                        {doc.verified_by && <p className="text-xs text-gray-500 dark:text-gray-400">Verified by: {doc.verified_by} on {formatDate(doc.verified_at || '')}</p>}
                        {doc.rejection_reason && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <p className="text-xs text-red-700 dark:text-red-400">Rejection reason: {doc.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {doc.status !== 'VERIFIED' && doc.status !== 'NOT_REQUIRED' && doc.status !== 'NOT_SUBMITTED' && (
                          <>
                            <button
                              onClick={() => handleVerifyDoc(doc.id)}
                              disabled={formLoading}
                              className="px-2.5 py-1.5 text-[11px] font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => setShowRejectDoc(doc.id)}
                              className="px-2.5 py-1.5 text-[11px] font-medium text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Reject form inline */}
                    {showRejectDoc === doc.id && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-2">Rejection reason (required):</p>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-red-200 dark:border-red-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 dark:bg-slate-700 dark:text-white resize-none"
                          placeholder="Enter reason for rejection..."
                        />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => { setShowRejectDoc(null); setRejectReason(''); }} className="px-3 py-1.5 text-xs text-gray-600 bg-white dark:bg-slate-700 border rounded-md hover:bg-gray-50">Cancel</button>
                          <button onClick={() => handleRejectDoc(doc.id)} disabled={!rejectReason.trim()} className="px-3 py-1.5 text-xs text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50">Reject</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowAddTask(true)} className="px-3 py-2 text-xs font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors">
                + Add Task
              </button>
            </div>
            {(!caseInfo.tasks || caseInfo.tasks.length === 0) ? (
              <EmptyState message="No tasks created yet." />
            ) : (
              <div className="space-y-3">
                {caseInfo.tasks.map((task: CaseTask) => (
                  <div key={task.id} className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm p-4 ${task.is_overdue ? 'border-red-300 dark:border-red-800' : 'border-gray-200 dark:border-slate-700'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{task.title}</h4>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getCaseTaskStatusColor(task.status)}`}>{task.status}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getCasePriorityColor(task.priority)}`}>{formatCasePriority(task.priority)}</span>
                          {task.is_overdue && <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">OVERDUE</span>}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatCaseTaskType(task.task_type)}</p>
                        {task.description && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{task.description}</p>}
                        <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                          {task.due_date && <span>Due: {formatDate(task.due_date)}</span>}
                          {task.assigned_to && <span>Assigned: {task.assigned_to}</span>}
                          {task.completed_at && <span>Completed: {formatDateTime(task.completed_at)}</span>}
                        </div>
                      </div>
                      {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                        <div className="flex items-center gap-2 ml-4">
                          <button onClick={() => handleCompleteTask(task.id)} className="px-2.5 py-1.5 text-[11px] font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors">Complete</button>
                          <button onClick={() => handleCancelTask(task.id)} className="px-2.5 py-1.5 text-[11px] font-medium text-gray-600 bg-gray-100 dark:bg-slate-700 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowAddNote(true)} className="px-3 py-2 text-xs font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors">
                + Add Note
              </button>
            </div>
            {(!caseInfo.notes || caseInfo.notes.length === 0) ? (
              <EmptyState message="No notes added yet." />
            ) : (
              <div className="space-y-3">
                {caseInfo.notes.map((note: CaseNote) => (
                  <div key={note.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-[10px]">
                        {(note.author || 'S')[0]}
                      </div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{note.author}</span>
                      <span className="text-[10px] text-gray-400">{formatDateTime(note.created_at)}</span>
                      {note.is_internal ? (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">Internal</span>
                      ) : (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">Public</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-3">
            {(!caseInfo.activities || caseInfo.activities.length === 0) ? (
              <EmptyState message="No activity recorded yet." />
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
                <div className="space-y-4">
                  {caseInfo.activities.map((act: CaseActivity, idx: number) => (
                    <div key={act.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-sm">{act.icon}</div>
                        {idx < (caseInfo.activities?.length || 0) - 1 && <div className="w-0.5 flex-1 bg-gray-200 dark:bg-slate-600 mt-1" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{act.title}</p>
                        {act.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 whitespace-pre-wrap">{act.description}</p>}
                        {act.old_value && act.new_value && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-400">{act.old_value}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent/10 text-accent">{act.new_value}</span>
                          </div>
                        )}
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{act.formatted_date} {act.formatted_time}</p>
                      </div>
                    </div>
                  ))}
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

      {/* ============ MODALS ============ */}

      {/* Status Change Modal */}
      {showStatusChange && (
        <Modal title="Change Case Status" onClose={() => setShowStatusChange(false)}>
          {formError && <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-3"><p className="text-sm text-red-700 dark:text-red-400">{formError}</p></div>}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg dark:text-white">
                <option value="">Select status...</option>
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
            </div>
            {newStatus === 'CLOSED' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Closure Reason *</label>
                <select value={closureReason} onChange={e => setClosureReason(e.target.value)} className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg dark:text-white">
                  <option value="">Select reason...</option>
                  <option value="BENEFIT_PROCESSED">Benefit Processed</option>
                  <option value="NOT_ELIGIBLE">Not Eligible</option>
                  <option value="APPLICANT_WITHDREW">Applicant Withdrew</option>
                  <option value="DUPLICATE_CASE">Duplicate Case</option>
                  <option value="NO_RESPONSE">No Response</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason / Notes</label>
              <textarea value={statusReason} onChange={e => setStatusReason(e.target.value)} rows={2} className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg dark:text-white resize-none" placeholder="Optional reason..." />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowStatusChange(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600">Cancel</button>
            <button onClick={handleStatusChange} disabled={formLoading || !newStatus} className="px-4 py-2 text-sm text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50">Save</button>
          </div>
        </Modal>
      )}

      {/* Complete Confirmation */}
      {showCompleteConfirm && (
        <Modal title="Complete Case" onClose={() => setShowCompleteConfirm(false)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">Are you sure you want to mark this case as completed?</p>
            <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg space-y-1">
              <p className="text-xs text-gray-600 dark:text-gray-400">Please confirm:</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">✓ All required documents are verified</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">✓ Eligibility conditions reviewed</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">✓ Required follow-up completed</p>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">Note: This does not constitute official government approval. Requires Official Verification.</p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowCompleteConfirm(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600">Cancel</button>
            <button onClick={handleComplete} disabled={formLoading} className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">Complete Case</button>
          </div>
        </Modal>
      )}

      {/* Close Case Modal */}
      {showCloseModal && (
        <Modal title="Close Case" onClose={() => setShowCloseModal(false)}>
          {formError && <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-3"><p className="text-sm text-red-700 dark:text-red-400">{formError}</p></div>}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Closure Reason *</label>
              <select value={closureReason} onChange={e => setClosureReason(e.target.value)} className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg dark:text-white">
                <option value="">Select reason...</option>
                <option value="BENEFIT_PROCESSED">Benefit Processed</option>
                <option value="NOT_ELIGIBLE">Not Eligible</option>
                <option value="APPLICANT_WITHDREW">Applicant Withdrew</option>
                <option value="DUPLICATE_CASE">Duplicate Case</option>
                <option value="NO_RESPONSE">No Response</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} rows={2} className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg dark:text-white resize-none" placeholder="Optional notes..." />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowCloseModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600">Cancel</button>
            <button onClick={handleClose} disabled={formLoading || !closureReason} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">Close Case</button>
          </div>
        </Modal>
      )}

      {/* Reopen Modal */}
      {showReopenModal && (
        <Modal title="Reopen Case" onClose={() => setShowReopenModal(false)}>
          {formError && <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-3"><p className="text-sm text-red-700 dark:text-red-400">{formError}</p></div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Reopening *</label>
            <textarea value={reopenReason} onChange={e => setReopenReason(e.target.value)} rows={3} className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg dark:text-white resize-none" placeholder="Enter reason..." />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowReopenModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600">Cancel</button>
            <button onClick={handleReopen} disabled={formLoading || !reopenReason} className="px-4 py-2 text-sm text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50">Reopen</button>
          </div>
        </Modal>
      )}

      {/* Add Note Modal */}
      {showAddNote && (
        <Modal title="Add Note" onClose={() => setShowAddNote(false)}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note Content *</label>
            <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={4} className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg dark:text-white resize-none" placeholder="Enter note..." />
            <p className="text-[10px] text-gray-400 mt-1">This is an internal administrative note.</p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowAddNote(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600">Cancel</button>
            <button onClick={handleAddNote} disabled={formLoading || !noteContent.trim()} className="px-4 py-2 text-sm text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50">Add Note</button>
          </div>
        </Modal>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <Modal title="Add Task" onClose={() => setShowAddTask(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Type</label>
              <select value={taskForm.task_type} onChange={e => setTaskForm(f => ({ ...f, task_type: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg dark:text-white">
                <option value="CALL_APPLICANT">Call Applicant</option>
                <option value="DOCUMENT_COLLECTION">Document Collection</option>
                <option value="DOCUMENT_VERIFICATION">Document Verification</option>
                <option value="ELIGIBILITY_REVIEW">Eligibility Review</option>
                <option value="RENEWAL_FOLLOWUP">Renewal Follow-up</option>
                <option value="SCHEME_REVIEW">Scheme Review</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
              <input type="text" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg dark:text-white" placeholder="Task title..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg dark:text-white resize-none" placeholder="Optional description..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg dark:text-white">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg dark:text-white" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned To</label>
              <input type="text" value={taskForm.assigned_to} onChange={e => setTaskForm(f => ({ ...f, assigned_to: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg dark:text-white" placeholder="Staff name..." />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowAddTask(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600">Cancel</button>
            <button onClick={handleAddTask} disabled={formLoading || !taskForm.title.trim()} className="px-4 py-2 text-sm text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50">Add Task</button>
          </div>
        </Modal>
      )}

      {/* Add Document Modal */}
      {showAddDocument && (
        <Modal title="Add Document" onClose={() => setShowAddDocument(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Type</label>
              <select value={docForm.document_type} onChange={e => setDocForm(f => ({ ...f, document_type: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg dark:text-white">
                <option value="EDUCATION_CERTIFICATE">Education Certificate</option>
                <option value="ID_PROOF">ID Proof</option>
                <option value="INCOME_CERTIFICATE">Income Certificate</option>
                <option value="BANK_DETAILS">Bank Details</option>
                <option value="MEDICAL_CERTIFICATE">Medical Certificate</option>
                <option value="REGISTRATION_PROOF">Registration Proof</option>
                <option value="PHOTO">Photograph</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Name *</label>
              <input type="text" value={docForm.document_name} onChange={e => setDocForm(f => ({ ...f, document_name: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg dark:text-white" placeholder="e.g., Education Certificate" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={docForm.required} onChange={e => setDocForm(f => ({ ...f, required: e.target.checked }))} className="rounded text-accent focus:ring-accent" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Required document</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowAddDocument(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600">Cancel</button>
            <button onClick={handleAddDocument} disabled={formLoading || !docForm.document_name.trim()} className="px-4 py-2 text-sm text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50">Add Document</button>
          </div>
        </Modal>
      )}
    </>
  );
}

// Reusable components
function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="p-5 space-y-2.5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-28 flex-shrink-0">{label}</span>
      <span className={`text-sm text-gray-900 dark:text-white ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-12 text-center">
      <svg className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
