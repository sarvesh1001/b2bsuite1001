// packages/shared-types/src/attendance.ts

// ========================================================================
// ⚠️ NAMING NOTE
//
// 10 types in this file were originally colliding with `./device.ts`:
//   AttendanceEvent, BatchIngestPayload, BatchStatus, CreateDevicePayload,
//   UpdateDevicePayload, DeviceEnrollment, DeviceStatistics, DeviceToken,
//   IssueTokenPayload, RevokeEnrollmentPayload.
//
// They've been renamed with an `Attendance…` prefix below. If you'd rather
// have attendance OWN these names (and drop them from device.ts), rename
// them back and remove the corresponding exports from device.ts.
// ========================================================================

// ========================================================================
// SHARED ENUMS (must match backend + DB constraints)
// ========================================================================

/** Polymorphic subject type. Mirrors `models.SubjectType*` constants. */
export type AttendanceSubjectType = 'employee' | 'student' | 'customer';

/**
 * Event types accepted by `isValidEventType` in the Go service.
 * Source of truth: `service/admin/admin_service.go` → isValidEventType.
 */
export type AttendanceEventType =
  | 'check_in'
  | 'check_out'
  | 'break_start'
  | 'break_end'
  | 'shift_start'
  | 'shift_end'
  | 'overtime_start'
  | 'overtime_end'
  | 'early_exit'
  | 'late_entry'
  | 'gate_entry'
  | 'gate_exit'
  | 'zone_entry'
  | 'zone_exit'
  | 'class_start'
  | 'class_end'
  | 'session_join'
  | 'session_leave'
  | 'leave_start'
  | 'leave_end'
  | 'absent_marked'
  | 'holiday_marked'
  | 'weekly_off'
  | 'manual_check_in'
  | 'manual_check_out'
  | 'manual_override'
  | 'attendance_adjustment'
  | 'biometric_sync'
  | 'system_generated'
  | 'imported_event'
  | 'missing_punch'
  | 'duplicate_punch'
  | 'invalid_punch'
  | 'policy_violation';

/**
 * Daily attendance status set by the resolution engine.
 *
 * ⚠️ Source of truth is `models/constants.go`.
 *    "leave" is the PAID-leave value (NOT "leave_paid").
 *    "incomplete" and "on_leave" are NOT emitted here.
 */
export type AttendanceDailyStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'half_day'
  | 'leave'
  | 'leave_unpaid'
  | 'holiday'
  | 'weekly_off'
  | 'not_scheduled'
  | 'excused';

/** Session summary statuses (subset of daily). */
export type AttendanceSessionStatus = 'present' | 'absent' | 'late' | 'excused';

/**
 * Canonical source types (from `canonicalSourceRules`).
 * ⚠️ `"rfid"` is deliberately NOT in this list.
 */
export type AttendanceSourceType =
  | 'manual'
  | 'mobile'
  | 'web'
  | 'biometric'
  | 'kiosk'
  | 'classroom'
  | 'auto'
  | 'system'
  | 'correction';

export type CorrectionType =
  | 'manual_check_in'
  | 'manual_check_out'
  | 'attendance_adjustment'
  | 'manual_override';

/** Mirrors `isValidStatus` in the Go service. Superset of daily statuses. */
export type OverrideStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'half_day'
  | 'incomplete'
  | 'weekly_off'
  | 'holiday'
  | 'on_leave'
  | 'not_scheduled';

export type ScheduleOverrideType = 'off' | 'force_work' | 'holiday_override';

export type ScheduleTemplateType = 'office' | 'shift' | 'class';

export type ReportFormat = 'csv' | 'json';
export type ReportStreamFormat = 'csv' | 'jsonl';

/** Batch status values. Renamed to avoid collision with device.ts. */
export type AttendanceBatchStatusValue = 'pending' | 'processed' | 'failed';

// ========================================================================
// EVENT  (models/event.go)
// ========================================================================

export interface AttendanceEventContext {
  work_center_code?: string | null;
  reason?: string | null;
  external_ref?: string | null;
  correction_reason?: string | null;
  session_id?: string | null;
}

export interface AttendanceEventMetadata {
  shift_id?: string | null;
  class_id?: string | null;
  is_auto_generated?: boolean | null;
  is_correction?: boolean | null;
  override_status?: OverrideStatus | string | null;
  corrected_by?: string | null;
}

/**
 * Renamed from `AttendanceEvent` → `AttendancePunchEvent` to avoid
 * collision with the `AttendanceEvent` already exported by `device.ts`.
 */
export interface AttendancePunchEvent {
  attendance_event_id: string;
  company_id: string;
  subject_type: AttendanceSubjectType;
  subject_id: string;
  event_type: AttendanceEventType;
  event_time: string; // RFC3339
  employment_location_id?: string | null;
  geofence_id?: string | null;
  source_type: AttendanceSourceType;
  source_id?: string | null;
  device_id?: string | null;
  device_user_code?: string | null;
  ip_address?: string | null;
  context: AttendanceEventContext;
  metadata: AttendanceEventMetadata;
  /** Serialized raw JSON payload; narrow at the call site. */
  raw_event_payload?: unknown;
  created_at: string;
  created_by?: string | null;
  /** Generated column — date portion of event_time in the event's tz. */
  event_date: string;
}

export interface SearchEventsFilter {
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  subject_type?: AttendanceSubjectType;
  subject_id?: string;
  event_type?: AttendanceEventType;
  source_type?: AttendanceSourceType;
  device_id?: string;
  page?: number;
  page_size?: number;
}

// ========================================================================
// DAILY SUMMARY  (models/summary.go)
// ========================================================================

export interface AttendancePairedEvent {
  check_in_event_id: string;
  check_out_event_id?: string | null;
  check_in_time: string;
  check_out_time?: string | null;
  worked_minutes?: number | null;
  is_auto_closed: boolean;
  anomalies?: string[];
}

export interface AttendanceSummaryMetadata {
  classes_attended?: number | null;
  periods_taken?: number | null;
  shift_id?: string | null;
  policy_id?: string | null;
  work_center_code?: string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  total_checkins?: number | null;
  total_checkouts?: number | null;
  break_minutes?: number | null;
  schedule_status?: string | null;
  timezone?: string | null;
  anomalies?: string[];
  paired_events?: AttendancePairedEvent[];
  leave_type_id?: string | null;
  leave_request_id?: string | null;
  is_leave_paid?: boolean | null;
}

export interface AttendanceDailySummary {
  attendance_summary_id: string;
  company_id: string;
  subject_type: AttendanceSubjectType;
  subject_id: string;
  employment_location_id?: string | null;
  attendance_date: string;
  status: AttendanceDailyStatus;
  worked_minutes?: number | null;
  expected_minutes?: number | null;
  overtime_minutes?: number | null;
  late_minutes?: number | null;
  is_finalized: boolean;
  is_payable: boolean;
  is_payroll_locked: boolean;
  metadata: AttendanceSummaryMetadata;
  generated_at: string;
  generated_by: string;
}

// ========================================================================
// STATS  (models/summary.go)
// ========================================================================

export interface AttendanceStats {
  company_id: string;
  start_date: string;
  end_date: string;
  total_employees: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  half_day_count: number;
  leave_count: number;
  holiday_count: number;
  total_worked_hours: number;
  total_overtime_hours: number;
  average_attendance: number;
}

export interface UserAttendanceStats {
  user_id: string;
  start_date: string;
  end_date: string;
  present_days: number;
  absent_days: number;
  late_days: number;
  half_days: number;
  leave_days: number;
  total_worked_hours: number;
  total_overtime_hours: number;
  average_in_time: string;
  average_out_time: string;
  attendance_percent: number;
}

// ========================================================================
// SESSION SUMMARY  (models/attendance_session_summary.go)
// ========================================================================

/** ⚠️ Go struct has NO json tags today → runtime keys are PascalCase. */
export interface AttendanceSessionSummary {
  summary_id: string;
  company_id: string;
  subject_type: AttendanceSubjectType;
  subject_id: string;
  employment_location_id?: string | null;
  session_id: string;
  session_date: string;
  status: AttendanceSessionStatus;
  marked_at: string;
  marked_by?: string | null;
  source_type: AttendanceSourceType;
  device_id?: string | null;
  is_auto: boolean;
  remarks?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ========================================================================
// EXEMPTIONS  (models/attendance_exemption.go)
// ========================================================================

/** ⚠️ Go struct has NO json tags today → runtime keys are PascalCase. */
export interface AttendanceExemption {
  exemption_id: string;
  company_id: string;
  subject_type: AttendanceSubjectType;
  subject_id: string;
  from_date: string;
  to_date: string;
  reason?: string | null;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface CreateExemptionPayload {
  subject_type: AttendanceSubjectType;
  subject_id: string;
  from_date: string;
  to_date: string;
  reason?: string | null;
  approved_by?: string | null;
}

export interface UpdateExemptionPayload {
  from_date?: string;
  to_date?: string;
  reason?: string | null;
  approved_by?: string | null;
}

export interface ListExemptionsFilter {
  subject_type?: AttendanceSubjectType;
  subject_id?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

// ========================================================================
// CORRECTIONS
// ========================================================================

export interface CreateCorrectionPayload {
  target_user_id: string;
  subject_type?: AttendanceSubjectType;
  business_date: string;
  correction_type: CorrectionType;
  event_time?: string;
  override_status?: OverrideStatus;
  reason: string;
}

// ========================================================================
// RESOLUTIONS
// ========================================================================

export interface ResolveEventPayload {
  event_id: string;
}

export interface ResolveDayPayload {
  user_id: string;
  date: string;
  recalculate?: boolean;
  subject_type?: AttendanceSubjectType;
}

export interface BatchResolvePayload {
  event_ids: string[];
}

export interface BatchResolveByPeriodPayload {
  user_ids: string[];
  start_date: string;
  end_date: string;
  recalculate?: boolean;
  subject_type?: AttendanceSubjectType;
}

// ========================================================================
// REPORTS
// ========================================================================

export interface GenerateReportQuery {
  type?: ReportFormat;
  start_date?: string;
  end_date?: string;
  subject_type?: AttendanceSubjectType;
  subject_id?: string;
  include_events?: boolean;
}

export interface StreamEventsQuery {
  format?: ReportStreamFormat;
  start_date?: string;
  end_date?: string;
  subject_type?: AttendanceSubjectType;
  subject_id?: string;
  event_type?: AttendanceEventType;
  source_type?: AttendanceSourceType;
  device_id?: string;
}

// ========================================================================
// POLICY  (models/policy.go)
// ========================================================================

export interface PolicyRules {
  grace_period?: number | null;
  max_late_allowed?: number | null;
  half_day_after?: number | null;
  auto_checkout?: boolean | null;
  require_work_center?: boolean | null;
  allowed_work_centers?: string[] | null;
  allow_shift_overlap?: boolean | null;
  max_overlap_minutes?: number | null;
  overtime_threshold?: number | null;
  auto_approve_overtime?: boolean | null;
  allowed_source_types?: AttendanceSourceType[] | null;
  allow_self_service?: boolean | null;
  allow_admin_marking?: boolean | null;
  allow_device_marking?: boolean | null;
}

export interface AttendancePolicy {
  policy_id: string;
  company_id: string;
  work_center_code?: string | null;
  position_id?: string | null;
  location_id?: string | null;
  policy_code: string;
  policy_type: string;
  rules: PolicyRules;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePolicyPayload {
  policy_code: string;
  policy_type: string;
  position_id?: string | null;
  work_center_code?: string | null;
  rules: PolicyRules;
  is_active: boolean;
  description?: string | null;
}

export type UpdatePolicyPayload = CreatePolicyPayload;

export interface AssignPolicyPayload {
  user_id?: string;
  policy_id: string;
  effective_from?: string;
  effective_to?: string | null;
  subject_type?: AttendanceSubjectType;
  subject_id?: string;
}

export interface UserAttendancePolicy {
  user_id: string;
  policy_id: string;
  effective_from: string;
  effective_to?: string | null;
  assigned_by?: string | null;
  created_at: string;
  subject_type?: AttendanceSubjectType;
  subject_id?: string | null;
}

// ========================================================================
// RULES  (models/rule.go)
// ========================================================================

export interface CompanyAttendanceRules {
  company_id: string;
  allowed_source_types: AttendanceSourceType[];
  allow_multiple_checkins: boolean;
  timezone: string;
  created_at: string;
}

export interface UpdateCompanyRulesPayload {
  allowed_source_types: AttendanceSourceType[];
  allow_multiple_checkins: boolean;
  timezone?: string;
}

export interface DepartmentAttendanceRules {
  rule_id: string;
  company_id: string;
  department_id: string;
  allowed_source_types: AttendanceSourceType[];
  allowed_event_types: AttendanceEventType[];
  require_location: boolean;
  require_device: boolean;
  created_at: string;
}

export interface UserAttendanceProfile {
  user_id: string;
  company_id: string;
  override_source_types?: AttendanceSourceType[];
  override_event_types?: AttendanceEventType[];
  created_at: string;
}

export interface ResolvedAttendanceRules {
  company_id: string;
  timezone: string;
  allow_multiple_checkins: boolean;
  allow_all_event_types: boolean;
  allowed_source_types: AttendanceSourceType[];
  allowed_event_types: AttendanceEventType[];
  require_location: boolean;
  require_device: boolean;
  require_reference: boolean;
  source_level: string;
  applied_at: string;
  policy_id?: string | null;
  policy_rules?: PolicyRules | null;
  work_center_code?: string | null;
  position_id?: string | null;
  policy_source: string;
}

export interface ResolveRulesQuery {
  user_id?: string;
  work_center_code?: string;
  position_id?: string;
  subject_type?: AttendanceSubjectType;
  date?: string;
}

// ========================================================================
// SOURCES  (models/source.go)
// ========================================================================

export interface AttendanceSource {
  source_id: string;
  company_id: string;
  source_type: AttendanceSourceType;
  name: string;
  reference_type?: string | null;
  reference_id?: string | null;
  is_active: boolean;
  created_at: string;
  created_by?: string | null;
}

export interface AttendanceSourceTypeMeta {
  source_type: AttendanceSourceType;
  description?: string | null;
  category: 'human' | 'device' | 'system';
  requires_device: boolean;
  is_system: boolean;
  allow_backdated: boolean;
  allow_future: boolean;
  trust_level: number;
  is_self_service: boolean;
  created_at: string;
}

export interface CreateSourcePayload {
  source_type: AttendanceSourceType;
  name?: string;
}

export interface UpdateSourceStatusPayload {
  is_active: boolean;
}

// ========================================================================
// EVENT TYPE META  (models/event_type.go)
// ========================================================================

export interface AttendanceEventTypeMeta {
  event_type: AttendanceEventType;
  category: string;
  description?: string | null;
  is_user_triggered: boolean;
  is_system_generated: boolean;
  is_active: boolean;
}

// ========================================================================
// DEVICE  (models/device.go)
// ========================================================================

export interface AttendanceDevice {
  device_id: string;
  company_id: string;
  source_type: AttendanceSourceType;
  device_code: string;
  device_name?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  work_center_code?: string | null;
  geofence_id?: string | null;
  ip_address?: string | null;
  mac_address?: string | null;
  is_active: boolean;
  is_trusted: boolean;
  last_seen_at?: string | null;
  installed_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

/** Renamed from CreateDevicePayload to avoid collision with device.ts. */
export interface CreateAttendanceDevicePayload {
  source_type: AttendanceSourceType;
  device_code: string;
  device_name?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  work_center_code?: string | null;
  geofence_id?: string | null;
  ip_address?: string | null;
  mac_address?: string | null;
  is_active?: boolean;
  installed_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Renamed from UpdateDevicePayload to avoid collision with device.ts. */
export type UpdateAttendanceDevicePayload = Partial<CreateAttendanceDevicePayload>;

export interface DeviceListFilter {
  source_type?: AttendanceSourceType;
  work_center_code?: string;
  geofence_id?: string;
  is_active?: boolean;
  is_trusted?: boolean;
  include_inactive?: boolean;
  page?: number;
  page_size?: number;
}

/** Renamed from DeviceStatistics to avoid collision with device.ts. */
export interface AttendanceDeviceStatistics {
  total_devices: number;
  active_devices: number;
  trusted_devices: number;
  inactive_devices: number;
  by_source_type?: Record<string, number>;
}

export interface DeviceValidationResult {
  is_valid: boolean;
  is_active: boolean;
  is_trusted: boolean;
  device_name: string;
  message?: string;
}

// ========================================================================
// GEOFENCE  (models/geofence.go)
// ========================================================================

export interface Geofence {
  geofence_id: string;
  company_id: string;
  employment_location_id: string;
  name?: string | null;
  location_code?: string | null;
  location_type?: string | null;
  zone?: string | null;
  geo_lat?: number | null;
  geo_lng?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ========================================================================
// DEVICE TOKEN  (models/device_token.go)
// ========================================================================

/** Renamed from DeviceToken to avoid collision with device.ts. */
export interface AttendanceDeviceToken {
  token_id: string;
  company_id: string;
  device_id: string;
  source_type: AttendanceSourceType;
  token_hash: string;
  token_version: number;
  is_active: boolean;
  issued_at: string;
  expires_at?: string | null;
  revoked_at?: string | null;
  issued_by?: string | null;
  revoked_by?: string | null;
  revoke_reason?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface IssueTokenResponse {
  token_id: string;
  device_id: string;
  company_id: string;
  source_type: AttendanceSourceType;
  issued_at: string;
  expires_at?: string | null;
  raw_token: string;
  issued_by: string;
  token_version: number;
}

/** Renamed from IssueTokenPayload to avoid collision with device.ts. */
export interface IssueAttendanceDeviceTokenPayload {
  source_type: AttendanceSourceType;
  expires_in?: number | null;
}

export interface RevokeTokenPayload {
  reason?: string;
}

export interface RevokeAllTokensPayload {
  reason?: string;
}

// ========================================================================
// DEVICE ENROLLMENT  (models/device_enrollment.go)
// ========================================================================

/** Renamed from DeviceEnrollment to avoid collision with device.ts. */
export interface AttendanceDeviceEnrollment {
  mapping_id: string;
  company_id: string;
  subject_type: AttendanceSubjectType;
  subject_id: string;
  device_id: string;
  source_type: AttendanceSourceType;
  device_user_code: string;
  is_active: boolean;
  enrollment_version: number;
  enrolled_at: string;
  unenrolled_at?: string | null;
  revoked_reason?: string | null;
  revoked_by?: string | null;
  created_by?: string | null;
  last_used_at?: string | null;
}

export interface EnrollUserPayload {
  user_id: string;
  device_user_code: string;
  source_type: AttendanceSourceType;
  subject_type?: AttendanceSubjectType;
}

/** Renamed from RevokeEnrollmentPayload to avoid collision with device.ts. */
export interface RevokeAttendanceDeviceEnrollmentPayload {
  device_user_code: string;
  source_type: AttendanceSourceType;
  reason: string;
}

// ========================================================================
// HEARTBEAT
// ========================================================================

export interface DeviceHeartbeatPayload {
  device_time?: string;
  firmware_version?: string;
  ip_address?: string;
}

// ========================================================================
// BATCH
// ========================================================================

export interface OfflinePunchEvent {
  event_type: AttendanceEventType;
  event_time: string;
  external_ref: string;
}

/** Renamed from BatchIngestPayload to avoid collision with device.ts. */
export interface AttendanceBatchIngestPayload {
  batch_ref: string;
  events: OfflinePunchEvent[];
}

export interface AttendanceBatchStatus {
  batch_ref: string;
  status: AttendanceBatchStatusValue;
  total_events: number;
  received_at: string;
  processed_at?: string | null;
  failure_reason?: string | null;
}

export interface AttendancePunchFailure {
  failure_id: string;
  device_user_code?: string | null;
  event_type?: string | null;
  event_time?: string | null;
  failure_reason: string;
  raw_event: Record<string, unknown>;
  created_at: string;
}

// ========================================================================
// BIOMETRIC
// ========================================================================

export interface FaceEmbedding {
  embedding_id: string;
  company_id: string;
  subject_type: AttendanceSubjectType;
  subject_id: string;
  embedding_vector: number[];
  model_version: string;
  is_active: boolean;
  created_at: string;
  created_by?: string | null;
}

export interface EnrollFacePayload {
  subject_type: AttendanceSubjectType;
  subject_id: string;
  embedding_vector: number[];
  model_version: string;
}

export interface FaceActionPayload {
  subject_type: AttendanceSubjectType;
  subject_id: string;
  reason: string;
}

export interface RotateEmbeddingModelPayload {
  embedding_id: string;
  new_version: string;
}

export interface SyncEmbeddingsInput {
  company_id?: string;
  model_version: string;
  since?: string;
  device_id?: string;
}

export interface SyncEmbeddingsResponse {
  embeddings: FaceEmbedding[];
  next_cursor?: string | null;
  model_version: string;
}

// ========================================================================
// WORK CALENDAR  (models/calendar.go)
// ========================================================================

export interface WorkCalendarHoliday {
  date: string;
  name: string;
}

export interface WorkCalendar {
  calendar_id: string;
  company_id: string;
  location_id?: string | null;
  year: number;
  name: string;
  timezone: string;
  working_days: number[];
  holidays: Record<string, WorkCalendarHoliday>;
  is_active: boolean;
  created_at: string;
}

export interface CreateWorkCalendarPayload {
  year: number;
  name: string;
  timezone: string;
  working_days: number[];
  holidays?: WorkCalendarHoliday[];
  location_id?: string | null;
  is_active?: boolean;
}

export interface UpdateWorkCalendarPayload {
  name?: string;
  timezone?: string;
  working_days?: number[];
  holidays?: WorkCalendarHoliday[];
  is_active?: boolean;
}

export interface CalendarAvailability {
  date: string;
  is_working_day: boolean;
  is_holiday: boolean;
  holiday_name?: string;
}

// ========================================================================
// SCHEDULE TEMPLATE  (models/schedule.go)
// ========================================================================

export interface ClassPeriod {
  period: number;
  start: string;
  end: string;
}

export interface TemplateRules {
  start_time?: string | null;
  end_time?: string | null;
  break_minutes?: number | null;
  periods?: ClassPeriod[];
}

export interface ScheduleTemplate {
  schedule_template_id: string;
  company_id: string;
  calendar_id: string;
  location_id?: string | null;
  template_type: ScheduleTemplateType;
  name: string;
  rules: TemplateRules;
  is_active: boolean;
  created_at: string;
}

export interface CreateScheduleTemplatePayload {
  calendar_id: string;
  template_type: ScheduleTemplateType;
  name: string;
  rules: TemplateRules;
  location_id?: string | null;
  is_active?: boolean;
}

export interface UpdateScheduleTemplatePayload {
  name?: string;
  calendar_id?: string;
  template_type?: ScheduleTemplateType;
  rules?: TemplateRules;
  is_active?: boolean;
}

// ========================================================================
// SCHEDULE INSTANCE  (models/schedule.go)
// ========================================================================

export interface InstanceMetadata {
  class_id?: string | null;
  periods?: number | null;
}

export interface ScheduleInstance {
  schedule_instance_id: string;
  company_id: string;
  user_id: string;
  location_id?: string | null;
  schedule_date: string;
  schedule_template_id: string;
  expected_start?: string | null;
  expected_end?: string | null;
  timezone: string;
  metadata: InstanceMetadata;
  work_center_code?: string | null;
  generated_at: string;
  status: string;
  cancel_reason?: string | null;
  cancelled_at?: string | null;
}

export interface CreateScheduleInstancePayload {
  user_id: string;
  schedule_date: string;
  schedule_template_id: string;
  timezone?: string;
  metadata?: InstanceMetadata;
}

export interface UpdateScheduleInstancePayload {
  expected_start?: string;
  expected_end?: string;
  timezone?: string;
  metadata?: InstanceMetadata;
}

export interface CreateScheduleInstanceFromPositionPayload {
  user_id: string;
  date: string;
  timezone?: string;
}

// ========================================================================
// SCHEDULE OVERRIDE  (models/schedule_override.go)
// ========================================================================

export interface ScheduleOverride {
  override_id: string;
  company_id: string;
  user_id: string;
  override_date: string;
  override_type: ScheduleOverrideType;
  reason?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface CreateScheduleOverridePayload {
  user_id: string;
  override_date: string;
  override_type: ScheduleOverrideType;
  reason?: string | null;
}

export interface UpdateScheduleOverridePayload {
  override_type?: ScheduleOverrideType;
  reason?: string | null;
}

// ========================================================================
// USER WORK CENTER ASSIGNMENT  (models/user_work_center_assignment.go)
// ========================================================================

export interface UserWorkCenterAssignment {
  assignment_id: string;
  company_id: string;
  user_id: string;
  work_center_code: string;
  effective_from: string;
  effective_to?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ========================================================================
// USER OFF ENTITLEMENT  (models/user_off_entitlement.go)
// ========================================================================

export interface UserOffEntitlement {
  entitlement_id: string;
  company_id: string;
  user_id: string;
  period_type: string;
  off_count: number;
  requires_approval: boolean;
  effective_from: string;
  effective_to?: string | null;
  created_at: string;
}

// ========================================================================
// OFF REQUEST  (models/off_request.go)
// ========================================================================

export interface OffRequest {
  off_request_id: string;
  company_id: string;
  user_id: string;
  request_dates: string[];
  status: string;
  requested_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
}

// ========================================================================
// WORK CENTER SHIFT  (models/work_center_shift.go)
// ========================================================================

export interface WorkCenterShift {
  mapping_id: string;
  company_id: string;
  work_center_code: string;
  shift_id: string;
  effective_from: string;
  effective_to?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkCenterShiftMappingPayload {
  work_center_code: string;
  shift_id: string;
  effective_from?: string;
  effective_to?: string | null;
}

export interface UpdateWorkCenterShiftMappingPayload {
  work_center_code: string;
  shift_id?: string;
  effective_to?: string;
}

// ========================================================================
// POSITION-BASED RESOLUTION
// ========================================================================

export interface PositionBasedResolvedDay {
  date: string;
  timezone: string;
  is_schedulable: boolean;
  attendance_required: boolean;
  overtime_allowed: boolean;
  expected_start?: string | null;
  expected_end?: string | null;
  position_id?: string | null;
  position_title?: string | null;
  department_id?: string | null;
  work_center_code?: string | null;
  work_center_name?: string | null;
  shift_id?: string | null;
  shift_name?: string | null;
  schedule_instance_id?: string | null;
  schedule_status: string;
  is_override: boolean;
  override_type?: string | null;
  is_on_leave: boolean;
  leave_request_id?: string | null;
  is_leave_paid: boolean;
  leave_type_id?: string | null;
}

// ========================================================================
// SCHEDULING STATS
// ========================================================================

export interface ScheduleInstanceSummary {
  instance_id: string;
  user_id: string;
  schedule_date: string;
  expected_start?: string | null;
  expected_end?: string | null;
  template_name: string;
  template_type: string;
  position_title?: string;
  work_center_code?: string;
}

export interface ScheduleStats {
  total_instances: number;
  total_users: number;
  total_templates: number;
  by_template_type: Record<string, number>;
  by_date: Record<string, number>;
  by_work_center: Record<string, number>;
  upcoming_schedules: ScheduleInstanceSummary[];
}

// ========================================================================
// GENERATE SCHEDULE
// ========================================================================

export interface GenerateSchedulePayload {
  start_date: string;
  end_date: string;
  timezone?: string;
  include_holidays?: boolean;
  overwrite?: boolean;
  batch_size?: number;
}

export interface GenerateScheduleResponse {
  message: string;
  instances: number;
  data: ScheduleInstance[];
}

// ========================================================================
// INGEST (punch payloads)
// ========================================================================

export interface PunchSource {
  source_type: AttendanceSourceType;
  source_id?: string | null;
  device_id?: string | null;
  ip_address?: string | null;
}

export interface SelfPunchPayload {
  event_type: AttendanceEventType;
  subject_type?: AttendanceSubjectType;
  source: PunchSource;
  context?: AttendanceEventContext;
}

export interface TeamPunchPayload {
  target_user_id: string;
  subject_type?: AttendanceSubjectType;
  event_type: AttendanceEventType;
  event_time?: string;
  source: PunchSource;
  context?: AttendanceEventContext;
}

export interface DevicePunchPayload {
  event_type: AttendanceEventType;
  event_time?: string;
  device_user_code: string;
  context?: AttendanceEventContext;
}

// ========================================================================
// RESPONSE ENVELOPES
// ========================================================================

export interface SearchEventsData {
  events: AttendancePunchEvent[];
}

export interface SearchEventsMeta {
  page: number;
  page_size: number;
  total: number;
  totalPages: number;
  has_next: boolean;
  has_prev: boolean;
  date_range: { start: string; end: string };
}

export interface SubjectSummariesData {
  summaries: AttendanceDailySummary[];
  total: number;
}

export interface ListExemptionsData {
  exemptions: AttendanceExemption[];
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  totalPages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ListDevicesData {
  devices: AttendanceDevice[];
}

export interface ListDevicesMeta {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface ListPoliciesData {
  policies: AttendancePolicy[];
  total_count: number;
  company_id: string;
  active_only: boolean;
  position_id: string;
  work_center_code: string;
  current_date: string;
}

// ========================================================================
// SELECTABLE OPTION HELPERS
// ========================================================================

export const ATTENDANCE_DAILY_STATUSES: readonly AttendanceDailyStatus[] = [
  'present',
  'absent',
  'late',
  'half_day',
  'leave',
  'leave_unpaid',
  'holiday',
  'weekly_off',
  'not_scheduled',
  'excused',
] as const;

export const OVERRIDE_STATUSES: readonly OverrideStatus[] = [
  'present',
  'absent',
  'late',
  'half_day',
  'incomplete',
  'weekly_off',
  'holiday',
  'on_leave',
  'not_scheduled',
] as const;

export const PUNCH_EVENT_TYPES: readonly AttendanceEventType[] = [
  'check_in',
  'check_out',
  'break_start',
  'break_end',
  'shift_start',
  'shift_end',
] as const;

export const CANONICAL_SOURCE_TYPES: readonly AttendanceSourceType[] = [
  'manual',
  'mobile',
  'web',
  'biometric',
  'kiosk',
  'classroom',
  'auto',
  'system',
  'correction',
] as const;

export const SCHEDULE_OVERRIDE_TYPES: readonly ScheduleOverrideType[] = [
  'off',
  'force_work',
  'holiday_override',
] as const;

export const ATTENDANCE_SUBJECT_TYPES: readonly AttendanceSubjectType[] = [
  'employee',
  'student',
  'customer',
] as const;