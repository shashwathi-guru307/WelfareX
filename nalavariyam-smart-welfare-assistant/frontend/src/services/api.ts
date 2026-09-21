// ============================================================
// API Service Layer — Phase 2 expanded
// ============================================================

import type { ApiResponse, DashboardStats, PaginatedResponse, Worker, WelfareBoard, WelfareScheme, SchemeCategory, SchemeBenefit, SchemeQualification, SchemeRule, EligibilityResult, FamilyMember, EducationRecord, EligibilityAnalysis, AuditLogEntry, AlertsResponse, AlertCounts, RenewalSummaryItem, RenewalBreakdown, WorkerRenewalDetail, RenewalConfig, RenewalHistory, RemindersResponse, ReminderSummary, Reminder, ActivityLog, ActivitySummary, NotificationPreferences, SettingsByCategory, SystemSetting, SystemStats, ReportStatistics, BoardStatistic, DistrictStatistic, Case, CasesResponse, CaseStatistics, CaseMetadata, CaseDocument, CaseTask, CaseNote, WorkQueue, DuplicateCheck, WorkerNote } from '../types';

// DYNAMIC BACKEND RESOLUTION:
// 1. Prefers VITE_API_BASE_URL if set in .env
// 2. Prefers VITE_API_URL if set in .env
// 3. Fallback: Directly hits your hosted Render backend
const BACKEND_HOST = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "https://welfare-x.onrender.com";

// Ensures request paths don't end up with double slashes or duplicate /api prefixes
const API_BASE = BACKEND_HOST.replace(/\/+$/, '');

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  // Ensure the requested endpoint starts with a slash
  const formattedUrl = url.startsWith('/') ? url : `/${url}`;
  
  // Appends /api if not already included in the base or path
  const targetUrl = API_BASE.endsWith('/api') || formattedUrl.startsWith('/api') 
    ? `${API_BASE}${formattedUrl}` 
    : `${API_BASE}/api${formattedUrl}`;

  const response = await fetch(targetUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
    ...options,
  });

  // Handle 401 - redirect to login
  if (response.status === 401 && !url.includes('/auth/')) {
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.errors?.join(', ') || `Request failed with status ${response.status}`);
  }

  return data;
}

// ============================================================
// Dashboard API
// ============================================================
export const dashboardApi = {
  getStats: () => request<ApiResponse<DashboardStats>>('/dashboard/stats'),
};

// ============================================================
// Workers API
// ============================================================
export interface WorkerListParams {
  search?: string;
  board_id?: number;
  district?: string;
  taluk?: string;
  occupation?: string;
  status?: string;
  renewal?: string;
  renewal_status?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export const workersApi = {
  list: (params?: WorkerListParams) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return request<ApiResponse<PaginatedResponse<Worker>>>(`/workers${query ? `?${query}` : ''}`);
  },

  getById: (id: number) => request<ApiResponse<Worker>>(`/workers/${id}`),

  create: (data: Partial<Worker>) =>
    request<ApiResponse<Worker>>('/workers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Worker>) =>
    request<ApiResponse<Worker>>(`/workers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<ApiResponse<{ message: string }>>(`/workers/${id}`, {
      method: 'DELETE',
    }),

  archive: (id: number) =>
    request<ApiResponse<{ message: string }>>(`/workers/${id}/archive`, {
      method: 'POST',
    }),

  unarchive: (id: number) =>
    request<ApiResponse<{ message: string }>>(`/workers/${id}/unarchive`, {
      method: 'POST',
    }),

  getOccupations: () => request<ApiResponse<string[]>>('/workers/occupations'),
  getDistricts: () => request<ApiResponse<string[]>>('/workers/districts'),

  getNotes: (workerId: number) =>
    request<ApiResponse<WorkerNote[]>>(`/workers/${workerId}/notes`),

  addNote: (workerId: number, data: { content: string; author?: string; is_internal?: boolean }) =>
    request<ApiResponse<WorkerNote>>(`/workers/${workerId}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateLastReviewed: (workerId: number, author?: string) =>
    request<ApiResponse<{ message: string }>>(`/workers/${workerId}/last-reviewed`, {
      method: 'POST',
      body: JSON.stringify({ author }),
    }),

  checkDuplicateFamily: (workerId: number, data: { name: string; date_of_birth?: string; relationship?: string }) =>
    request<ApiResponse<{ duplicates: FamilyMember[] }>>(`/workers/${workerId}/check-duplicate-family`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ============================================================
// Family Members API
// ============================================================
export const familyApi = {
  list: (workerId: number) =>
    request<ApiResponse<FamilyMember[]>>(`/workers/${workerId}/family`),

  getById: (memberId: number) =>
    request<ApiResponse<FamilyMember>>(`/family/${memberId}`),

  create: (workerId: number, data: Partial<FamilyMember>) =>
    request<ApiResponse<FamilyMember>>(`/workers/${workerId}/family`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (memberId: number, data: Partial<FamilyMember>) =>
    request<ApiResponse<FamilyMember>>(`/family/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (memberId: number) =>
    request<ApiResponse<{ message: string }>>(`/family/${memberId}`, {
      method: 'DELETE',
    }),
};

// ============================================================
// Education API
// ============================================================
export const educationApi = {
  list: (workerId: number, familyMemberId?: number) => {
    const params = familyMemberId ? `?family_member_id=${familyMemberId}` : '';
    return request<ApiResponse<EducationRecord[]>>(`/workers/${workerId}/education${params}`);
  },

  getById: (recordId: number) =>
    request<ApiResponse<EducationRecord>>(`/education/${recordId}`),

  create: (workerId: number, data: Partial<EducationRecord>) =>
    request<ApiResponse<EducationRecord>>(`/workers/${workerId}/education`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (recordId: number, data: Partial<EducationRecord>) =>
    request<ApiResponse<EducationRecord>>(`/education/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (recordId: number) =>
    request<ApiResponse<{ message: string }>>(`/education/${recordId}`, {
      method: 'DELETE',
    }),

  getLevels: () => request<ApiResponse<string[]>>('/education-levels'),
};

// ============================================================
// Boards API
// ============================================================
export const boardsApi = {
  list: () => request<ApiResponse<WelfareBoard[]>>('/boards'),
  getById: (id: number) => request<ApiResponse<WelfareBoard>>(`/boards/${id}`),
  create: (data: Partial<WelfareBoard>) =>
    request<ApiResponse<WelfareBoard>>('/boards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<WelfareBoard>) =>
    request<ApiResponse<WelfareBoard>>(`/boards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<ApiResponse<{ message: string }>>(`/boards/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Schemes API
// ============================================================
export interface SchemeListParams {
  category_id?: number;
  board_id?: number;
  search?: string;
}

export const schemesApi = {
  list: (params?: SchemeListParams) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return request<ApiResponse<WelfareScheme[]>>(`/schemes${query ? `?${query}` : ''}`);
  },
  getById: (id: number) => request<ApiResponse<WelfareScheme>>(`/schemes/${id}`),
  getBenefits: (schemeId: number, boardId?: number) => {
    const params = boardId ? `?board_id=${boardId}` : '';
    return request<ApiResponse<SchemeBenefit[]>>(`/schemes/${schemeId}/benefits${params}`);
  },
  getQualifications: (schemeId: number) =>
    request<ApiResponse<SchemeQualification[]>>(`/schemes/${schemeId}/qualifications`),
  getRules: (schemeId: number) =>
    request<ApiResponse<SchemeRule[]>>(`/schemes/${schemeId}/rules`),
  create: (data: Partial<WelfareScheme>) =>
    request<ApiResponse<WelfareScheme>>('/schemes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<WelfareScheme>) => request<ApiResponse<WelfareScheme>>(`/schemes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) => request<ApiResponse<{ message: string }>>(`/schemes/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Scheme Categories API
// ============================================================
export const schemeCategoriesApi = {
  list: () => request<ApiResponse<SchemeCategory[]>>('/scheme-categories'),
  getById: (id: number) => request<ApiResponse<SchemeCategory>>(`/scheme-categories/${id}`),
  create: (data: Partial<SchemeCategory>) =>
    request<ApiResponse<SchemeCategory>>('/scheme-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<SchemeCategory>) =>
    request<ApiResponse<SchemeCategory>>(`/scheme-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ============================================================
// Eligibility API
// ============================================================
export const eligibilityApi = {
  evaluate: (workerId: number, schemeId: number) =>
    request<ApiResponse<EligibilityResult>>('/eligibility/evaluate', {
      method: 'POST',
      body: JSON.stringify({ worker_id: workerId, scheme_id: schemeId }),
    }),

  analyzeWorker: (workerId: number) =>
    request<ApiResponse<EligibilityAnalysis>>(`/eligibility/analyze/${workerId}`),

  evaluateWorker: (workerId: number) =>
    request<ApiResponse<{ worker_id: number; worker_name: string; evaluations: EligibilityResult[] }>>(
      `/eligibility/worker/${workerId}`,
    ),

  getAuditLog: (workerId: number) =>
    request<ApiResponse<AuditLogEntry[]>>(`/eligibility/audit/${workerId}`),
};

// ============================================================
// Alerts API (Phase 5)
// ============================================================
export interface AlertListParams {
  type?: string;
  severity?: string;
  status?: string;
  worker_id?: number;
  page?: number;
  per_page?: number;
}

export const alertsApi = {
  list: (params?: AlertListParams) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return request<ApiResponse<AlertsResponse>>(`/alerts${query ? `?${query}` : ''}`);
  },

  getCounts: () => request<ApiResponse<AlertCounts>>('/alerts/counts'),

  getUnreadCount: () => request<ApiResponse<{ count: number }>>('/alerts/unread-count'),

  markRead: (id: number) =>
    request<ApiResponse<{ message: string }>>(`/alerts/${id}/read`, { method: 'POST' }),

  resolve: (id: number) =>
    request<ApiResponse<{ message: string }>>(`/alerts/${id}/resolve`, { method: 'POST' }),

  dismiss: (id: number) =>
    request<ApiResponse<{ message: string }>>(`/alerts/${id}/dismiss`, { method: 'POST' }),

  generate: () =>
    request<ApiResponse<{ alerts_generated: number }>>('/alerts/generate', { method: 'POST' }),

  markAllRead: () =>
    request<ApiResponse<{ marked_read: number }>>('/alerts/mark-all-read', { method: 'POST' }),

  notifyEligible: (message?: string, sendSms?: boolean) =>
    request<ApiResponse<{ notified: number; skipped: number; errors: number; total_workers: number; sms_configured: boolean; sms_sent: number; sms_failed: number; sms_skipped: number; notified_workers: Array<{ worker_id: number; worker_name: string; eligible_schemes: number; scheme_names: string[]; sms_sent?: boolean; sms_error?: string | null }> }>>(
      '/alerts/notify-eligible',
      { method: 'POST', body: JSON.stringify({ message, send_sms: sendSms }) },
    ),

  getSmsStatus: () =>
    request<ApiResponse<{ configured: boolean; twilio_phone: string | null; message: string }>>('/sms/status'),

  testSms: (phone: string) =>
    request<ApiResponse<{ success: boolean; message_sid?: string; status?: string; error?: string }>>(
      '/sms/test',
      { method: 'POST', body: JSON.stringify({ phone }) },
    ),
};

// ============================================================
// Renewals API (Phase 5)
// ============================================================
export const renewalsApi = {
  getSummary: () => request<ApiResponse<RenewalSummaryItem[]>>('/renewals/summary'),

  getBreakdown: () => request<ApiResponse<RenewalBreakdown>>('/renewals/breakdown'),

  getWorkerDetail: (workerId: number) =>
    request<ApiResponse<WorkerRenewalDetail>>(`/renewals/worker/${workerId}`),

  getConfig: () => request<ApiResponse<RenewalConfig>>('/renewals/config'),

  exportCsv: (params?: { board_id?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return fetch(`${API_BASE}/renewals/export${query ? `?${query}` : ''}`);
  },

  dailyCheck: () =>
    request<ApiResponse<{ alerts_generated: number; breakdown: RenewalBreakdown; critical_workers_count: number }>>('/renewals/daily-check', { method: 'POST' }),

  markRenewed: (workerId: number, data: { new_validity_date: string; performed_by?: string; notes?: string }) =>
    request<ApiResponse<WorkerRenewalDetail>>(`/renewals/worker/${workerId}/renew`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getHistory: () =>
    request<ApiResponse<RenewalHistory[]>>('/renewals/history'),

  getWorkerHistory: (workerId: number) =>
    request<ApiResponse<RenewalHistory[]>>(`/renewals/worker/${workerId}/history`),

  autoReminders: () =>
    request<ApiResponse<{ workers_scanned: number; reminders_created: number }>>('/renewals/auto-reminders', { method: 'POST' }),
};

// ============================================================
// Reminders API (Phase 5 extended)
// ============================================================
export interface ReminderListParams {
  worker_id?: number;
  type?: string;
  status?: string;
  priority?: string;
  page?: number;
  per_page?: number;
}

export const remindersApi = {
  list: (params?: ReminderListParams) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return request<ApiResponse<RemindersResponse>>(`/reminders${query ? `?${query}` : ''}`);
  },

  create: (data: Partial<Reminder>) =>
    request<ApiResponse<Reminder>>('/reminders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getById: (id: number) => request<ApiResponse<Reminder>>(`/reminders/${id}`),

  update: (id: number, data: Partial<Reminder>) =>
    request<ApiResponse<Reminder>>(`/reminders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  complete: (id: number) =>
    request<ApiResponse<{ message: string }>>(`/reminders/${id}/complete`, { method: 'POST' }),

  cancel: (id: number) =>
    request<ApiResponse<{ message: string }>>(`/reminders/${id}/cancel`, { method: 'POST' }),

  delete: (id: number) =>
    request<ApiResponse<{ message: string }>>(`/reminders/${id}`, { method: 'DELETE' }),

  getSummary: () => request<ApiResponse<ReminderSummary>>('/reminders/summary'),

  getOverdue: () => request<ApiResponse<Reminder[]>>('/reminders/overdue'),
};

// ============================================================
// Activities API (Phase 5 extended)
// ============================================================
export const activitiesApi = {
  getWorkerActivities: (workerId: number, params?: { type?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return request<ApiResponse<{ activities: ActivityLog[]; total: number }>>(`/activities/worker/${workerId}${query ? `?${query}` : ''}`);
  },

  getWorkerSummary: (workerId: number) =>
    request<ApiResponse<ActivitySummary>>(`/activities/worker/${workerId}/summary`),

  getRecent: (limit?: number) => {
    const q = limit ? `?limit=${limit}` : '';
    return request<ApiResponse<ActivityLog[]>>(`/activities/recent${q}`);
  },
};

// ============================================================
// Notification Preferences API (Phase 5 extended)
// ============================================================
export const preferencesApi = {
  get: () => request<ApiResponse<NotificationPreferences>>('/notification-preferences'),
  update: (data: Record<string, string>) =>
    request<ApiResponse<{ updated: number }>>('/notification-preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ============================================================
// Settings API (Phase 6)
// ============================================================
export const settingsApi = {
  getAll: () => request<ApiResponse<SettingsByCategory>>('/settings'),

  getByCategory: (category: string) =>
    request<ApiResponse<{ [key: string]: SystemSetting }>>(`/settings/${category}`),

  get: (key: string) => request<ApiResponse<{ key: string; value: string }>>(`/settings/${key}`),

  update: (settings: Record<string, string>) =>
    request<ApiResponse<{ updated: number; message: string }>>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  updateOne: (key: string, value: string) =>
    request<ApiResponse<{ message: string }>>(`/settings/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    }),

  getSystemStats: () => request<ApiResponse<SystemStats>>('/system/stats'),
};

// ============================================================
// Reports API (Phase 6)
// ============================================================
export const reportsApi = {
  getStatistics: () => request<ApiResponse<ReportStatistics>>('/reports/statistics'),

  getApplicants: (params?: { board_id?: number; district?: string; search?: string }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
      });
    }
    const q = sp.toString();
    return request<ApiResponse<Worker[]>>(`/reports/applicants${q ? `?${q}` : ''}`);
  },

  getFamily: () => request<ApiResponse<any[]>>('/reports/family'),

  getSchemes: () => request<ApiResponse<WelfareScheme[]>>('/reports/schemes'),

  getBoardStats: () => request<ApiResponse<BoardStatistic[]>>('/reports/boards'),

  getDistrictStats: () => request<ApiResponse<DistrictStatistic[]>>('/reports/districts'),

  exportCsv: (type: 'applicants' | 'family' | 'schemes') => {
    return fetch(`${API_BASE}/reports/export/${type}`);
  },
};

// ============================================================
// Case Management API (Phase 7)
// ============================================================

export interface CaseListParams {
  status?: string;
  priority?: string;
  board_id?: number;
  scheme_id?: number;
  assigned_to?: string;
  worker_id?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

export interface CreateCaseData {
  worker_id: number;
  title: string;
  scheme_id?: number;
  scheme_variant_id?: number;
  claimant_id?: number;
  claimant_type?: string;
  description?: string;
  priority?: string;
  assigned_to?: string;
  created_by?: string;
  document_checklist?: { document_type: string; document_name: string; required: boolean }[];
}

export interface CaseStatusChangeData {
  status: string;
  reason?: string;
  closure_reason?: string;
}

export const casesApi = {
  list: (params?: CaseListParams) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return request<ApiResponse<CasesResponse>>(`/cases${query ? `?${query}` : ''}`);
  },

  getById: (id: number) => request<ApiResponse<Case>>(`/cases/${id}`),

  create: (data: CreateCaseData) =>
    request<ApiResponse<Case>>('/cases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<Case>) =>
    request<ApiResponse<Case>>(`/cases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changeStatus: (id: number, data: CaseStatusChangeData) =>
    request<ApiResponse<Case>>(`/cases/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reopen: (id: number, reason: string) =>
    request<ApiResponse<Case>>(`/cases/${id}/reopen`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  complete: (id: number) =>
    request<ApiResponse<Case>>(`/cases/${id}/complete`, { method: 'POST' }),

  getStatistics: () => request<ApiResponse<CaseStatistics>>('/cases/statistics'),

  getMetadata: () => request<ApiResponse<CaseMetadata>>('/cases/metadata'),

  checkDuplicate: (data: { worker_id: number; scheme_id?: number; claimant_id?: number }) =>
    request<ApiResponse<DuplicateCheck>>('/cases/check-duplicate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getWorkerCases: (workerId: number) =>
    request<ApiResponse<Case[]>>(`/workers/${workerId}/cases`),

  exportCsv: (params?: { status?: string; priority?: string }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
      });
    }
    const q = sp.toString();
    return fetch(`${API_BASE}/cases/export/csv${q ? `?${q}` : ''}`);
  },

  getExportData: (id: number) =>
    request<ApiResponse<any>>(`/cases/${id}/export`),

  // Documents
  getDocuments: (caseId: number) =>
    request<ApiResponse<CaseDocument[]>>(`/cases/${caseId}/documents`),

  addDocument: (caseId: number, data: { document_type: string; document_name: string; required?: boolean }) =>
    request<ApiResponse<CaseDocument>>(`/cases/${caseId}/documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyDocument: (docId: number, verifiedBy: string, remarks?: string) =>
    request<ApiResponse<CaseDocument>>(`/documents/${docId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ verified_by: verifiedBy, remarks }),
    }),

  rejectDocument: (docId: number, rejectedBy: string, reason: string) =>
    request<ApiResponse<CaseDocument>>(`/documents/${docId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejected_by: rejectedBy, reason }),
    }),

  updateDocumentStatus: (docId: number, status: string) =>
    request<ApiResponse<CaseDocument>>(`/documents/${docId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  // Tasks
  getTasks: (caseId: number) =>
    request<ApiResponse<CaseTask[]>>(`/cases/${caseId}/tasks`),

  createTask: (caseId: number, data: { task_type: string; title: string; description?: string; priority?: string; assigned_to?: string; due_date?: string }) =>
    request<ApiResponse<CaseTask>>(`/cases/${caseId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (taskId: number, data: Partial<CaseTask>) =>
    request<ApiResponse<CaseTask>>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  completeTask: (taskId: number) =>
    request<ApiResponse<CaseTask>>(`/tasks/${taskId}/complete`, { method: 'POST' }),

  cancelTask: (taskId: number) =>
    request<ApiResponse<CaseTask>>(`/tasks/${taskId}/cancel`, { method: 'POST' }),

  getWorkQueue: () => request<ApiResponse<WorkQueue>>('/work-queue'),

  // Notes
  getNotes: (caseId: number) =>
    request<ApiResponse<CaseNote[]>>(`/cases/${caseId}/notes`),

  addNote: (caseId: number, data: { content: string; author?: string; is_internal?: boolean }) =>
    request<ApiResponse<CaseNote>>(`/cases/${caseId}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};