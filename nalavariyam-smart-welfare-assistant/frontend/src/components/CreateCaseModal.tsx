import { useState, useEffect, useCallback } from 'react';
import { workersApi, schemesApi, familyApi, casesApi } from '../services/api';
import type { Worker, WelfareScheme, FamilyMember } from '../types';

interface Props {
  onClose: () => void;
  onCreated: () => void;
  prefill?: {
    worker_id?: number;
    scheme_id?: number;
    scheme_variant_id?: number;
    claimant_id?: number;
    claimant_type?: string;
    title?: string;
    description?: string;
    priority?: string;
  };
}

export default function CreateCaseModal({ onClose, onCreated, prefill }: Props) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [schemes, setSchemes] = useState<WelfareScheme[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  const [workerId, setWorkerId] = useState<number>(prefill?.worker_id || 0);
  const [schemeId, setSchemeId] = useState<number>(prefill?.scheme_id || 0);
  const [variantId, setVariantId] = useState<number>(prefill?.scheme_variant_id || 0);
  const [claimantId, setClaimantId] = useState<number>(prefill?.claimant_id || 0);
  const [claimantType, setClaimantType] = useState<string>(prefill?.claimant_type || 'WORKER');
  const [title, setTitle] = useState(prefill?.title || '');
  const [description, setDescription] = useState(prefill?.description || '');
  const [priority, setPriority] = useState(prefill?.priority || 'MEDIUM');
  const [assignedTo, setAssignedTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');

  // Load workers and schemes on mount
  useEffect(() => {
    workersApi.list({ per_page: 200 }).then(r => {
      if (r.success && r.data) setWorkers(r.data.workers || []);
    });
    schemesApi.list().then(r => {
      if (r.success && r.data) setSchemes(r.data || []);
    });
  }, []);

  // Load family members when worker changes
  const loadFamily = useCallback(async () => {
    if (!workerId) { setFamilyMembers([]); return; }
    try {
      const r = await familyApi.list(workerId);
      if (r.success && r.data) setFamilyMembers(r.data || []);
    } catch { setFamilyMembers([]); }
  }, [workerId]);

  useEffect(() => { loadFamily(); }, [loadFamily]);

  // Check for duplicates
  useEffect(() => {
    if (workerId && schemeId) {
      casesApi.checkDuplicate({
        worker_id: workerId,
        scheme_id: schemeId || undefined,
        claimant_id: claimantId || undefined,
      }).then(r => {
        if (r.success && r.data?.duplicate) {
          setDuplicateWarning(
            `An active case already exists: ${r.data.case_number} (${r.data.status})`
          );
        } else {
          setDuplicateWarning('');
        }
      }).catch(() => setDuplicateWarning(''));
    }
  }, [workerId, schemeId, claimantId]);

  const handleSubmit = async () => {
    if (!workerId) { setError('Please select an applicant.'); return; }
    if (!title.trim()) { setError('Please enter a case title.'); return; }

    setLoading(true);
    setError('');
    try {
      const result = await casesApi.create({
        worker_id: workerId,
        title: title.trim(),
        scheme_id: schemeId || undefined,
        scheme_variant_id: variantId || undefined,
        claimant_id: claimantId || undefined,
        claimant_type: claimantType,
        description: description.trim() || undefined,
        priority,
        assigned_to: assignedTo.trim() || undefined,
        created_by: 'Staff',
      });

      if (result.success) {
        onCreated();
      } else {
        setError(result.error || 'Failed to create case.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create case.');
    } finally {
      setLoading(false);
    }
  };

  const selectedWorker = workers.find(w => w.id === workerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Case</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">New welfare benefit case</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {duplicateWarning && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-400">{duplicateWarning}</p>
            </div>
          )}

          {/* Applicant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Applicant *</label>
            <select
              value={workerId}
              onChange={(e) => setWorkerId(Number(e.target.value))}
              className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 dark:text-white"
            >
              <option value={0}>Select applicant...</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>{w.full_name} {w.district ? `(${w.district})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Welfare Board (display only) */}
          {selectedWorker && (selectedWorker as any).board_name && (
            <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Welfare Board</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{(selectedWorker as any).board_name}</p>
            </div>
          )}

          {/* Scheme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Welfare Scheme</label>
            <select
              value={schemeId}
              onChange={(e) => { setSchemeId(Number(e.target.value)); setVariantId(0); }}
              className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 dark:text-white"
            >
              <option value={0}>Select scheme...</option>
              {schemes.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Claimant Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Claimant</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="claimant_type"
                  checked={claimantType === 'WORKER'}
                  onChange={() => { setClaimantType('WORKER'); setClaimantId(0); }}
                  className="text-accent focus:ring-accent"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Self (Worker)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="claimant_type"
                  checked={claimantType === 'FAMILY_MEMBER'}
                  onChange={() => setClaimantType('FAMILY_MEMBER')}
                  className="text-accent focus:ring-accent"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Family Member</span>
              </label>
            </div>
          </div>

          {/* Family Member Select */}
          {claimantType === 'FAMILY_MEMBER' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Family Member</label>
              <select
                value={claimantId}
                onChange={(e) => setClaimantId(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 dark:text-white"
              >
                <option value={0}>Select family member...</option>
                {familyMembers.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.relationship})</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Case Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Education Assistance application review"
              className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 dark:text-white"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Staff</label>
            <input
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="e.g., S. Shanmugam"
              className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional case description..."
              className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 dark:text-white placeholder-gray-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? 'Creating...' : 'Create Case'}
          </button>
        </div>
      </div>
    </div>
  );
}
