import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { workersApi, boardsApi } from '../services/api';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { TAMIL_NADU_DISTRICTS, EDUCATION_LEVELS, GENDER_OPTIONS, MARITAL_STATUS_OPTIONS } from '../types';
import { DISTRICT_TALUK_VILLAGES } from '../data/districts';
import { findBoardDataByName } from '../data/welfareBoards';
import type { WelfareBoard, Worker } from '../types';
import FamilyDetailsSection from '../components/common/FamilyDetailsSection';
import DarkSelect from '../components/common/DarkSelect';

interface WorkerFormData {
  full_name: string;
  father_husband_name: string;
  gender: string;
  date_of_birth: string;
  mobile_number: string;
  alternate_mobile: string;
  address: string;
  district: string;
  taluk: string;
  village_town: string;
  pincode: string;
  ration_card_number: string;
  reference_id: string;
  nature_of_work: string;
  occupation: string;
  worker_category: string;
  board_id: string;
  education_level: string;
  marital_status: string;
  has_disability: boolean;
  disability_details: string;
  registration_number: string;
  registration_date: string;
  validity_date: string;
  renewal_date: string;
}

export default function EditWorker() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isCreate = id === 'new' || !id || isNaN(Number(id));
  const workerId = isCreate ? 0 : Number(id);

  const { data: worker, loading, error } = useApi<Worker>(
    () => isCreate ? Promise.resolve({ success: true, data: null as unknown as Worker }) : workersApi.getById(workerId),
    [isCreate, workerId],
  );

  // Fetch boards from API to get database IDs (for FOREIGN KEY compliance)
  const { data: boardsResponse } = useApi(() => boardsApi.list(), []);
  const dbBoards: WelfareBoard[] = boardsResponse || [];


  const [formData, setFormData] = useState<WorkerFormData>({
    full_name: '', father_husband_name: '', gender: '', date_of_birth: '',
    mobile_number: '', alternate_mobile: '', address: '', district: '',
    taluk: '', village_town: '', pincode: '', ration_card_number: '',
    reference_id: '', nature_of_work: '', occupation: '', worker_category: '',
    board_id: '', education_level: '', marital_status: '', has_disability: false,
    disability_details: '', registration_number: '', registration_date: '',
    validity_date: '', renewal_date: '',
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (worker) {
      setFormData({
        full_name: worker.full_name || '',
        father_husband_name: worker.father_husband_name || '',
        gender: worker.gender || '',
        date_of_birth: worker.date_of_birth || '',
        mobile_number: worker.mobile_number || '',
        alternate_mobile: worker.alternate_mobile || '',
        address: worker.address || '',
        district: worker.district || '',
        taluk: worker.taluk || '',
        village_town: worker.village_town || '',
        pincode: worker.pincode || '',
        ration_card_number: worker.ration_card_number || '',
        reference_id: worker.reference_id || '',
        nature_of_work: worker.nature_of_work || '',
        occupation: worker.occupation || '',
        worker_category: worker.worker_category || '',
        board_id: worker.board_id ? String(worker.board_id) : (worker.board_name || ''),
        education_level: worker.education_level || '',
        marital_status: worker.marital_status || '',
        has_disability: Boolean(worker.has_disability),
        disability_details: worker.disability_details || '',
        registration_number: worker.registrations?.[0]?.registration_number || '',
        registration_date: worker.registrations?.[0]?.registration_date || '',
        validity_date: worker.registrations?.[0]?.validity_date || '',
        renewal_date: worker.registrations?.[0]?.renewal_date || '',
      });
    }
  }, [worker]);

  // Shared logic to update form field by name + value
  const updateField = (name: string, value: string, checked?: boolean) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: checked !== undefined ? checked : value,
      };
      // Changing the welfare board resets the dependent nature-of-work selection
      if (name === 'board_id') {
        updated.nature_of_work = '';
        updated.worker_category = '';
      }
      if (name === 'district') {
        updated.taluk = '';
        updated.village_town = '';
      }
      if (name === 'taluk') {
        updated.village_town = '';
      }
      return updated;
    });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // For native inputs (text, checkbox, textarea, native select)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    updateField(name, value, type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined);
  };

  // For DarkSelect / SelectField (which pass name + value string)
  const handleSelectChange = (name: string) => (value: string) => {
    updateField(name, value);
  };

  // Derive taluk and village options from selected district
  const talukOptions = formData.district
    ? Object.keys(DISTRICT_TALUK_VILLAGES[formData.district] || {})
    : [];
  const villageOptions = formData.district && formData.taluk
    ? (DISTRICT_TALUK_VILLAGES[formData.district]?.[formData.taluk] || [])
    : [];

  // Derive nature of work options from selected welfare board
  const selectedBoardData = useMemo(() => {
    if (!formData.board_id) return null;
    const selectedDbBoard = dbBoards.find(b => String(b.id) === formData.board_id);
    if (!selectedDbBoard) return null;
    return findBoardDataByName(selectedDbBoard.name) || null;
  }, [formData.board_id, dbBoards]);

  const natureOfWorkOptions = useMemo(() => {
    // Always a selection box: official works for the board, plus "Other"
    // fallback and the currently saved value (if it isn't in the list).
    const opts = selectedBoardData
      ? selectedBoardData.natureOfWorks.map(w => `${w.code}: ${w.name}`)
      : [];
    if (!opts.includes('OTH: Other work not listed')) opts.push('OTH: Other work not listed');
    if (formData.nature_of_work && !opts.includes(formData.nature_of_work)) {
      opts.unshift(formData.nature_of_work);
    }
    return opts;
  }, [selectedBoardData, formData.nature_of_work]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required';
    if (formData.mobile_number && !/^\d{10}$/.test(formData.mobile_number)) newErrors.mobile_number = 'Enter a valid 10-digit mobile number';
    if (formData.alternate_mobile && !/^\d{10}$/.test(formData.alternate_mobile)) newErrors.alternate_mobile = 'Enter a valid 10-digit mobile number';
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) newErrors.pincode = 'Enter a valid 6-digit pincode';
    if (!formData.district) newErrors.district = 'District is required';
    if (!formData.board_id) newErrors.board_id = 'Board is required';
    if (formData.validity_date && formData.registration_date && formData.validity_date < formData.registration_date) {
      newErrors.validity_date = 'Validity date must be after registration date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload: Record<string, unknown> = {
        full_name: formData.full_name,
        father_husband_name: formData.father_husband_name || null,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
        mobile_number: formData.mobile_number || null,
        alternate_mobile: formData.alternate_mobile || null,
        address: formData.address || null,
        district: formData.district,
        taluk: formData.taluk || null,
        village_town: formData.village_town || null,
        pincode: formData.pincode || null,
        ration_card_number: formData.ration_card_number || null,
        reference_id: formData.reference_id || null,
        nature_of_work: formData.nature_of_work || null,
        occupation: formData.occupation || null,
        worker_category: formData.worker_category || null,
        board_id: formData.board_id ? Number(formData.board_id) || null : null,
        education_level: formData.education_level || null,
        marital_status: formData.marital_status || null,
        has_disability: formData.has_disability ? 1 : 0,
        disability_details: formData.disability_details || null,
        registration_number: formData.registration_number || undefined,
        registration_date: formData.registration_date || undefined,
        validity_date: formData.validity_date || undefined,
        renewal_date: formData.renewal_date || undefined,
      };

      if (isCreate) {
        const result = await workersApi.create(payload as any);
        setSaveSuccess(true);
        const newId = result?.data?.id;
        setTimeout(() => navigate(newId ? `/workers/${newId}` : '/workers'), 1500);
      } else {
        await workersApi.update(workerId, payload as any);
        setSaveSuccess(true);
        setTimeout(() => navigate(`/workers/${workerId}`), 1500);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update worker. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isCreate) {
    if (loading) return <><Header title="Edit Applicant" /><LoadingSpinner /></>;
    if (error || !worker) return <><Header title="Edit Applicant" /><div className="p-6"><ErrorMessage message={error || 'Applicant not found.'} /></div></>;
  }

  return (
    <>
      <Header title={isCreate ? 'Add New Applicant' : 'Edit Applicant'} subtitle={isCreate ? 'Register a new welfare applicant' : `Editing profile of ${worker?.full_name}`} />

      <div className="p-6 space-y-6">
        <button
          onClick={() => isCreate ? navigate('/workers') : navigate(`/workers/${workerId}`)}
          className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {isCreate ? 'Back to Applicants' : 'Back to Applicant Details'}
        </button>

        {saveSuccess && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-3">
            <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Applicant updated successfully! Redirecting...</p>
          </div>
        )}

        {saveError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
            <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{saveError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Personal Information */}
          <FormSection title="Section 1: Personal Details">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Full Name" name="full_name" value={formData.full_name} onChange={handleChange} required error={errors.full_name} />
              <Field label="Father's / Husband's Name" name="father_husband_name" value={formData.father_husband_name} onChange={handleChange} />
              <SelectField label="Gender" name="gender" value={formData.gender} onChange={handleSelectChange('gender')} options={[...GENDER_OPTIONS]} required error={errors.gender} />
              <Field label="Date of Birth" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} required error={errors.date_of_birth} />
              <Field label="Mobile Number" name="mobile_number" value={formData.mobile_number} onChange={handleChange} placeholder="10-digit number" error={errors.mobile_number} />
              <Field label="Alternate Mobile" name="alternate_mobile" value={formData.alternate_mobile} onChange={handleChange} placeholder="10-digit number" error={errors.alternate_mobile} />
              <SelectField label="District" name="district" value={formData.district} onChange={handleSelectChange('district')} options={[...TAMIL_NADU_DISTRICTS]} required error={errors.district} />
              <SelectField label="Taluk" name="taluk" value={formData.taluk} onChange={handleSelectChange('taluk')} options={talukOptions} disabled={!formData.district} />
              {villageOptions.length > 0 ? (
                <SelectField label="Village / Town" name="village_town" value={formData.village_town} onChange={handleSelectChange('village_town')} options={villageOptions} disabled={!formData.taluk} />
              ) : (
                <Field label="Village / Town" name="village_town" value={formData.village_town} onChange={handleChange} placeholder="Enter village or town name" disabled={!formData.taluk} />
              )}
              <Field label="Pincode" name="pincode" value={formData.pincode} onChange={handleChange} placeholder="6-digit pincode" error={errors.pincode} />
              <SelectField label="Marital Status" name="marital_status" value={formData.marital_status} onChange={handleSelectChange('marital_status')} options={[...MARITAL_STATUS_OPTIONS]} />
              <SelectField label="Education Level" name="education_level" value={formData.education_level} onChange={handleSelectChange('education_level')} options={[...EDUCATION_LEVELS]} />
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange} rows={2}
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder-gray-400 text-gray-900 dark:text-gray-100" />
              </div>
            </div>
          </FormSection>

          {/* Section 2: Worker Details */}
          <FormSection title="Section 2: Worker Information">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DarkSelect
                label="Welfare Board"
                name="board_id"
                value={formData.board_id}
                onChange={handleSelectChange('board_id')}
                options={dbBoards.map(b => ({ value: b.id, label: b.name }))}
                placeholder="— Select Board —"
                required
                error={errors.board_id}
              />
              <SelectField
                label="Nature of Work"
                name="nature_of_work"
                value={formData.nature_of_work}
                onChange={handleSelectChange('nature_of_work')}
                options={natureOfWorkOptions}
                disabled={!formData.board_id}
                placeholder={formData.board_id ? 'Select work' : 'Select a board first'}
              />
              <Field label="Worker Category" name="worker_category" value={formData.worker_category} onChange={handleChange} />
              <div className="flex items-center gap-3 pt-6">
                <input type="checkbox" name="has_disability" checked={formData.has_disability} onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
                <label className="text-sm text-gray-700 dark:text-gray-300">Has Disability</label>
              </div>
            </div>
          </FormSection>

          {/* Section 3: Identification */}
          <FormSection title="Section 3: Identification">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Ration / Smart Card Number" name="ration_card_number" value={formData.ration_card_number} onChange={handleChange} placeholder="Card number" />
              <Field label="Reference / Other ID" name="reference_id" value={formData.reference_id} onChange={handleChange} placeholder="Any other reference ID" />
            </div>
          </FormSection>

          {/* Section 4: Family Details (only when editing existing worker) */}
          {!isCreate && <FamilyDetailsSection workerId={workerId} />}

          {/* Section 5: Registration Information */}
          <FormSection title="Section 5: Registration Details">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Registration Number" name="registration_number" value={formData.registration_number} onChange={handleChange} placeholder="e.g. TN-CWB-2024-00001" />
              <Field label="Registration Date" name="registration_date" type="date" value={formData.registration_date} onChange={handleChange} />
              <Field label="Validity Date" name="validity_date" type="date" value={formData.validity_date} onChange={handleChange} error={errors.validity_date} />
              <Field label="Renewal Date" name="renewal_date" type="date" value={formData.renewal_date} onChange={handleChange} />
            </div>
          </FormSection>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={() => navigate(`/workers/${workerId}`)}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-visible relative">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="p-5 overflow-visible">{children}</div>
    </div>
  );
}

function Field({ label, name, type = 'text', value, onChange, placeholder, required, error, disabled }: {
  label: string; name: string; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; required?: boolean; error?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder-gray-400 text-gray-900 dark:text-gray-100 ${error ? 'border-red-400' : 'border-gray-200 dark:border-slate-600'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function SelectField({ label, name, value, onChange, options, required, error, disabled, placeholder }: {
  label: string; name: string; value: string; onChange: (value: string) => void;
  options: string[]; required?: boolean; error?: string; disabled?: boolean; placeholder?: string;
}) {
  return (
    <DarkSelect
      label={label}
      name={name}
      value={value}
      onChange={onChange}
      stringOptions={options}
      placeholder={placeholder ?? (disabled ? '— Select District first —' : '— Select —')}
      required={required}
      disabled={disabled}
      error={error}
    />
  );
}
