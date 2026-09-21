import { useState, useEffect, useCallback } from 'react';
import { settingsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { SettingsByCategory, SystemStats } from '../types';
import Header from '../components/layout/Header';
import DarkSelect from '../components/common/DarkSelect';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Settings() {
  const [settings, setSettings] = useState<SettingsByCategory>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [activeSection, setActiveSection] = useState('general');

  // Local draft (unsaved changes)
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const [res, statsRes] = await Promise.all([
        settingsApi.getAll(),
        settingsApi.getSystemStats(),
      ]);
      setSettings(res.data || {});
      setSystemStats(statsRes.data || null);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const getVal = (key: string, defaultVal: string = ''): string => {
    if (draft[key] !== undefined) return draft[key];
    for (const cat of Object.values(settings)) {
      if (cat[key]) return cat[key].value;
    }
    return defaultVal;
  };

  const getBool = (key: string, defaultVal: boolean = true): boolean => {
    return getVal(key, String(defaultVal)) === 'true';
  };

  const setVal = (key: string, value: string) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaveMsg('');
    setSaveError('');
  };

  const setBool = (key: string, value: boolean) => {
    setVal(key, String(value));
  };

  const handleSave = async () => {
    if (Object.keys(draft).length === 0) return;
    setSaving(true);
    setSaveMsg('');
    setSaveError('');
    try {
      const res = await settingsApi.update(draft);
      setSaveMsg(res.message || 'Settings saved successfully.');
      setDraft({});
      setHasChanges(false);
      await loadSettings();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft({});
    setHasChanges(false);
    setSaveMsg('');
    setSaveError('');
  };

  if (loading) return (
    <>
      <Header title="Settings" subtitle="System configuration and preferences" />
      <LoadingSpinner />
    </>
  );

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const sections = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'renewal', label: 'Renewal Alerts', icon: '🔔' },
    { id: 'notifications', label: 'Notifications', icon: '📢' },
    { id: 'reminders', label: 'Reminders', icon: '📝' },
    { id: 'eligibility', label: 'Eligibility', icon: '🔍' },
    { id: 'case_management', label: 'Case Management', icon: '📋' },
    { id: 'display', label: 'Display', icon: '🎨' },
    { id: 'reports', label: 'Reports', icon: '📊' },
    { id: 'profile', label: 'My Profile', icon: '👤' },
    { id: 'password', label: 'Change Password', icon: '🔒' },
    ...(isAdmin ? [
      { id: 'approvals', label: 'User Approvals', icon: '👤' },
      { id: 'data', label: 'Data Management', icon: '💾' },
      { id: 'account', label: 'Account Security', icon: '🛡️' },
    ] : []),
    { id: 'system', label: 'System Info', icon: 'ℹ️' },
  ];

  return (
    <>
      <Header title="Settings" subtitle="System configuration and preferences" />
      <div className="p-6 space-y-6">
        {/* Save bar */}
        {hasChanges && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800 dark:text-amber-300">You have unsaved changes</span>
            <div className="flex items-center gap-2">
              <button onClick={handleReset} className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">Reset</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}

        {saveMsg && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-sm font-medium text-green-700 dark:text-green-400">{saveMsg}</div>}
        {saveError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm font-medium text-red-700 dark:text-red-400">{saveError}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar nav */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-2 sticky top-6">
              {sections.map(s => (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    activeSection === s.id ? 'bg-accent text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}>
                  <span>{s.icon}</span>{s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-6">
            {activeSection === 'general' && (
              <SettingsCard title="General Settings" description="Basic application configuration">
                <Field label="Application Name" value={getVal('application_name', 'Nalavariyam Smart Welfare Assistant')} onChange={v => setVal('application_name', v)} />
                <Field label="Office Name" value={getVal('office_name', 'District Welfare Office')} onChange={v => setVal('office_name', v)} />
                <Field label="District / Location" value={getVal('district', 'Chennai')} onChange={v => setVal('district', v)} />
                <SelectField label="Date Format" value={getVal('date_format', 'DD-MM-YYYY')} options={['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD']} onChange={v => setVal('date_format', v)} />
                <SelectField label="Language" value={getVal('language', 'English')} options={['English', 'Tamil']} onChange={v => setVal('language', v)} />
                <SelectField label="Timezone" value={getVal('timezone', 'Asia/Kolkata')} options={['Asia/Kolkata', 'UTC']} onChange={v => setVal('timezone', v)} />
              </SettingsCard>
            )}

            {activeSection === 'renewal' && (
              <SettingsCard title="Renewal Alert Configuration" description="Configure renewal thresholds and urgency levels">
                <Field label="Alert Threshold (days)" value={getVal('renewal_alert_days', '30')} type="number" onChange={v => setVal('renewal_alert_days', v)} hint="Days before expiry to generate alert" />
                <Field label="Critical Threshold (days)" value={getVal('renewal_critical_days', '7')} type="number" onChange={v => setVal('renewal_critical_days', v)} hint="Within this many days = CRITICAL urgency" />
                <Field label="High Threshold (days)" value={getVal('renewal_high_days', '14')} type="number" onChange={v => setVal('renewal_high_days', v)} hint="Within this many days = HIGH urgency" />
                <Field label="Medium Threshold (days)" value={getVal('renewal_medium_days', '30')} type="number" onChange={v => setVal('renewal_medium_days', v)} hint="Within this many days = MEDIUM urgency" />
                <Field label="Low Threshold (days)" value={getVal('renewal_low_days', '90')} type="number" onChange={v => setVal('renewal_low_days', v)} hint="Within this many days = LOW urgency" />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">⚠ Changes to renewal thresholds will sync with the Renewal Intelligence engine.</p>
              </SettingsCard>
            )}

            {activeSection === 'notifications' && (
              <SettingsCard title="Notification Preferences" description="Control which alerts and notifications are generated">
                <Toggle label="Renewal Alerts" checked={getBool('renewal_notifications_enabled')} onChange={v => setBool('renewal_notifications_enabled', v)} />
                <Toggle label="Expired Registration Alerts" checked={getBool('expired_notifications_enabled')} onChange={v => setBool('expired_notifications_enabled', v)} />
                <Toggle label="Missing Information Alerts" checked={getBool('missing_info_notifications_enabled')} onChange={v => setBool('missing_info_notifications_enabled', v)} />
                <Toggle label="Eligibility Alerts" checked={getBool('eligibility_notifications_enabled')} onChange={v => setBool('eligibility_notifications_enabled', v)} />
                <Toggle label="Reminder Alerts" checked={getBool('reminder_notifications_enabled')} onChange={v => setBool('reminder_notifications_enabled', v)} />
                <Toggle label="System Notifications" checked={getBool('system_notifications_enabled')} onChange={v => setBool('system_notifications_enabled', v)} />
              </SettingsCard>
            )}

            {activeSection === 'reminders' && (
              <SettingsCard title="Reminder Configuration" description="Default settings for the Reminders module">
                <SelectField label="Default Priority" value={getVal('default_reminder_priority', 'MEDIUM')} options={['LOW', 'MEDIUM', 'HIGH', 'URGENT']} onChange={v => setVal('default_reminder_priority', v)} />
              </SettingsCard>
            )}

            {activeSection === 'eligibility' && (
              <SettingsCard title="Eligibility Analysis Settings" description="Configure eligibility engine behavior">
                <Toggle label="Automatic Eligibility Analysis" checked={getBool('auto_eligibility_enabled')} onChange={v => setBool('auto_eligibility_enabled', v)} />
                <Toggle label="Show Potential Matches" checked={getBool('show_potential_matches')} onChange={v => setBool('show_potential_matches', v)} />
                <Toggle label="Show Insufficient Data" checked={getBool('show_insufficient_data')} onChange={v => setBool('show_insufficient_data', v)} />
                <Toggle label="Require Manual Verification" checked={getBool('require_manual_verification')} onChange={v => setBool('require_manual_verification', v)} />
                <SelectField label="Default Result Display" value={getVal('eligibility_result_display', 'all')} options={['all', 'potential_first']} onChange={v => setVal('eligibility_result_display', v)} />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">ℹ These settings control display behavior only. Government scheme eligibility rules are not modified.</p>
              </SettingsCard>
            )}

            {activeSection === 'case_management' && (
              <SettingsCard title="Case Management Settings" description="Configure case workflow and document settings">
                <Field label="Case Inactivity Threshold (days)" value={getVal('case_inactivity_days', '14')} type="number" onChange={v => setVal('case_inactivity_days', v)} hint="Days of inactivity before generating follow-up alert" />
                <SelectField label="Default Case Priority" value={getVal('case_default_priority', 'MEDIUM')} options={['LOW', 'MEDIUM', 'HIGH', 'URGENT']} onChange={v => setVal('case_default_priority', v)} />
                <SelectField label="Default Task Priority" value={getVal('case_default_task_priority', 'MEDIUM')} options={['LOW', 'MEDIUM', 'HIGH', 'URGENT']} onChange={v => setVal('case_default_task_priority', v)} />
                <Toggle label="Automatic Case Alerts" checked={getBool('case_auto_alerts_enabled')} onChange={v => setBool('case_auto_alerts_enabled', v)} />
                <Toggle label="Document Verification Reminders" checked={getBool('case_document_reminders_enabled')} onChange={v => setBool('case_document_reminders_enabled', v)} />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">These settings control the Case Management module workflow.</p>
              </SettingsCard>
            )}

            {activeSection === 'display' && (
              <SettingsCard title="Display Settings" description="Customize the application appearance">
                <SelectField label="Table Density" value={getVal('table_density', 'comfortable')} options={['comfortable', 'compact']} onChange={v => setVal('table_density', v)} />
              </SettingsCard>
            )}

            {activeSection === 'reports' && (
              <SettingsCard title="Report Preferences" description="Configure default report generation settings">
                <Field label="Report Organization Name" value={getVal('report_org_name', 'Nalavariyam Smart Welfare Assistant')} onChange={v => setVal('report_org_name', v)} />
                <Field label="Report Footer Text" value={getVal('report_footer_text', 'Preliminary administrative report. Final eligibility and benefit decisions are subject to official verification.')} onChange={v => setVal('report_footer_text', v)} />
                <SelectField label="Default Report Format" value={getVal('report_format', 'PDF')} options={['PDF', 'CSV']} onChange={v => setVal('report_format', v)} />
                <Toggle label="Include Family Members" checked={getBool('report_include_family')} onChange={v => setBool('report_include_family', v)} />
                <Toggle label="Include Eligibility Results" checked={getBool('report_include_eligibility')} onChange={v => setBool('report_include_eligibility', v)} />
                <Toggle label="Include Renewal Information" checked={getBool('report_include_renewal')} onChange={v => setBool('report_include_renewal', v)} />
                <Toggle label="Include Case History" checked={getBool('report_include_case_history')} onChange={v => setBool('report_include_case_history', v)} />
              </SettingsCard>
            )}

            {activeSection === 'approvals' && isAdmin && (
              <RegistrationRequestsSection />
            )}

            {activeSection === 'data' && (
              <>
                <SettingsCard title="Data Management" description="System data overview and safe actions">
                  {systemStats ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <StatBox label="Applicants" value={systemStats.total_applicants} />
                      <StatBox label="Family Members" value={systemStats.total_family_members} />
                      <StatBox label="Schemes" value={systemStats.total_schemes} />
                      <StatBox label="Boards" value={systemStats.total_boards} />
                      <StatBox label="Alerts" value={systemStats.total_alerts} />
                      <StatBox label="Reminders" value={systemStats.total_reminders} />
                      <StatBox label="Activities" value={systemStats.total_activities} />
                      <StatBox label="Education Records" value={systemStats.total_education_records} />
                    </div>
                  ) : (
                    <LoadingSpinner />
                  )}
                  <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                    <button onClick={loadSettings} className="px-4 py-2 text-sm font-medium text-accent bg-accent/5 border border-accent/20 rounded-lg hover:bg-accent/10 transition-colors">Refresh Data</button>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">ℹ Data management actions are safe and non-destructive. No applicant or scheme data will be deleted.</p>
                </SettingsCard>
              </>
            )}

            {activeSection === 'profile' && (
              <ProfileSection />
            )}

            {activeSection === 'password' && (
              <ChangePasswordSection />
            )}

            {activeSection === 'account' && isAdmin && (
              <SettingsCard title="Account Security" description="Manage authorized user accounts">
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">This system is restricted to exactly two authorized accounts. No public registration is available.</p>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs">AD</div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Administrator</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">admin &middot; ADMIN</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">Active</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs">ST</div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Staff User</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">staff &middot; STAFF</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">Active</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">To add, remove, or modify users, contact the system administrator.</p>
                </div>
              </SettingsCard>
            )}

            {activeSection === 'system' && (
              <SettingsCard title="System Information" description="Application and service status">
                <div className="space-y-3">
                  <InfoRow label="Application" value={getVal('application_name', 'Nalavariyam Smart Welfare Assistant')} />
                  <InfoRow label="Version" value="1.0.0" />
                  <InfoRow label="Environment" value="Development" />
                  <InfoRow label="Database" value="SQLite" />
                  <InfoRow label="Backend" value="Flask (Python)" />
                  <InfoRow label="Frontend" value="React + TypeScript + Vite" />
                  <InfoRow label="Eligibility Engine" value="Active" status="green" />
                  <InfoRow label="Renewal Engine" value="Active" status="green" />
                  <InfoRow label="Notification System" value="Active" status="green" />
                </div>
              </SettingsCard>
            )}

            {/* Bottom save button */}
            {hasChanges && (
              <div className="flex items-center justify-end gap-3">
                <button onClick={handleReset} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Reset Unsaved Changes</button>
                <button onClick={handleSave} disabled={saving} className="px-6 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors">{saving ? 'Saving...' : 'Save Settings'}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Reusable form components
// ============================================================

function SettingsCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, value, type = 'text', onChange, hint }: { label: string; value: string; type?: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300" />
      {hint && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <DarkSelect
      label={label}
      value={value}
      onChange={onChange}
      stringOptions={options}
      placeholder="Select"
    />
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <button onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase mt-0.5">{label}</p>
    </div>
  );
}

function InfoRow({ label, value, status }: { label: string; value: string; status?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-slate-700/50">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-sm font-medium ${status === 'green' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>{value}</span>
    </div>
  );
}

function ProfileSection() {
  const { user, updateProfile, uploadProfilePicture, deleteProfilePicture } = useAuth();
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleSaveName = async () => {
    if (!displayName.trim()) { setErr('Name is required.'); return; }
    setSaving(true); setMsg(''); setErr('');
    const result = await updateProfile(displayName.trim());
    setSaving(false);
    if (result.success) setMsg('Profile name updated.');
    else setErr(result.error || 'Failed to update.');
  };

  const handleUploadPicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setErr('Max file size is 2MB.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setErr('Only JPG, PNG, WebP allowed.'); return; }
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true); setMsg(''); setErr('');
    const result = await uploadProfilePicture(file);
    setUploading(false);
    if (result.success) { setMsg('Profile picture updated.'); setPreviewUrl(null); }
    else { setErr(result.error || 'Upload failed.'); setPreviewUrl(null); }
  };

  const handleDeletePicture = async () => {
    setUploading(true); setMsg(''); setErr('');
    const result = await deleteProfilePicture();
    setUploading(false);
    if (result.success) setMsg('Profile picture removed.');
    else setErr(result.error || 'Failed to remove.');
  };

  const pictureUrl = previewUrl || (user as any)?.profile_picture
    ? `/api/auth/profile/picture/${(user as any)?.profile_picture}`
    : null;

  return (
    <SettingsCard title="My Profile" description="Update your display name and profile picture">
      {msg && <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">{msg}</div>}
      {err && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">{err}</div>}

      {/* Profile Picture */}
      <div className="flex items-center gap-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-2xl overflow-hidden border-2 border-accent/30">
            {pictureUrl ? (
              <img src={pictureUrl} alt="Profile" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <span>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
            )}
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover cursor-pointer transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>
            Change Picture
          </label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUploadPicture} className="hidden" />
          {((user as any)?.profile_picture || previewUrl) && (
            <button onClick={handleDeletePicture} disabled={uploading}
              className="block text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-medium">
              Remove Picture
            </button>
          )}
          <p className="text-[11px] text-gray-500 dark:text-gray-400">JPG, PNG or WebP. Max 2MB.</p>
        </div>
      </div>

      {/* Display Name */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Display Name</label>
          <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300"
            placeholder="Your display name" />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">Email:</span> {user?.email} &middot; <span className="font-medium">Role:</span> {user?.role}
        </div>
        <button onClick={handleSaveName} disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </SettingsCard>
  );
}

function RegistrationRequestsSection() {
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [confirmRevoke, setConfirmRevoke] = useState<number | null>(null);
  const [confirmReactivate, setConfirmReactivate] = useState<number | null>(null);
  const { user: currentUser } = useAuth();

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const [reqRes, usersRes] = await Promise.all([
        fetch('/api/auth/requests', { credentials: 'include' }),
        fetch('/api/auth/approved-users', { credentials: 'include' }),
      ]);
      const reqData = await reqRes.json();
      const usersData = await usersRes.json();
      if (reqData.success) setRequests(reqData.data || []);
      if (usersData.success) setUsers(usersData.data || []);
    } catch {
      setErr('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const handleApprove = async (id: number) => {
    setMsg(''); setErr('');
    try {
      const res = await fetch(`/api/auth/requests/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setMsg(data.message || 'Request approved!');
        loadRequests();
      } else {
        setErr(data.error || 'Failed to approve.');
      }
    } catch {
      setErr('Server error.');
    }
  };

  const handleReject = async (id: number) => {
    setMsg(''); setErr('');
    try {
      const res = await fetch(`/api/auth/requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: 'Access denied by administrator.' }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg(data.message || 'Request rejected.');
        loadRequests();
      } else {
        setErr(data.error || 'Failed to reject.');
      }
    } catch {
      setErr('Server error.');
    }
  };

  const handleRevoke = async (userId: number) => {
    setMsg(''); setErr(''); setConfirmRevoke(null);
    try {
      const res = await fetch(`/api/auth/users/${userId}/revoke`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setMsg(data.message || 'User access revoked.');
        loadRequests();
      } else {
        setErr(data.error || 'Failed to revoke access.');
      }
    } catch {
      setErr('Server error.');
    }
  };

  const handleReactivate = async (userId: number) => {
    setMsg(''); setErr(''); setConfirmReactivate(null);
    try {
      const res = await fetch(`/api/auth/users/${userId}/reactivate`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setMsg(data.message || 'User access restored.');
        loadRequests();
      } else {
        setErr(data.error || 'Failed to reactivate.');
      }
    } catch {
      setErr('Server error.');
    }
  };

  const pending = requests.filter((r: any) => r.status === 'PENDING');
  const processed = requests.filter((r: any) => r.status !== 'PENDING');

  return (
    <SettingsCard title="User Access Management" description="Approve, revoke, or reactivate user access">
      {msg && <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">{msg}</div>}
      {err && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">{err}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          {/* All Users — Manage Access */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              All Users ({users.length})
            </h4>
            {users.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No approved users.</p>
            ) : (
              <div className="space-y-3">
                {users.map((u: any) => {
                  const isActive = u.is_active === 1 || u.is_active === true;
                  return (
                    <div key={u.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                      isActive
                        ? 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600'
                        : 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
                    }`}>
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
                            {u.display_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{u.display_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{u.email} &middot; {u.role}</p>
                          {u.last_login_at && (
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">Last login: {new Date(u.last_login_at).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">Active</span>
                        ) : (
                          <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">Revoked</span>
                        )}
                        {u.role !== 'ADMIN' && u.id !== currentUser?.id && (
                          <>
                            {isActive ? (
                              confirmRevoke === u.id ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">Revoke?</span>
                                  <button
                                    onClick={() => handleRevoke(u.id)}
                                    className="px-2 py-1 text-[11px] font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                                  >Yes</button>
                                  <button
                                    onClick={() => setConfirmRevoke(null)}
                                    className="px-2 py-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-slate-500 rounded hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                                  >No</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmRevoke(u.id)}
                                  className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                >
                                  Revoke
                                </button>
                              )
                            ) : (
                              confirmReactivate === u.id ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] text-green-600 dark:text-green-400 font-medium">Restore?</span>
                                  <button
                                    onClick={() => handleReactivate(u.id)}
                                    className="px-2 py-1 text-[11px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
                                  >Yes</button>
                                  <button
                                    onClick={() => setConfirmReactivate(null)}
                                    className="px-2 py-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-slate-500 rounded hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                                  >No</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmReactivate(u.id)}
                                  className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                >
                                  Restore Access
                                </button>
                              )
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending requests */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Pending Requests ({pending.length})
            </h4>
            {pending.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No pending requests.</p>
            ) : (
              <div className="space-y-3">
                {pending.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                    <div className="flex items-center gap-3">
                      {req.avatar_url ? (
                        <img src={req.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
                          {req.display_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{req.display_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{req.email}</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">Requested: {new Date(req.requested_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Processed requests */}
          {processed.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Processed ({processed.length})
              </h4>
              <div className="space-y-2">
                {processed.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-xs">
                        {req.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{req.display_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{req.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        req.status === 'APPROVED'
                          ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
                          : req.status === 'REJECTED'
                          ? 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
                          : 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30'
                      }`}>{req.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </SettingsCard>
  );
}

function ChangePasswordSection() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const handleSubmit = async () => {
    setMsg(''); setErr('');
    if (!currentPassword) { setErr('Current password is required.'); return; }
    if (!newPassword) { setErr('New password is required.'); return; }
    if (newPassword !== confirmPassword) { setErr('New passwords do not match.'); return; }
    if (newPassword.length < 6) { setErr('New password must be at least 6 characters.'); return; }
    setLoading(true);
    const result = await changePassword(currentPassword, newPassword, confirmPassword);
    setLoading(false);
    if (result.success) {
      setMsg('Password changed successfully.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } else {
      setErr(result.error || 'Failed to change password.');
    }
  };

  return (
    <SettingsCard title="Change Password" description="Update your account password">
      {msg && <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">{msg}</div>}
      {err && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">{err}</div>}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Current Password</label>
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300" placeholder="Enter current password" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">New Password</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300" placeholder="Min. 6 characters" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Confirm New Password</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-gray-700 dark:text-gray-300" placeholder="Repeat new password" />
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors">
          {loading ? 'Changing...' : 'Change Password'}
        </button>
      </div>
    </SettingsCard>
  );
}
