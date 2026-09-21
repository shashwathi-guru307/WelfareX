// ============================================================
// TypeScript Types/Interfaces for Nalavariyam Smart Welfare Assistant (Phases 2-4)
// ============================================================

// --- Welfare Board ---
export interface WelfareBoard {
  id: number;
  name: string;
  description: string | null;
  is_active: number;
  registration_requirements: string | null;
  created_at: string;
  updated_at: string;
  worker_count?: number;
  active_registrations?: number;
}

// --- Scheme Category ---
export interface SchemeCategory {
  id: number;
  name: string;
  description: string | null;
  display_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  scheme_count?: number;
}

// --- Family Member ---
export interface FamilyMember {
  id: number;
  worker_id: number;
  name: string;
  relationship: string;
  date_of_birth: string | null;
  age?: number | null;
  gender: 'Male' | 'Female' | 'Other' | null;
  mobile_number: string | null;
  education_level: string | null;
  occupation: string | null;
  marital_status: string | null;
  has_disability: number;
  disability_details: string | null;
  disability_type: string | null;
  disability_percentage: number | null;
  disability_certificate_available: number;
  is_dependent: number;
  is_employed: number;
  monthly_income: number | null;
  is_currently_studying: number;
  course_or_class: string | null;
  institution_name: string | null;
  academic_year: string | null;
  aadhaar_hash: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// --- Education Record ---
export interface EducationRecord {
  id: number;
  worker_id: number;
  family_member_id: number | null;
  family_member_name?: string | null;
  relationship?: string | null;
  education_level: string;
  course: string | null;
  institution: string | null;
  board_university: string | null;
  year_of_study: string | null;
  is_currently_studying: number;
  percentage_cgpa: string | null;
  year_of_completion: string | null;
  created_at: string;
  updated_at: string;
}

// --- Worker / Applicant (Phase 2 expanded) ---
export interface Worker {
  id: number;
  full_name: string;
  father_husband_name: string | null;
  date_of_birth: string;
  gender: 'Male' | 'Female' | 'Other' | 'Transgender';
  mobile_number: string | null;
  alternate_mobile: string | null;
  address: string | null;
  district: string | null;
  taluk: string | null;
  village_town: string | null;
  pincode: string | null;
  aadhaar_hash: string | null;
  ration_card_number: string | null;
  reference_id: string | null;
  nature_of_work: string | null;
  occupation: string | null;
  worker_category: string | null;
  board_id: number | null;
  board_name: string | null;
  education_level: string | null;
  marital_status: string | null;
  has_disability: number;
  disability_details: string | null;
  is_active: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
  // Computed fields
  age?: number | null;
  renewal_summary?: string | null;
  // Joined from registration
  registration_id?: number | null;
  registration_number?: string | null;
  registration_date?: string | null;
  validity_date?: string | null;
  renewal_date?: string | null;
  registration_status?: string | null;
  // Related records
  registrations?: Registration[];
  family_members?: FamilyMember[];
  education_records?: EducationRecord[];
  scheme_applications?: SchemeApplication[];
}

// --- Registration ---
export interface Registration {
  id: number;
  worker_id: number;
  board_id: number;
  registration_number: string;
  registration_date: string;
  validity_date: string;
  renewal_date: string | null;
  next_renewal_date: string | null;
  status: 'Active' | 'Renewal Due' | 'Expiring Soon' | 'Expired' | 'Suspended' | 'Pending Verification' | 'Cancelled';
  notes: string | null;
  board_name?: string;
  days_until_renewal?: number | null;
  computed_status?: string | null;
  created_at: string;
  updated_at: string;
}

// --- Welfare Scheme (Phase 3 expanded) ---
export interface WelfareScheme {
  id: number;
  scheme_code: string | null;
  name: string;
  category_id: number | null;
  board_id: number | null;
  description: string | null;
  benefit_description: string | null;
  amount_details: string | null;
  eligibility_summary: string | null;
  qualification_text: string | null;
  claimant_type: string | null;
  max_usage: number | null;
  required_documents: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  category_name?: string | null;
  board_name?: string | null;
  available_boards?: number;
  qualification_count?: number;
  board_benefits?: SchemeBenefit[];
  qualifications?: SchemeQualification[];
  scheme_rules?: SchemeRule[];
  eligibility_rules?: EligibilityRule[];
}

// --- Board-Specific Benefit (Phase 3) ---
export interface SchemeBenefit {
  id: number;
  scheme_id: number;
  board_id: number;
  qualification_id: number | null;
  benefit_type: string;
  amount: string | null;
  amount_numeric: number | null;
  amount_unit: string | null;
  is_available: number;
  description: string | null;
  board_name?: string | null;
  qualification_text?: string | null;
  education_level?: string | null;
  education_type?: string | null;
  sort_order?: number | null;
  created_at: string;
  updated_at: string;
}

// --- Scheme Qualification Variant (Phase 3) ---
export interface SchemeQualification {
  id: number;
  scheme_id: number;
  sort_order: number;
  qualification_text: string;
  description: string | null;
  education_level: string | null;
  education_type: string | null;
  claimant_type: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// --- Scheme Rule (Phase 3) ---
export interface SchemeRule {
  id: number;
  scheme_id: number;
  qualification_id: number | null;
  rule_type: string;
  field: string;
  operator: string;
  value: string;
  value_type: string;
  description: string | null;
  priority: number;
  is_active: number;
  created_at: string;
}

// --- Eligibility Rule ---
export interface EligibilityRule {
  id: number;
  scheme_id: number;
  rule_name: string;
  rule_type: string;
  rule_value: string;
  operator: string;
  is_mandatory: number;
  priority: number;
  description: string | null;
  created_at: string;
}

// --- Scheme Application ---
export interface SchemeApplication {
  id: number;
  worker_id: number;
  scheme_id: number;
  application_date: string;
  status: 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Cancelled';
  eligibility_status: string | null;
  eligibility_reasons: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  scheme_name?: string;
  category_name?: string;
}

// --- Eligibility Evaluation Result ---
export interface EligibilityRuleResult {
  rule_name: string;
  rule_type: string;
  passed: boolean;
  reason: string;
  is_mandatory: boolean;
}

export interface EligibilityResult {
  worker_id: number;
  scheme_id: number;
  scheme_name?: string;
  worker_name?: string;
  status: 'Potentially Applicable' | 'Review Recommended' | 'Requires Verification' | 'No Current Match' | 'Error';
  reasons: string[];
  rule_results: EligibilityRuleResult[];
  total_rules?: number;
  passed_rules?: number;
  mandatory_rules?: number;
  mandatory_passed?: number;
  disclaimer: string;
}

// --- Dashboard (Phase 3 expanded) ---
export interface DashboardStats {
  total_registered_workers: number;
  total_family_members: number;
  active_registrations: number;
  renewals_due_soon: number;
  expired_registrations: number;
  pending_verification: number;
  potential_scheme_matches: number;
  pending_reviews: number;
  renewals_7d: number;
  renewals_30d: number;
  renewals_90d: number;
  overdue_registrations: number;
  recent_workers: Worker[];
  upcoming_renewals: any[];
  board_distribution: { name: string; worker_count: number }[];
  district_distribution: { district: string; worker_count: number }[];
  category_distribution: { worker_category: string; worker_count: number }[];
  scheme_category_stats: { category_name: string; scheme_count: number }[];
  family_with_children: number;
  education_records: number;
  total_schemes?: number;
  available_benefits?: number;
  potential_benefits?: number;
  renewal_breakdown?: RenewalBreakdown;
  alert_counts?: AlertCounts;
}

// --- API Response Wrapper ---
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
  message?: string;
}

// --- Paginated Response ---
export interface PaginatedResponse<T> {
  workers: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ============================================================
// Phase 4 — Eligibility Analysis Engine Types
// ============================================================

export type EligibilityStatus = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'POTENTIAL_MATCH' | 'INSUFFICIENT_DATA';

export interface EligibilityRuleDetail {
  rule_id?: number;
  rule_type: string;
  field: string;
  passed: boolean;
  status?: 'matched' | 'failed' | 'missing_info';
  reason: string;
  is_mandatory: boolean;
}

export interface SchemeEligibilityResult {
  scheme_id: number;
  scheme_name: string;
  scheme_code: string;
  category_name: string;
  claimant_id: number;
  claimant_name: string;
  claimant_type: string;
  claimant_relationship: string;
  board_id: number | null;
  board_name: string;
  variant_id: number | null;
  variant_name: string;
  status: EligibilityStatus;
  benefit_amount: number | null;
  benefit_amount_display: string;
  benefit_unit: string | null;
  matched_rules: EligibilityRuleDetail[];
  failed_rules: EligibilityRuleDetail[];
  missing_information: EligibilityRuleDetail[];
  explanation: string;
  verification_required: boolean;
  source_info: string;
  disclaimer: string;
}

export interface FamilyMemberAnalysis {
  family_member: {
    id: number;
    name: string;
    relationship: string;
    date_of_birth: string;
    age: number | null;
    gender: string;
    education_level: string | null;
    is_dependent: number;
    is_currently_studying: number;
  };
  results: SchemeEligibilityResult[];
}

export interface AnalysisSummary {
  total_schemes_evaluated: number;
  potential_benefits: number;
  eligible_matches: number;
  not_eligible: number;
  insufficient_data: number;
  worker_potential_benefits: number;
  family_potential_benefits: number;
}

export interface WorkerProfile {
  id: number;
  full_name: string;
  gender: string;
  date_of_birth: string;
  age: number | null;
  board_name: string | null;
  board_id: number | null;
  occupation: string | null;
  worker_category: string | null;
  registration_status: string;
  registration_active: boolean;
  registration_number: string | null;
  registration_date: string | null;
  has_disability: number;
}

export interface EligibilityAnalysis {
  success: boolean;
  worker_id: number;
  worker_name: string;
  worker: WorkerProfile;
  family_members_count: number;
  summary: AnalysisSummary;
  worker_results: SchemeEligibilityResult[];
  family_results: FamilyMemberAnalysis[];
  disclaimer: string;
  engine_version: string;
  analysis_date: string;
}

export interface AuditLogEntry {
  id: number;
  worker_id: number;
  analysis_date: string;
  engine_version: string;
  total_schemes: number;
  eligible_count: number;
  potential_count: number;
  not_eligible: number;
  insufficient: number;
  family_members_evaluated: number;
}

// ============================================================
// Phase 5 — Renewal Intelligence, Alerts & Notification Types
// ============================================================

export type RenewalStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_RENEWAL_DATE' | 'UNKNOWN';
export type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' | 'unknown';

export interface Alert {
  id: number;
  worker_id: number | null;
  type: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'read' | 'resolved' | 'dismissed';
  created_at: string;
  due_at: string | null;
  read_at: string | null;
  resolved_at: string | null;
  metadata: string | null;
  worker_name?: string | null;
  district?: string | null;
  board_name?: string | null;
}

export interface AlertsResponse {
  alerts: Alert[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AlertCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface RenewalSummaryItem {
  worker_id: number;
  full_name: string;
  district: string | null;
  worker_category: string | null;
  board_name: string | null;
  registration_number: string | null;
  registration_date: string | null;
  validity_date: string | null;
  renewal_date: string | null;
  db_status: string | null;
  days_until_renewal: number | null;
  urgency: UrgencyLevel;
  computed_status: RenewalStatus;
  description: string;
  is_overdue: boolean;
  is_due_soon: boolean;
}

export interface RenewalBreakdown {
  active: number;
  expiring_soon: number;
  expired: number;
  no_registration: number;
  missing_date: number;
  critical: number;
  high: number;
  missing_renewal_date: number;
  total_needing_attention: number;
}

export interface WorkerRenewalDetail {
  registration_id: number;
  registration_number: string;
  board_name: string | null;
  registration_date: string | null;
  validity_date: string | null;
  renewal_date: string | null;
  status: string;
  days_until_renewal: number | null;
  urgency: UrgencyLevel;
  computed_status: RenewalStatus;
  description: string;
  is_overdue: boolean;
  is_due_soon: boolean;
}

export interface RenewalConfig {
  alert_days: number;
  critical_days: number;
  high_days: number;
  medium_days: number;
  low_days: number;
}

// Phase 12 — Renewal History
export interface RenewalHistory {
  id: number;
  worker_id: number;
  registration_id: number | null;
  old_validity_date: string | null;
  new_validity_date: string | null;
  old_renewal_date: string | null;
  new_renewal_date: string | null;
  action: 'RENEWED' | 'INITIAL' | 'EXTENDED' | 'CORRECTED' | 'CANCELLED';
  performed_by: string | null;
  notes: string | null;
  created_at: string;
  worker_name?: string | null;
}

// Add Phase 5 fields to DashboardStats
declare module '../types' {
  interface DashboardStats {
    renewal_breakdown?: RenewalBreakdown;
    alert_counts?: AlertCounts;
  }
}

// Add Phase 5 computed fields to Worker
export interface WorkerWithRenewal extends Worker {
  urgency?: UrgencyLevel;
  days_until_renewal?: number | null;
  renewal_detail?: WorkerRenewalDetail | null;
}

// ============================================================
// Phase 5 (extended) — Reminders, Activities, Preferences, Reports
// ============================================================

export type ReminderType = 'RENEWAL' | 'DOCUMENT' | 'FOLLOW_UP' | 'ELIGIBILITY' | 'OTHER';
export type ReminderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type ReminderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Reminder {
  id: number;
  worker_id: number | null;
  title: string;
  description: string | null;
  reminder_type: ReminderType;
  reminder_date: string;
  priority: ReminderPriority;
  status: ReminderStatus;
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  metadata: string | null;
  worker_name?: string | null;
  // Computed fields
  is_overdue?: boolean;
  days_until?: number | null;
}

export interface RemindersResponse {
  reminders: Reminder[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ReminderSummary {
  total_pending: number;
  overdue: number;
  due_today: number;
  due_tomorrow: number;
  due_this_week: number;
  completed_today: number;
}

export interface ActivityLog {
  id: number;
  worker_id: number;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: string | null;
  created_at: string;
  worker_name?: string | null;
  // Computed fields
  icon?: string;
  formatted_date?: string;
  formatted_time?: string;
  relative_time?: string;
}

export interface ActivitySummary {
  total: number;
  today: ActivityLog[];
  yesterday: ActivityLog[];
  by_date: Record<string, ActivityLog[]>;
}

export interface NotificationPreferences {
  [key: string]: {
    value: string;
    description: string;
  };
}

// ============================================================
// Phase 6 — Settings & Reports Types
// ============================================================

export interface SystemSetting {
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string;
  updated_at?: string;
}

export interface SettingsByCategory {
  [category: string]: {
    [key: string]: SystemSetting;
  };
}

export interface SystemStats {
  total_applicants: number;
  total_family_members: number;
  total_schemes: number;
  total_alerts: number;
  total_reminders: number;
  total_activities: number;
  total_boards: number;
  total_education_records: number;
}

export interface ReportStatistics {
  total_applicants: number;
  active_registrations: number;
  expired_registrations: number;
  total_family_members: number;
  total_schemes: number;
  pending_reminders: number;
  unread_alerts: number;
  board_distribution: { name: string; count: number }[];
  district_distribution: { district: string; count: number }[];
  occupation_distribution: { occupation: string; count: number }[];
}

export interface BoardStatistic {
  id: number;
  name: string;
  total_workers: number;
  active: number;
  expired: number;
  family_members: number;
}

export interface DistrictStatistic {
  district: string;
  total_workers: number;
  active: number;
  expired: number;
  family_members: number;
}

// --- Constants / Enums ---
export const REGISTRATION_STATUSES = [
  'Active', 'Renewal Due', 'Expiring Soon', 'Expired', 'Suspended', 'Pending Verification', 'Cancelled'
] as const;

export const RELATIONSHIP_TYPES = [
  'Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Other Dependent'
] as const;

export const EDUCATION_LEVELS = [
  'No Formal Education', 'Primary', 'Secondary', 'Higher Secondary',
  'Diploma', 'Undergraduate', 'Postgraduate', 'PhD', 'Other'
] as const;

export const GENDER_OPTIONS = ['Male', 'Female', 'Transgender', 'Other'] as const;

export const MARITAL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Divorced', 'Separated'] as const;

// ============================================================
// Phase 7 — Case Management Types
// ============================================================

export type CaseStatus =
  | 'NEW' | 'UNDER_REVIEW' | 'DOCUMENTS_PENDING' | 'ELIGIBILITY_REVIEW'
  | 'READY_FOR_SUBMISSION' | 'FOLLOW_UP_REQUIRED'
  | 'COMPLETED' | 'REJECTED' | 'CLOSED';

export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type CaseClaimantType = 'WORKER' | 'FAMILY_MEMBER';

export type CaseClosureReason =
  | 'BENEFIT_PROCESSED' | 'NOT_ELIGIBLE' | 'APPLICANT_WITHDREW'
  | 'DUPLICATE_CASE' | 'NO_RESPONSE' | 'OTHER';

export type CaseDocumentStatus =
  | 'NOT_SUBMITTED' | 'SUBMITTED' | 'UNDER_VERIFICATION'
  | 'VERIFIED' | 'REJECTED' | 'NOT_REQUIRED';

export type CaseTaskType =
  | 'CALL_APPLICANT' | 'DOCUMENT_COLLECTION' | 'DOCUMENT_VERIFICATION'
  | 'ELIGIBILITY_REVIEW' | 'RENEWAL_FOLLOWUP' | 'SCHEME_REVIEW' | 'OTHER';

export type CaseTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface CaseDocument {
  id: number;
  case_id: number;
  document_type: string;
  document_name: string;
  required: number;
  status: CaseDocumentStatus;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  uploaded_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseTask {
  id: number;
  case_id: number;
  task_type: CaseTaskType;
  title: string;
  description: string | null;
  status: CaseTaskStatus;
  priority: CasePriority;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  is_overdue?: boolean;
}

export interface CaseNote {
  id: number;
  case_id: number;
  author: string;
  content: string;
  is_internal: number;
  created_at: string;
}

export interface CaseActivity {
  id: number;
  case_id: number;
  activity_type: string;
  title: string;
  description: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: string | null;
  created_at: string;
  icon?: string;
  formatted_date?: string;
  formatted_time?: string;
}

export interface CaseDocumentSummary {
  total: number;
  required: number;
  verified: number;
  required_verified: number;
  completeness: number;
  all_required_verified: boolean;
}

export interface CaseReadiness {
  ready: boolean;
  missing: string[];
  missing_count: number;
}

export interface Case {
  id: number;
  case_number: string;
  worker_id: number;
  scheme_id: number | null;
  scheme_variant_id: number | null;
  claimant_id: number | null;
  claimant_type: CaseClaimantType;
  title: string;
  description: string | null;
  status: CaseStatus;
  priority: CasePriority;
  assigned_to: string | null;
  assigned_at: string | null;
  assignment_notes: string | null;
  opened_at: string;
  updated_at: string;
  closed_at: string | null;
  created_by: string | null;
  created_at: string;
  closure_reason: CaseClosureReason | null;
  // Joined fields
  worker_name?: string;
  worker_district?: string;
  worker_mobile?: string;
  board_name?: string;
  scheme_name?: string;
  scheme_code?: string;
  variant_name?: string;
  claimant_name?: string;
  claimant_relationship?: string;
  // Related data
  documents?: CaseDocument[];
  document_summary?: CaseDocumentSummary;
  tasks?: CaseTask[];
  notes?: CaseNote[];
  activities?: CaseActivity[];
  readiness?: CaseReadiness;
}

export interface CasesResponse {
  cases: Case[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CaseStatistics {
  total_cases: number;
  status_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
  new_cases: number;
  under_review: number;
  documents_pending: number;
  follow_up_required: number;
  completed: number;
  rejected: number;
  closed: number;
  ready_for_submission: number;
  eligibility_review: number;
  urgent_cases: number;
  high_priority: number;
  overdue_tasks: number;
  pending_tasks: number;
  inactive_cases: number;
}

export interface CaseMetadata {
  statuses: string[];
  valid_transitions: Record<string, string[]>;
  task_types: string[];
  closure_reasons: string[];
  document_statuses: string[];
  priority_levels: string[];
}

export interface WorkQueue {
  overdue: (CaseTask & { case_number: string; case_title: string; worker_name: string })[];
  due_today: (CaseTask & { case_number: string; case_title: string; worker_name: string })[];
  pending: (CaseTask & { case_number: string; case_title: string; worker_name: string })[];
}

export interface DuplicateCheck {
  duplicate: boolean;
  case_number?: string;
  status?: string;
  title?: string;
}

// --- Worker Note ---
export interface WorkerNote {
  id: number;
  worker_id: number;
  content: string;
  author: string;
  is_internal: number;
  created_at: string;
  updated_at: string;
}

// --- Constants / Enums ---
export const CASE_STATUSES: CaseStatus[] = [
  'NEW', 'UNDER_REVIEW', 'DOCUMENTS_PENDING', 'ELIGIBILITY_REVIEW',
  'READY_FOR_SUBMISSION', 'FOLLOW_UP_REQUIRED', 'COMPLETED', 'REJECTED', 'CLOSED'
];

export const CASE_PRIORITIES: CasePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export const CASE_TASK_TYPES: CaseTaskType[] = [
  'CALL_APPLICANT', 'DOCUMENT_COLLECTION', 'DOCUMENT_VERIFICATION',
  'ELIGIBILITY_REVIEW', 'RENEWAL_FOLLOWUP', 'SCHEME_REVIEW', 'OTHER'
];

export const CASE_CLOSURE_REASONS: CaseClosureReason[] = [
  'BENEFIT_PROCESSED', 'NOT_ELIGIBLE', 'APPLICANT_WITHDREW',
  'DUPLICATE_CASE', 'NO_RESPONSE', 'OTHER'
];

export const TAMIL_NADU_DISTRICTS = [
  'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore',
  'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram',
  'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam',
  'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram',
  'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur',
  'Theni', 'Tiruchirappalli', 'Tirunelveli', 'Tirupattur', 'Tiruppur',
  'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram',
  'Virudhunagar'
] as const;
