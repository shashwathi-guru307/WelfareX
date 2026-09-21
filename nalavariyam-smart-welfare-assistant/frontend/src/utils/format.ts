// ============================================================
// Formatting utilities — Phase 2 with dark mode support
// ============================================================

/** Format a date or datetime string to a human-readable format */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    // Handle 'YYYY-MM-DD HH:MM:SS' format from SQLite by replacing space with T
    const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Format a datetime string to date + time */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
    const date = new Date(normalized);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/** Mask a phone number for display (show last 4 digits) */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  if (phone.length >= 4) {
    return 'XXXXXX' + phone.slice(-4);
  }
  return phone;
}

/** Get Tailwind classes for registration status badges (light mode) */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    case 'Renewal Due':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    case 'Expiring Soon':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
    case 'Expired':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    case 'Suspended':
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600';
    case 'Cancelled':
      return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/50 dark:text-gray-500 dark:border-gray-600';
    case 'Pending Verification':
    case 'INSUFFICIENT_DATA':
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
    case 'Potentially Applicable':
    case 'ELIGIBLE':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    case 'Review Recommended':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    case 'Requires Verification':
    case 'POTENTIAL_MATCH':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    case 'No Current Match':
    case 'NOT_ELIGIBLE':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    case 'Pending':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    case 'Under Review':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    case 'Approved':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    case 'Rejected':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600';
  }
}

/** Format eligibility status to human-readable label */
export function formatEligibilityStatus(status: string): string {
  switch (status) {
    case 'ELIGIBLE':
      return 'Eligible';
    case 'NOT_ELIGIBLE':
      return 'Not Eligible';
    case 'POTENTIAL_MATCH':
      return 'Potential Match';
    case 'INSUFFICIENT_DATA':
      return 'Insufficient Data';
    default:
      return status;
  }
}

/** Format benefit amount for display */
export function formatBenefitAmount(amount: number | null, unit?: string | null): string {
  if (amount === null || amount === undefined) return 'Amount to be confirmed';
  let formatted = `\u20b9${amount.toLocaleString('en-IN')}`;
  if (unit) {
    formatted += ` (${unit})`;
  }
  return formatted;
}

/** Calculate age from date of birth */
export function calculateAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  try {
    const birth = new Date(dob.includes('T') ? dob : dob.replace(' ', 'T'));
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
}

/** Get initials from a full name (up to 2 characters) */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Format a number with Indian comma system (e.g., 1,23,456) */
export function formatIndianNumber(num: number): string {
  return num.toLocaleString('en-IN');
}

// ============================================================
// Phase 5 — Renewal & Alert Formatting
// ============================================================

/** Get Tailwind classes for urgency level badges */
export function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    case 'LOW':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    case 'NONE':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600';
  }
}

/** Get Tailwind classes for renewal status badges */
export function getRenewalStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    case 'EXPIRING_SOON':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
    case 'EXPIRED':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    case 'NO_RENEWAL_DATE':
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
    case 'UNKNOWN':
      return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600';
  }
}

/** Get human-readable label for renewal status */
export function formatRenewalStatus(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'Active';
    case 'EXPIRING_SOON': return 'Expiring Soon';
    case 'EXPIRED': return 'Expired';
    case 'NO_RENEWAL_DATE': return 'No Renewal Date';
    case 'UNKNOWN': return 'Unknown';
    default: return status;
  }
}

/** Get human-readable label for urgency */
export function formatUrgency(urgency: string): string {
  switch (urgency) {
    case 'CRITICAL': return 'Critical';
    case 'HIGH': return 'High';
    case 'MEDIUM': return 'Medium';
    case 'LOW': return 'Low';
    case 'NONE': return 'None';
    default: return 'Unknown';
  }
}

/** Get Tailwind classes for alert severity */
export function getAlertSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-50 border-l-4 border-red-400 dark:bg-red-900/20 dark:border-red-500';
    case 'high':
      return 'bg-orange-50 border-l-4 border-orange-400 dark:bg-orange-900/20 dark:border-orange-500';
    case 'medium':
      return 'bg-yellow-50 border-l-4 border-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-500';
    case 'low':
      return 'bg-blue-50 border-l-4 border-blue-400 dark:bg-blue-900/20 dark:border-blue-500';
    default:
      return 'bg-gray-50 border-l-4 border-gray-300 dark:bg-gray-800 dark:border-gray-600';
  }
}

/** Get icon color for alert severity */
export function getAlertSeverityIconColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-red-500';
    case 'high': return 'text-orange-500';
    case 'medium': return 'text-yellow-500';
    case 'low': return 'text-blue-500';
    default: return 'text-gray-400';
  }
}

/** Format days remaining/overdue for display */
export function formatDaysRemaining(days: number | null): string {
  if (days === null || days === undefined) return '—';
  if (days < 0) return `${Math.abs(days)} day(s) overdue`;
  if (days === 0) return 'Expires today';
  if (days === 1) return '1 day remaining';
  return `${days} days remaining`;
}

/** Format alert type to human-readable */
export function formatAlertType(type: string): string {
  switch (type) {
    case 'renewal_expired': return 'Registration Expired';
    case 'renewal_expiring_soon': return 'Renewal Expiring Soon';
    case 'renewal_missing': return 'Renewal Info Missing';
    case 'eligibility_match': return 'Eligibility Match';
    case 'eligibility_insufficient_data': return 'Insufficient Data';
    case 'follow_up_required': return 'Follow-up Required';
    case 'document_missing': return 'Document Missing';
    case 'registration_pending': return 'Registration Pending';
    case 'system': return 'System Notice';
    default: return type;
  }
}

// ============================================================
// Phase 5 (extended) — Reminder & Activity Formatting
// ============================================================

/** Get Tailwind classes for reminder priority */
export function getReminderPriorityColor(priority: string): string {
  switch (priority) {
    case 'URGENT':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    case 'LOW':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600';
  }
}

/** Get Tailwind classes for reminder status */
export function getReminderStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600';
  }
}

/** Get human-readable reminder type */
export function formatReminderType(type: string): string {
  switch (type) {
    case 'RENEWAL': return 'Renewal';
    case 'DOCUMENT': return 'Document';
    case 'FOLLOW_UP': return 'Follow-up';
    case 'ELIGIBILITY': return 'Eligibility';
    case 'OTHER': return 'Other';
    default: return type;
  }
}

/** Get icon for reminder type */
export function getReminderTypeIcon(type: string): string {
  switch (type) {
    case 'RENEWAL': return '🔄';
    case 'DOCUMENT': return '📄';
    case 'FOLLOW_UP': return '📞';
    case 'ELIGIBILITY': return '🔍';
    case 'OTHER': return '📌';
    default: return '📌';
  }
}

/** Format days until reminder for display */
export function formatReminderDays(days: number | null): string {
  if (days === null || days === undefined) return '';
  if (days < 0) return `${Math.abs(days)} day(s) overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

// ============================================================
// Phase 7 — Case Management Formatting
// ============================================================

/** Get Tailwind classes for case status badges */
export function getCaseStatusColor(status: string): string {
  switch (status) {
    case 'NEW':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    case 'UNDER_REVIEW':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    case 'DOCUMENTS_PENDING':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
    case 'ELIGIBILITY_REVIEW':
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
    case 'READY_FOR_SUBMISSION':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
    case 'FOLLOW_UP_REQUIRED':
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    case 'CLOSED':
      return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600';
  }
}

/** Get human-readable case status label */
export function formatCaseStatus(status: string): string {
  switch (status) {
    case 'NEW': return 'New';
    case 'UNDER_REVIEW': return 'Under Review';
    case 'DOCUMENTS_PENDING': return 'Documents Pending';
    case 'ELIGIBILITY_REVIEW': return 'Eligibility Review';
    case 'READY_FOR_SUBMISSION': return 'Ready for Submission';
    case 'FOLLOW_UP_REQUIRED': return 'Follow-up Required';
    case 'COMPLETED': return 'Completed';
    case 'REJECTED': return 'Rejected';
    case 'CLOSED': return 'Closed';
    default: return status;
  }
}

/** Get Tailwind classes for case priority */
export function getCasePriorityColor(priority: string): string {
  switch (priority) {
    case 'URGENT':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    case 'LOW':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600';
  }
}

/** Get human-readable priority label */
export function formatCasePriority(priority: string): string {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

/** Get Tailwind classes for case task status */
export function getCaseTaskStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    case 'IN_PROGRESS':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-600';
  }
}

/** Get human-readable task type */
export function formatCaseTaskType(type: string): string {
  switch (type) {
    case 'CALL_APPLICANT': return 'Call Applicant';
    case 'DOCUMENT_COLLECTION': return 'Document Collection';
    case 'DOCUMENT_VERIFICATION': return 'Document Verification';
    case 'ELIGIBILITY_REVIEW': return 'Eligibility Review';
    case 'RENEWAL_FOLLOWUP': return 'Renewal Follow-up';
    case 'SCHEME_REVIEW': return 'Scheme Review';
    case 'OTHER': return 'Other';
    default: return type;
  }
}

/** Get human-readable closure reason */
export function formatClosureReason(reason: string): string {
  switch (reason) {
    case 'BENEFIT_PROCESSED': return 'Benefit Processed';
    case 'NOT_ELIGIBLE': return 'Not Eligible';
    case 'APPLICANT_WITHDREW': return 'Applicant Withdrew';
    case 'DUPLICATE_CASE': return 'Duplicate Case';
    case 'NO_RESPONSE': return 'No Response';
    case 'OTHER': return 'Other';
    default: return reason;
  }
}

/** Get human-readable document status */
export function formatDocumentStatus(status: string): string {
  switch (status) {
    case 'NOT_SUBMITTED': return 'Not Submitted';
    case 'SUBMITTED': return 'Submitted';
    case 'UNDER_VERIFICATION': return 'Under Verification';
    case 'VERIFIED': return 'Verified';
    case 'REJECTED': return 'Rejected';
    case 'NOT_REQUIRED': return 'Not Required';
    default: return status;
  }
}

/** Get Tailwind classes for document status */
export function getDocumentStatusColor(status: string): string {
  switch (status) {
    case 'NOT_SUBMITTED':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400';
    case 'SUBMITTED':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'UNDER_VERIFICATION':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'VERIFIED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'NOT_REQUIRED':
      return 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-500';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400';
  }
}

/** Get step index for case progress visualization */
export function getCaseStepIndex(status: string): number {
  const steps = [
    'NEW', 'UNDER_REVIEW', 'DOCUMENTS_PENDING', 'ELIGIBILITY_REVIEW',
    'READY_FOR_SUBMISSION', 'COMPLETED'
  ];
  return steps.indexOf(status);
}

/** Get case progress steps */
export function getCaseProgressSteps(): { status: string; label: string }[] {
  return [
    { status: 'NEW', label: 'New' },
    { status: 'UNDER_REVIEW', label: 'Under Review' },
    { status: 'DOCUMENTS_PENDING', label: 'Documents' },
    { status: 'ELIGIBILITY_REVIEW', label: 'Eligibility' },
    { status: 'READY_FOR_SUBMISSION', label: 'Ready' },
    { status: 'COMPLETED', label: 'Completed' },
  ];
}
