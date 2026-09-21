import { useState, useEffect, useCallback } from 'react';
import { familyApi } from '../../services/api';
import DarkSelect from './DarkSelect';
import type { FamilyMember } from '../../types';
import { RELATIONSHIP_TYPES, GENDER_OPTIONS, EDUCATION_LEVELS, MARITAL_STATUS_OPTIONS } from '../../types';

interface Props {
  workerId: number;
  onUpdate?: () => void;
}

export default function FamilyDetailsSection({ workerId, onUpdate }: Props) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FamilyMember | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await familyApi.list(workerId);
      if (result.success && result.data) {
        setMembers(result.data);
      } else {
        setError(result.error || 'Failed to load family members.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load family members.');
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAdd = () => {
    setEditingMember(null);
    setShowForm(true);
  };

  const handleEdit = (member: FamilyMember) => {
    setEditingMember(member);
    setShowForm(true);
  };

  const handleDelete = async (member: FamilyMember) => {
    try {
      const result = await familyApi.delete(member.id);
      if (result.success) {
        setDeleteConfirm(null);
        fetchMembers();
        onUpdate?.();
      } else {
        setError(result.error || 'Failed to delete family member.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete family member.');
    }
  };

  const handleSave = async (data: Partial<FamilyMember>) => {
    try {
      // Check for duplicate before adding
      if (!editingMember && data.name && data.date_of_birth) {
        try {
          const { workersApi } = await import('../../services/api');
          const dupResult = await workersApi.checkDuplicateFamily(workerId, {
            name: data.name,
            date_of_birth: data.date_of_birth,
            relationship: data.relationship || '',
          });
          if (dupResult.success && dupResult.data?.duplicates && dupResult.data.duplicates.length > 0) {
            const confirmed = window.confirm(
              `Possible duplicate found: "${dupResult.data.duplicates[0].name}" (${dupResult.data.duplicates[0].relationship}).\n\nDo you want to add this family member anyway?`
            );
            if (!confirmed) return false;
          }
        } catch {
          // If duplicate check fails, continue with save
        }
      }

      if (editingMember) {
        const result = await familyApi.update(editingMember.id, data);
        if (!result.success) {
          setError(result.error || 'Failed to update family member.');
          return false;
        }
      } else {
        const result = await familyApi.create(workerId, data);
        if (!result.success) {
          setError(result.error || 'Failed to create family member.');
          return false;
        }
      }
      setShowForm(false);
      setEditingMember(null);
      fetchMembers();
      onUpdate?.();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save family member.');
      return false;
    }
  };

  // Summary calculations
  const totalMembers = members.length;
  const dependents = members.filter(m => m.is_dependent === 1).length;
  const children = members.filter(m => m.relationship === 'Son' || m.relationship === 'Daughter').length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Section 4: Family Details</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Family members associated with this worker</p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Family Member
        </button>
      </div>

      <div className="p-5">
        {/* Error display */}
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
            <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
            <p className="text-xs text-red-800 dark:text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Summary */}
        <div className="flex items-center gap-6 mb-4 text-xs text-gray-500 dark:text-gray-400">
          <span>Family Members: <span className="font-semibold text-gray-900 dark:text-white">{totalMembers}</span></span>
          <span>Dependents: <span className="font-semibold text-gray-900 dark:text-white">{dependents}</span></span>
          <span>Children: <span className="font-semibold text-gray-900 dark:text-white">{children}</span></span>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-8 text-gray-400">
            <svg className="animate-spin h-6 w-6 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm">Loading family members...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && members.length === 0 && (
          <div className="text-center py-8">
            <svg className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">No family members added yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Add family members to enable eligibility analysis for welfare schemes</p>
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add First Family Member
            </button>
          </div>
        )}

        {/* Members table — desktop */}
        {!loading && members.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Relationship</th>
                    <th className="pb-2 pr-4">DOB</th>
                    <th className="pb-2 pr-4">Age</th>
                    <th className="pb-2 pr-4">Gender</th>
                    <th className="pb-2 pr-4">Education</th>
                    <th className="pb-2 pr-4">Dependent</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="py-3 pr-4">
                        <span className="font-medium text-gray-900 dark:text-white">{member.name}</span>
                        {member.disability_type && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            Disability
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{member.relationship}</td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                        {member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                        {member.age != null ? `${member.age}y` : '—'}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{member.gender || '—'}</td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{member.education_level || '—'}</td>
                      <td className="py-3 pr-4">
                        {member.is_dependent === 1 ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Yes</span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400">No</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(member)}
                            className="p-1.5 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-md transition-colors"
                            title="Edit"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(member)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                            title="Delete"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Members cards — mobile */}
            <div className="md:hidden space-y-3">
              {members.map((member) => (
                <div key={member.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 border border-gray-100 dark:border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white text-sm">{member.name}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleEdit(member)}
                        className="p-1 text-gray-400 hover:text-accent rounded-md">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button type="button" onClick={() => setDeleteConfirm(member)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-md">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>Relationship: <span className="text-gray-700 dark:text-gray-200">{member.relationship}</span></span>
                    <span>Age: <span className="text-gray-700 dark:text-gray-200">{member.age != null ? `${member.age} years` : '—'}</span></span>
                    <span>Gender: <span className="text-gray-700 dark:text-gray-200">{member.gender || '—'}</span></span>
                    <span>Education: <span className="text-gray-700 dark:text-gray-200">{member.education_level || '—'}</span></span>
                    {member.is_dependent === 1 && (
                      <span className="col-span-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Dependent</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <FamilyMemberForm
          member={editingMember}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingMember(null); }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-sm w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Delete Family Member?</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Are you sure you want to remove <span className="font-medium text-gray-700 dark:text-gray-200">{deleteConfirm.name}</span> from this worker's family details?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ============================================================
// Family Member Form — Modal with all fields
// ============================================================

function FamilyMemberForm({ member, onSave, onCancel }: {
  member: FamilyMember | null;
  onSave: (data: Partial<FamilyMember>) => Promise<boolean | void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: member?.name || '',
    relationship: member?.relationship || '',
    date_of_birth: member?.date_of_birth || '',
    gender: member?.gender || '',
    mobile_number: member?.mobile_number || '',
    education_level: member?.education_level || '',
    marital_status: member?.marital_status || '',
    is_dependent: member?.is_dependent === 1,
    has_disability: member?.has_disability === 1,
    disability_type: member?.disability_type || '',
    disability_percentage: member?.disability_percentage != null ? String(member.disability_percentage) : '',
    disability_certificate_available: member?.disability_certificate_available === 1,
    is_currently_studying: member?.is_currently_studying === 1,
    course_or_class: member?.course_or_class || '',
    institution_name: member?.institution_name || '',
    academic_year: member?.academic_year || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Calculate age from DOB
  const calculatedAge = (() => {
    if (!formData.date_of_birth) return null;
    try {
      const dob = new Date(formData.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age >= 0 ? age : null;
    } catch {
      return null;
    }
  })();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.relationship) newErrors.relationship = 'Relationship is required';
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required';
    else {
      const dob = new Date(formData.date_of_birth);
      if (dob > new Date()) newErrors.date_of_birth = 'Date of birth cannot be in the future';
    }
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (formData.mobile_number && !/^\d{10}$/.test(formData.mobile_number)) newErrors.mobile_number = 'Enter a valid 10-digit number';
    if (formData.disability_percentage) {
      const pct = parseFloat(formData.disability_percentage);
      if (isNaN(pct) || pct < 0 || pct > 100) newErrors.disability_percentage = 'Must be between 0 and 100';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave({
        name: formData.name.trim(),
        relationship: formData.relationship,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender as 'Male' | 'Female' | 'Other',
        mobile_number: formData.mobile_number || null,
        education_level: formData.education_level || null,
        marital_status: formData.marital_status || null,
        is_dependent: formData.is_dependent ? 1 : 0,
        has_disability: formData.has_disability ? 1 : 0,
        disability_type: formData.has_disability ? formData.disability_type || null : null,
        disability_percentage: formData.has_disability && formData.disability_percentage ? parseFloat(formData.disability_percentage) : null,
        disability_certificate_available: formData.has_disability ? (formData.disability_certificate_available ? 1 : 0) : 0,
        is_currently_studying: formData.is_currently_studying ? 1 : 0,
        course_or_class: formData.is_currently_studying ? formData.course_or_class || null : null,
        institution_name: formData.is_currently_studying ? formData.institution_name || null : null,
        academic_year: formData.is_currently_studying ? formData.academic_year || null : null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between z-10">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {member ? 'Edit Family Member' : 'Add Family Member'}
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Personal Details */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Personal Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput label="Full Name" name="name" value={formData.name} onChange={handleChange} required error={errors.name} placeholder="Enter full name" />
              <FormSelect label="Relationship" name="relationship" value={formData.relationship} onChange={handleChange} required error={errors.relationship} options={[...RELATIONSHIP_TYPES]} placeholder="-- Select --" />
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} max={new Date().toISOString().split('T')[0]}
                  className={`w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-gray-900 dark:text-gray-100 ${errors.date_of_birth ? 'border-red-400' : 'border-gray-200 dark:border-slate-600'}`} />
                {errors.date_of_birth && <p className="text-xs text-red-500 mt-1">{errors.date_of_birth}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Age</label>
                <div className="w-full px-3 py-2.5 text-sm bg-gray-100 dark:bg-slate-600 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-500 dark:text-gray-400">
                  {calculatedAge != null ? `${calculatedAge} years` : '—'}
                </div>
              </div>
              <FormSelect label="Gender" name="gender" value={formData.gender} onChange={handleChange} required error={errors.gender} options={[...GENDER_OPTIONS]} placeholder="-- Select --" />
              <FormInput label="Mobile Number" name="mobile_number" value={formData.mobile_number} onChange={handleChange} error={errors.mobile_number} placeholder="10-digit number (optional)" />
            </div>
          </div>

          {/* Education & Marital */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Education & Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect label="Education Level" name="education_level" value={formData.education_level} onChange={handleChange} options={[...EDUCATION_LEVELS, 'Not Applicable']} placeholder="-- Select --" />
              <FormSelect label="Marital Status" name="marital_status" value={formData.marital_status} onChange={handleChange} options={['Not Applicable', ...MARITAL_STATUS_OPTIONS]} placeholder="-- Select --" />
              <div className="flex items-center gap-3 pt-6">
                <input type="checkbox" name="is_dependent" checked={formData.is_dependent} onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
                <label className="text-sm text-gray-700 dark:text-gray-300">Dependent on Worker</label>
              </div>
            </div>
          </div>

          {/* Disability */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Disability Information</h4>
            <div className="flex items-center gap-3 mb-3">
              <input type="checkbox" name="has_disability" checked={formData.has_disability} onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
              <label className="text-sm text-gray-700 dark:text-gray-300">Has Disability?</label>
            </div>
            {formData.has_disability && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-7">
                <FormInput label="Disability Type" name="disability_type" value={formData.disability_type} onChange={handleChange} placeholder="e.g. Visual, Hearing" />
                <FormInput label="Disability Percentage" name="disability_percentage" value={formData.disability_percentage} onChange={handleChange} placeholder="0-100" error={errors.disability_percentage} />
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" name="disability_certificate_available" checked={formData.disability_certificate_available} onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
                  <label className="text-sm text-gray-700 dark:text-gray-300">Certificate Available</label>
                </div>
              </div>
            )}
          </div>

          {/* Student Information */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Student Information</h4>
            <div className="flex items-center gap-3 mb-3">
              <input type="checkbox" name="is_currently_studying" checked={formData.is_currently_studying} onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
              <label className="text-sm text-gray-700 dark:text-gray-300">Currently Studying?</label>
            </div>
            {formData.is_currently_studying && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-7">
                <FormInput label="Course / Class" name="course_or_class" value={formData.course_or_class} onChange={handleChange} placeholder="e.g. 10th Standard" />
                <FormInput label="Institution Name" name="institution_name" value={formData.institution_name} onChange={handleChange} placeholder="School / College name" />
                <FormInput label="Academic Year" name="academic_year" value={formData.academic_year} onChange={handleChange} placeholder="e.g. 2025-2026" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors">
              {saving ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : member ? 'Update Member' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ============================================================
// Reusable form field components
// ============================================================

function FormInput({ label, name, value, onChange, placeholder, required, error, type = 'text' }: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; required?: boolean; error?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
        className={`w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder-gray-400 text-gray-900 dark:text-gray-100 ${error ? 'border-red-400' : 'border-gray-200 dark:border-slate-600'}`} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function FormSelect({ label, name, value, onChange, options, required, error, placeholder }: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[]; required?: boolean; error?: string; placeholder?: string;
}) {
  // Wrap native onChange to match DarkSelect's (value: string) signature
  const handleChange = (val: string) => {
    // Create a synthetic event-like object for compatibility
    const syntheticEvent = {
      target: { name, value: val, type: 'select' },
      currentTarget: { name, value: val },
    } as unknown as React.ChangeEvent<HTMLSelectElement>;
    onChange(syntheticEvent);
  };
  return (
    <DarkSelect
      label={label}
      name={name}
      value={value}
      onChange={handleChange}
      stringOptions={options}
      placeholder={placeholder || '-- Select --'}
      required={required}
      error={error}
    />
  );
}
