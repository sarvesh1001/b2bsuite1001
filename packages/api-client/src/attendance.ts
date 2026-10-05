// packages/api-client/src/attendance.ts

import {
    // Enums
    AttendanceSubjectType,
    AttendanceEventType,
    AttendanceSourceType,
    CorrectionType,
    ScheduleOverrideType,
  
    // Events
    AttendancePunchEvent,
    SearchEventsFilter,
  
    // Summaries
    AttendanceDailySummary,
    AttendanceStats,
    UserAttendanceStats,
  
    // Sessions
    AttendanceSessionSummary,
  
    // Exemptions
    AttendanceExemption,
    CreateExemptionPayload,
    UpdateExemptionPayload,
    ListExemptionsFilter,
  
    // Corrections
    CreateCorrectionPayload,
  
    // Resolutions
    ResolveEventPayload,
    ResolveDayPayload,
    BatchResolvePayload,
    BatchResolveByPeriodPayload,
  
    // Reports
    GenerateReportQuery,
    StreamEventsQuery,
  
    // Policies & Rules
    AttendancePolicy,
    CreatePolicyPayload,
    UpdatePolicyPayload,
    AssignPolicyPayload,
    CompanyAttendanceRules,
    UpdateCompanyRulesPayload,
    ResolvedAttendanceRules,
    ResolveRulesQuery,
  
    // Sources
    AttendanceSource,
    AttendanceSourceTypeMeta,
    AttendanceEventTypeMeta,
    CreateSourcePayload,
    UpdateSourceStatusPayload,
  
    // Devices
    AttendanceDevice,
    CreateAttendanceDevicePayload,
    UpdateAttendanceDevicePayload,
    DeviceListFilter,
    AttendanceDeviceStatistics,
    Geofence,
  
    // Enrollments
    AttendanceDeviceEnrollment,
    EnrollUserPayload,
    RevokeAttendanceDeviceEnrollmentPayload,
  
    // Tokens
    AttendanceDeviceToken,
    IssueTokenResponse,
    IssueAttendanceDeviceTokenPayload,
    RevokeTokenPayload,
    RevokeAllTokensPayload,
  
    // Heartbeat
    DeviceHeartbeatPayload,
  
    // Batches
    AttendanceBatchIngestPayload,
    AttendanceBatchStatus,
    AttendancePunchFailure,
  
    // Biometric
    FaceEmbedding,
    EnrollFacePayload,
    FaceActionPayload,
    SyncEmbeddingsInput,
    SyncEmbeddingsResponse,
  
    // Scheduling
    WorkCalendar,
    CreateWorkCalendarPayload,
    UpdateWorkCalendarPayload,
    CalendarAvailability,
    ScheduleTemplate,
    CreateScheduleTemplatePayload,
    UpdateScheduleTemplatePayload,
    ScheduleInstance,
    CreateScheduleInstancePayload,
    UpdateScheduleInstancePayload,
    CreateScheduleInstanceFromPositionPayload,
    ScheduleOverride,
    CreateScheduleOverridePayload,
    UpdateScheduleOverridePayload,
    WorkCenterShift,
    CreateWorkCenterShiftMappingPayload,
    UpdateWorkCenterShiftMappingPayload,
    ScheduleStats,
    GenerateSchedulePayload,
    GenerateScheduleResponse,
  
    // Ingest
    SelfPunchPayload,
    TeamPunchPayload,
    DevicePunchPayload,
  
    // Envelope
    ApiResponse,
  } from '@b2b/shared-types';
  import { axiosInstance } from './axios-instance';
  import {
    idempotentPost,
    idempotentPut,
    idempotentDelete,
  } from './idempotency';
  
  // ============================================================
  // HEADER HELPERS
  // ============================================================
  
  const getBaseHeaders = (
    companyId: string,
    deviceId: string,
    accessToken: string,
  ): Record<string, string> => ({
    'X-Company-ID': companyId,
    'X-Device-ID': deviceId,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  });
  
  const getWriteHeaders = (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId?: string,
  ): Record<string, string> => {
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId && locationId !== 'ALL') {
      headers['X-Location-ID'] = locationId;
    }
    return headers;
  };
  
  const ATTENDANCE_BASE = (companyId: string) =>
    `/companies/${companyId}/attendance`;
  
  const DEVICE_BASE = (companyId: string) =>
    `/companies/${companyId}/attendance-device`;
  
  const ACADEMIC_BASE = (companyId: string) =>
    `/companies/${companyId}/academics/biometric-device`;
  
  // ============================================================
  // 1. SELF & TEAM PUNCHES
  // ============================================================
  
  export const selfPunch = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: SelfPunchPayload,
  ): Promise<ApiResponse<AttendancePunchEvent>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/self/punch`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<AttendancePunchEvent>>(
      url, payload, `selfPunch:${companyId}:${deviceId}`, { headers },
    );
  };
  
  export const teamPunch = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: TeamPunchPayload,
  ): Promise<ApiResponse<AttendancePunchEvent>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/punch`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<AttendancePunchEvent>>(
      url, payload, `teamPunch:${companyId}:${payload.target_user_id}`, { headers },
    );
  };
  
  // ============================================================
  // 2. EVENTS
  // ============================================================
  
  export const searchEvents = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string | undefined,
    filter: SearchEventsFilter,
  ): Promise<ApiResponse<{ events: AttendancePunchEvent[] }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/events/search`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers, params: filter });
    return response.data;
  };
  
  export const getEvent = async (
    companyId: string,
    eventId: string,
    deviceId: string,
    accessToken: string,
    locationId?: string,
  ): Promise<ApiResponse<AttendancePunchEvent>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/events/${eventId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  // ============================================================
  // 3. DAILY SUMMARIES & STATS
  // ============================================================
  
  export const getDailySummary = async (
    companyId: string,
    subjectType: AttendanceSubjectType,
    subjectId: string,
    date: string,
    deviceId: string,
    accessToken: string,
    locationId?: string,
  ): Promise<ApiResponse<AttendanceDailySummary>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/summary/${subjectType}/${subjectId}/${date}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const listSubjectSummaries = async (
    companyId: string,
    subjectType: AttendanceSubjectType,
    subjectId: string,
    deviceId: string,
    accessToken: string,
    params: { start_date: string; end_date: string },
    locationId?: string,
  ): Promise<ApiResponse<{ summaries: AttendanceDailySummary[]; total: number }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/summaries/${subjectType}/${subjectId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getCompanyStats = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string | undefined,
    params: { start_date: string; end_date: string },
  ): Promise<ApiResponse<AttendanceStats>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/stats/company`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getSubjectStats = async (
    companyId: string,
    subjectType: AttendanceSubjectType,
    subjectId: string,
    deviceId: string,
    accessToken: string,
    params: { start_date: string; end_date: string },
    locationId?: string,
  ): Promise<ApiResponse<UserAttendanceStats>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/stats/subject/${subjectType}/${subjectId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  // ============================================================
  // 4. SESSION SUMMARIES
  // ============================================================
  
  export const listSessionSummaries = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string | undefined,
    params: {
      subject_type?: AttendanceSubjectType;
      subject_id?: string;
      session_id?: string;
      session_date?: string;
      status?: string;
      page?: number;
      page_size?: number;
    },
  ): Promise<ApiResponse<AttendanceSessionSummary[]>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/session-summaries`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getSessionSummary = async (
    companyId: string,
    sessionId: string,
    deviceId: string,
    accessToken: string,
    params: { subject_type: AttendanceSubjectType; subject_id: string },
    locationId?: string,
  ): Promise<ApiResponse<AttendanceSessionSummary>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/session-summary/${sessionId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  // ============================================================
  // 5. EXEMPTIONS
  // ============================================================
  
  export const createExemption = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: CreateExemptionPayload,
  ): Promise<ApiResponse<AttendanceExemption>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/exemptions`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<AttendanceExemption>>(
      url, payload, `createExemption:${companyId}:${payload.subject_id}`, { headers },
    );
  };
  
  export const updateExemption = async (
    companyId: string,
    exemptionId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: UpdateExemptionPayload,
  ): Promise<ApiResponse<AttendanceExemption>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/exemptions/${exemptionId}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPut<ApiResponse<AttendanceExemption>>(
      url, payload, `updateExemption:${companyId}:${exemptionId}`, { headers },
    );
  };
  
  export const deleteExemption = async (
    companyId: string,
    exemptionId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/exemptions/${exemptionId}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentDelete<ApiResponse<{ message: string }>>(
      url, {}, `deleteExemption:${companyId}:${exemptionId}`, { headers },
    );
  };
  
  export const listExemptions = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string | undefined,
    filter: ListExemptionsFilter,
  ): Promise<ApiResponse<{ exemptions: AttendanceExemption[] }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/exemptions`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers, params: filter });
    return response.data;
  };
  
  // ============================================================
  // 6. CORRECTIONS
  // ============================================================
  
  export const createCorrection = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: CreateCorrectionPayload,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/corrections`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, payload,
      `createCorrection:${companyId}:${payload.target_user_id}:${payload.business_date}:${payload.correction_type}`,
      { headers },
    );
  };
  
  // ============================================================
  // 7. RESOLUTIONS
  // ============================================================
  
  export const resolveEvent = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: ResolveEventPayload,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/resolve/event`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, payload, `resolveEvent:${companyId}:${payload.event_id}`, { headers },
    );
  };
  
  export const resolveDay = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: ResolveDayPayload,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/resolve/day`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, payload, `resolveDay:${companyId}:${payload.user_id}:${payload.date}`, { headers },
    );
  };
  
  export const resolveDayByPath = async (
    companyId: string,
    userId: string,
    date: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    params?: { recalculate?: boolean; subject_type?: AttendanceSubjectType },
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/resolve/day/${userId}/${date}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, {}, `resolveDayByPath:${companyId}:${userId}:${date}`, { headers, params },
    );
  };
  
  export const batchResolveEvents = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: BatchResolvePayload,
  ): Promise<ApiResponse<{ message: string; data: { processed_count: number } }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/resolve/batch`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string; data: { processed_count: number } }>>(
      url, payload, `batchResolveEvents:${companyId}:${payload.event_ids.length}`, { headers },
    );
  };
  
  export const resolveByPeriod = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: BatchResolveByPeriodPayload,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/resolve/period`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, payload,
      `resolveByPeriod:${companyId}:${payload.user_ids.length}:${payload.start_date}:${payload.end_date}`,
      { headers },
    );
  };
  
  // ============================================================
  // 8. REPORTS
  // ============================================================
  
  export const generateReport = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string | undefined,
    query: GenerateReportQuery,
  ): Promise<Blob> => {
    const url = `${ATTENDANCE_BASE(companyId)}/reports`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, {
      headers, params: query, responseType: 'blob',
    });
    return response.data;
  };
  
  export const streamEvents = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string | undefined,
    query: StreamEventsQuery,
  ): Promise<Blob> => {
    const url = `${ATTENDANCE_BASE(companyId)}/reports/stream`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, {
      headers, params: query, responseType: 'blob',
    });
    return response.data;
  };
  
  // ============================================================
  // 9. ADMIN — POLICIES
  // ============================================================
  
  export const createPolicy = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: CreatePolicyPayload,
  ): Promise<ApiResponse<AttendancePolicy>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/admin/policies`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<AttendancePolicy>>(
      url, payload, `createPolicy:${companyId}:${payload.policy_code}`, { headers },
    );
  };
  
  export const listPolicies = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { include_inactive?: boolean; position_id?: string; work_center_code?: string },
  ): Promise<ApiResponse<{
    policies: AttendancePolicy[];
    total_count: number;
    company_id: string;
    active_only: boolean;
    current_date: string;
  }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/admin/policies`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getPolicy = async (
    companyId: string,
    policyId: string,
    deviceId: string,
    accessToken: string,
  ): Promise<ApiResponse<AttendancePolicy>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/admin/policies/${policyId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const updatePolicy = async (
    companyId: string,
    policyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: UpdatePolicyPayload,
  ): Promise<ApiResponse<AttendancePolicy>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/admin/policies/${policyId}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPut<ApiResponse<AttendancePolicy>>(
      url, payload, `updatePolicy:${companyId}:${policyId}`, { headers },
    );
  };
  
  export const deletePolicy = async (
    companyId: string,
    policyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/admin/policies/${policyId}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentDelete<ApiResponse<{ message: string }>>(
      url, {}, `deletePolicy:${companyId}:${policyId}`, { headers },
    );
  };
  
  export const assignPolicy = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: AssignPolicyPayload,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/admin/assign-policy`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    const id = payload.subject_id ?? payload.user_id ?? 'na';
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, payload, `assignPolicy:${companyId}:${id}:${payload.policy_id}`, { headers },
    );
  };
  
  // ============================================================
  // 10. ADMIN — RULES
  // ============================================================
  
  export const getCompanyRules = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
  ): Promise<ApiResponse<CompanyAttendanceRules>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/admin/rules/company`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const updateCompanyRules = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: UpdateCompanyRulesPayload,
  ): Promise<ApiResponse<CompanyAttendanceRules>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/admin/rules/company`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPut<ApiResponse<CompanyAttendanceRules>>(
      url, payload, `updateCompanyRules:${companyId}`, { headers },
    );
  };
  
  export const getResolvedRules = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    query: ResolveRulesQuery,
  ): Promise<ApiResponse<ResolvedAttendanceRules>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/admin/rules/resolve`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params: query });
    return response.data;
  };
  
  // ============================================================
  // 11. ADMIN — SOURCES
  // ============================================================
  
  export const listSources = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { active_only?: boolean },
  ): Promise<ApiResponse<AttendanceSource[]>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/admin/sources`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const createSource = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: CreateSourcePayload,
  ): Promise<ApiResponse<AttendanceSource>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/admin/sources`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<AttendanceSource>>(
      url, payload, `createSource:${companyId}:${payload.source_type}`, { headers },
    );
  };
  
  export const updateSourceStatus = async (
    companyId: string,
    sourceType: AttendanceSourceType,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: UpdateSourceStatusPayload,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/admin/sources/${sourceType}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPut<ApiResponse<{ message: string }>>(
      url, payload, `updateSourceStatus:${companyId}:${sourceType}`, { headers },
    );
  };
  
  // ============================================================
  // 12. META — EVENT & SOURCE TYPES
  // ============================================================
  
  export const listEventTypes = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { include_inactive?: boolean },
  ): Promise<ApiResponse<AttendanceEventTypeMeta[]>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/event-types`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const listSourceTypes = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
  ): Promise<ApiResponse<AttendanceSourceTypeMeta[]>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/source-types`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  // ============================================================
  // 13. DEVICES  (renamed to avoid collision with ./device)
  // ============================================================
  
  export const attendanceCreateDevice = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: CreateAttendanceDevicePayload,
  ): Promise<ApiResponse<AttendanceDevice>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<AttendanceDevice>>(
      url, payload, `createDevice:${companyId}:${payload.device_code}`, { headers },
    );
  };
  
  export const attendanceListDevices = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string | undefined,
    filter?: DeviceListFilter,
  ): Promise<ApiResponse<{ devices: AttendanceDevice[] }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers, params: filter });
    return response.data;
  };
  
  export const attendanceGetDevice = async (
    companyId: string,
    targetDeviceId: string,
    deviceId: string,
    accessToken: string,
    locationId?: string,
  ): Promise<ApiResponse<AttendanceDevice>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices/${targetDeviceId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const attendanceUpdateDevice = async (
    companyId: string,
    targetDeviceId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: UpdateAttendanceDevicePayload,
  ): Promise<ApiResponse<AttendanceDevice>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices/${targetDeviceId}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPut<ApiResponse<AttendanceDevice>>(
      url, payload, `updateDevice:${companyId}:${targetDeviceId}`, { headers },
    );
  };
  
  export const attendanceDeleteDevice = async (
    companyId: string,
    targetDeviceId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices/${targetDeviceId}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentDelete<ApiResponse<{ message: string }>>(
      url, {}, `deleteDevice:${companyId}:${targetDeviceId}`, { headers },
    );
  };
  
  export const attendanceActivateDevice = async (
    companyId: string,
    targetDeviceId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices/${targetDeviceId}/activate`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, {}, `activateDevice:${companyId}:${targetDeviceId}`, { headers },
    );
  };
  
  export const attendanceDeactivateDevice = async (
    companyId: string,
    targetDeviceId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices/${targetDeviceId}/deactivate`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, {}, `deactivateDevice:${companyId}:${targetDeviceId}`, { headers },
    );
  };
  
  export const markDeviceTrusted = async (
    companyId: string,
    targetDeviceId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices/${targetDeviceId}/trust`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, {}, `trustDevice:${companyId}:${targetDeviceId}`, { headers },
    );
  };
  
  export const attendanceRevokeDeviceTrust = async (
    companyId: string,
    targetDeviceId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices/${targetDeviceId}/revoke-trust`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, {}, `revokeTrust:${companyId}:${targetDeviceId}`, { headers },
    );
  };
  
  export const getDeviceStatistics = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
  ): Promise<ApiResponse<AttendanceDeviceStatistics>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices/stats`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const deviceHealthCheck = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
  ): Promise<ApiResponse<{ status: string; timestamp: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices/health`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  // ============================================================
  // 14. DEVICE ENROLLMENTS  (renamed to avoid collision)
  // ============================================================
  
  export const enrollUser = async (
    companyId: string,
    targetDeviceId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: EnrollUserPayload,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices/${targetDeviceId}/enrollments`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, payload,
      `enrollUser:${companyId}:${targetDeviceId}:${payload.device_user_code}`,
      { headers },
    );
  };
  
  export const attendanceRevokeEnrollment = async (
    companyId: string,
    targetDeviceId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: RevokeAttendanceDeviceEnrollmentPayload,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices/${targetDeviceId}/enrollments`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentDelete<ApiResponse<{ message: string }>>(
      url, payload,
      `revokeEnrollment:${companyId}:${targetDeviceId}:${payload.device_user_code}`,
      { headers },
    );
  };
  
  export const attendanceUnrevokeEnrollment = async (
    companyId: string,
    targetDeviceId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: RevokeAttendanceDeviceEnrollmentPayload,
  ): Promise<ApiResponse<{ message: string; enrollment: AttendanceDeviceEnrollment }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices/${targetDeviceId}/enrollments/unrevoke`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string; enrollment: AttendanceDeviceEnrollment }>>(
      url, payload,
      `unrevokeEnrollment:${companyId}:${targetDeviceId}:${payload.device_user_code}`,
      { headers },
    );
  };
  
  export const listDeviceEnrollments = async (
    companyId: string,
    targetDeviceId: string,
    deviceId: string,
    accessToken: string,
    locationId?: string,
  ): Promise<ApiResponse<AttendanceDeviceEnrollment[]>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices/${targetDeviceId}/enrollments`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const listRevokedDeviceEnrollments = async (
    companyId: string,
    targetDeviceId: string,
    deviceId: string,
    accessToken: string,
    locationId?: string,
  ): Promise<ApiResponse<AttendanceDeviceEnrollment[]>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices/${targetDeviceId}/enrollments/revoked`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  // ============================================================
  // 15. DEVICE TOKENS  (renamed to avoid collision)
  // ============================================================
  
  export const attendanceIssueDeviceToken = async (
    companyId: string,
    targetDeviceId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: IssueAttendanceDeviceTokenPayload,
  ): Promise<ApiResponse<IssueTokenResponse>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices/${targetDeviceId}/tokens`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<IssueTokenResponse>>(
      url, payload,
      `issueToken:${companyId}:${targetDeviceId}:${payload.source_type}`,
      { headers },
    );
  };
  
  export const attendanceGetCurrentDeviceToken = async (
    companyId: string,
    targetDeviceId: string,
    deviceId: string,
    accessToken: string,
  ): Promise<ApiResponse<AttendanceDeviceToken | null>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices/${targetDeviceId}/tokens/current`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const revokeDeviceToken = async (
    companyId: string,
    targetDeviceId: string,
    tokenId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload?: RevokeTokenPayload,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices/${targetDeviceId}/tokens/${tokenId}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentDelete<ApiResponse<{ message: string }>>(
      url, payload ?? {},
      `revokeToken:${companyId}:${tokenId}`,
      { headers },
    );
  };
  
  export const revokeAllDeviceTokens = async (
    companyId: string,
    targetDeviceId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload?: RevokeAllTokensPayload,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/devices/${targetDeviceId}/tokens/revoke-all`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, payload ?? {},
      `revokeAllTokens:${companyId}:${targetDeviceId}`,
      { headers },
    );
  };
  
  // ============================================================
  // 16. SCHEDULING — CALENDARS
  // ============================================================
  
  export const listWorkCalendars = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string | undefined,
  ): Promise<ApiResponse<WorkCalendar[]>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/calendars`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const createWorkCalendar = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: CreateWorkCalendarPayload,
  ): Promise<ApiResponse<WorkCalendar>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/calendars`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<WorkCalendar>>(
      url, payload, `createWorkCalendar:${companyId}:${payload.year}:${payload.name}`,
      { headers },
    );
  };
  
  export const getWorkCalendar = async (
    companyId: string,
    calendarId: string,
    deviceId: string,
    accessToken: string,
  ): Promise<ApiResponse<WorkCalendar>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/calendars/${calendarId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const updateWorkCalendar = async (
    companyId: string,
    calendarId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: UpdateWorkCalendarPayload,
  ): Promise<ApiResponse<WorkCalendar>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/calendars/${calendarId}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPut<ApiResponse<WorkCalendar>>(
      url, payload, `updateWorkCalendar:${companyId}:${calendarId}`, { headers },
    );
  };
  
  export const deleteWorkCalendar = async (
    companyId: string,
    calendarId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/calendars/${calendarId}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentDelete<ApiResponse<{ message: string }>>(
      url, {}, `deleteWorkCalendar:${companyId}:${calendarId}`, { headers },
    );
  };
  
  export const getCalendarAvailability = async (
    companyId: string,
    calendarId: string,
    deviceId: string,
    accessToken: string,
    params: { start_date: string; end_date: string },
  ): Promise<ApiResponse<CalendarAvailability[]>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/calendars/${calendarId}/availability`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const addHolidayToCalendar = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: { calendar_id: string; date: string; name: string },
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/holidays`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, payload,
      `addHoliday:${companyId}:${payload.calendar_id}:${payload.date}`,
      { headers },
    );
  };
  
  export const processHolidayForDate = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: { date: string },
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/holidays/process`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, payload, `processHoliday:${companyId}:${payload.date}`, { headers },
    );
  };
  
  // ============================================================
  // 17. SCHEDULING — TEMPLATES
  // ============================================================
  
  export const listScheduleTemplates = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string | undefined,
    params?: { active_only?: boolean },
  ): Promise<ApiResponse<ScheduleTemplate[]>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/templates`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const createScheduleTemplate = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: CreateScheduleTemplatePayload,
  ): Promise<ApiResponse<ScheduleTemplate>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/templates`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<ScheduleTemplate>>(
      url, payload, `createTemplate:${companyId}:${payload.name}:${payload.calendar_id}`,
      { headers },
    );
  };
  
  export const getScheduleTemplate = async (
    companyId: string,
    templateId: string,
    deviceId: string,
    accessToken: string,
  ): Promise<ApiResponse<ScheduleTemplate>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/templates/${templateId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const updateScheduleTemplate = async (
    companyId: string,
    templateId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: UpdateScheduleTemplatePayload,
  ): Promise<ApiResponse<ScheduleTemplate>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/templates/${templateId}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPut<ApiResponse<ScheduleTemplate>>(
      url, payload, `updateTemplate:${companyId}:${templateId}`, { headers },
    );
  };
  
  export const deleteScheduleTemplate = async (
    companyId: string,
    templateId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/templates/${templateId}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentDelete<ApiResponse<{ message: string }>>(
      url, {}, `deleteTemplate:${companyId}:${templateId}`, { headers },
    );
  };
  
  // ============================================================
  // 18. SCHEDULING — INSTANCES
  // ============================================================
  
  export const listScheduleInstances = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string | undefined,
    params: {
      user_id?: string;
      template_id?: string;
      position_id?: string;
      work_center_code?: string;
      start_date: string;
      end_date: string;
    },
  ): Promise<ApiResponse<ScheduleInstance[]>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/instances`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const createScheduleInstance = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: CreateScheduleInstancePayload,
  ): Promise<ApiResponse<ScheduleInstance>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/instances`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<ScheduleInstance>>(
      url, payload,
      `createInstance:${companyId}:${payload.user_id}:${payload.schedule_date}`,
      { headers },
    );
  };
  
  export const getScheduleInstance = async (
    companyId: string,
    instanceId: string,
    deviceId: string,
    accessToken: string,
  ): Promise<ApiResponse<ScheduleInstance>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/instances/${instanceId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const updateScheduleInstance = async (
    companyId: string,
    instanceId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: UpdateScheduleInstancePayload,
  ): Promise<ApiResponse<ScheduleInstance>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/instances/${instanceId}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPut<ApiResponse<ScheduleInstance>>(
      url, payload, `updateInstance:${companyId}:${instanceId}`, { headers },
    );
  };
  
  export const deleteScheduleInstance = async (
    companyId: string,
    instanceId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/instances/${instanceId}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentDelete<ApiResponse<{ message: string }>>(
      url, {}, `deleteInstance:${companyId}:${instanceId}`, { headers },
    );
  };
  
  export const createScheduleInstanceFromPosition = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: CreateScheduleInstanceFromPositionPayload,
  ): Promise<ApiResponse<ScheduleInstance>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/position-based/instances`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<ScheduleInstance>>(
      url, payload,
      `createInstanceFromPosition:${companyId}:${payload.user_id}:${payload.date}`,
      { headers },
    );
  };
  
  export const getUserScheduledPosition = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    params?: { date?: string },
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/position-based/users/${userId}/position`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getUserCurrentAssignment = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    params?: { date?: string },
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/position-based/users/${userId}/current`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  // ============================================================
  // 19. SCHEDULING — GENERATE
  // ============================================================
  
  export const generateScheduleForUser = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: GenerateSchedulePayload,
  ): Promise<ApiResponse<GenerateScheduleResponse>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/generate/user/${userId}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<GenerateScheduleResponse>>(
      url, payload,
      `genScheduleUser:${companyId}:${userId}:${payload.start_date}:${payload.end_date}`,
      { headers },
    );
  };
  
  export const generateScheduleForCompany = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: GenerateSchedulePayload,
  ): Promise<ApiResponse<GenerateScheduleResponse>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/generate/company`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<GenerateScheduleResponse>>(
      url, payload,
      `genScheduleCompany:${companyId}:${payload.start_date}:${payload.end_date}`,
      { headers },
    );
  };
  
  // ============================================================
  // 20. SCHEDULING — OVERRIDES
  // ============================================================
  
  export const listScheduleOverrides = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string | undefined,
    params: {
      user_id?: string;
      start_date: string;
      end_date: string;
      override_type?: ScheduleOverrideType;
    },
  ): Promise<ApiResponse<ScheduleOverride[]>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/overrides`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const createScheduleOverride = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: CreateScheduleOverridePayload,
  ): Promise<ApiResponse<ScheduleOverride>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/overrides`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<ScheduleOverride>>(
      url, payload,
      `createOverride:${companyId}:${payload.user_id}:${payload.override_date}`,
      { headers },
    );
  };
  
  export const getScheduleOverride = async (
    companyId: string,
    overrideId: string,
    deviceId: string,
    accessToken: string,
  ): Promise<ApiResponse<ScheduleOverride>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/overrides/${overrideId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const updateScheduleOverride = async (
    companyId: string,
    overrideId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: UpdateScheduleOverridePayload,
  ): Promise<ApiResponse<ScheduleOverride>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/overrides/${overrideId}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPut<ApiResponse<ScheduleOverride>>(
      url, payload, `updateOverride:${companyId}:${overrideId}`, { headers },
    );
  };
  
  export const deleteScheduleOverride = async (
    companyId: string,
    overrideId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/overrides/${overrideId}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentDelete<ApiResponse<{ message: string }>>(
      url, {}, `deleteOverride:${companyId}:${overrideId}`, { headers },
    );
  };
  
  // ============================================================
  // 21. SCHEDULING — WORK CENTER SHIFTS
  // ============================================================
  
  export const getWorkCenterShifts = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params: { work_center_code: string; date?: string },
  ): Promise<ApiResponse<WorkCenterShift[]>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/work-centers/${params.work_center_code}/shifts`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, {
      headers, params: { date: params.date },
    });
    return response.data;
  };
  
  export const createWorkCenterShiftMapping = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: CreateWorkCenterShiftMappingPayload,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/work-center-shifts`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, payload,
      `createWCShift:${companyId}:${payload.work_center_code}:${payload.shift_id}`,
      { headers },
    );
  };
  
  export const updateWorkCenterShiftMapping = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: UpdateWorkCenterShiftMappingPayload,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/work-center-shifts`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPut<ApiResponse<{ message: string }>>(
      url, payload,
      `updateWCShift:${companyId}:${payload.work_center_code}:${payload.effective_to ?? ''}`,
      { headers },
    );
  };
  
  // ============================================================
  // 22. SCHEDULING — STATS & AVAILABILITY
  // ============================================================
  
  export const getScheduleStats = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string | undefined,
    params?: { start_date?: string; end_date?: string },
  ): Promise<ApiResponse<ScheduleStats>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/reports/stats`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const checkScheduleAvailability = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params: { user_id: string; date: string; timezone?: string },
  ): Promise<ApiResponse<{
    user_id: string;
    date: string;
    timezone: string;
    schedule_times: string[];
  }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/availability/check`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const validateScheduleConflict = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params: {
      user_id: string;
      start_time: string;
      end_time: string;
      timezone?: string;
      exclude_instance_id?: string;
    },
  ): Promise<ApiResponse<{ has_conflict: boolean }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/availability/conflict-check`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const schedulingHealthCheck = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
  ): Promise<ApiResponse<{ status: string; service: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/scheduling/health`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  // ============================================================
  // 23. DEVICE-AUTHENTICATED ROUTES
  // ============================================================
  
  const getDeviceHeaders = (
    companyId: string,
    deviceToken: string,
  ): Record<string, string> => ({
    'X-Company-ID': companyId,
    Authorization: `Bearer ${deviceToken}`,
    'Content-Type': 'application/json',
  });
  
  export const devicePunch = async (
    companyId: string,
    deviceToken: string,
    payload: DevicePunchPayload,
  ): Promise<ApiResponse<AttendancePunchEvent>> => {
    const url = `${DEVICE_BASE(companyId)}/events/punch`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    return idempotentPost<ApiResponse<AttendancePunchEvent>>(
      url, payload,
      `devicePunch:${companyId}:${payload.device_user_code}:${payload.event_time ?? ''}`,
      { headers },
    );
  };
  
  export const attendanceIngestBatch = async (
    companyId: string,
    deviceToken: string,
    payload: AttendanceBatchIngestPayload,
  ): Promise<ApiResponse<{ message: string; batch_ref: string }>> => {
    const url = `${DEVICE_BASE(companyId)}/batch/ingest`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    return idempotentPost<ApiResponse<{ message: string; batch_ref: string }>>(
      url, payload, `ingestBatch:${companyId}:${payload.batch_ref}`, { headers },
    );
  };
  
  export const attendanceGetBatchStatus = async (
    companyId: string,
    deviceToken: string,
    batchRef: string,
  ): Promise<ApiResponse<AttendanceBatchStatus>> => {
    const url = `${DEVICE_BASE(companyId)}/batch/${batchRef}/status`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const attendanceGetBatchFailures = async (
    companyId: string,
    deviceToken: string,
    batchRef: string,
    params?: { limit?: number; offset?: number },
  ): Promise<ApiResponse<{ batch_ref: string; count: number; failures: AttendancePunchFailure[] }>> => {
    const url = `${DEVICE_BASE(companyId)}/batch/${batchRef}/failures`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const attendanceSendHeartbeat = async (
    companyId: string,
    deviceToken: string,
    payload: DeviceHeartbeatPayload,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${DEVICE_BASE(companyId)}/device/heartbeat`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, payload,
      `heartbeat:${companyId}:${payload.device_time ?? Date.now()}`,
      { headers },
    );
  };
  
  export const syncEmbeddings = async (
    companyId: string,
    deviceToken: string,
    payload: SyncEmbeddingsInput,
  ): Promise<ApiResponse<SyncEmbeddingsResponse>> => {
    const url = `${DEVICE_BASE(companyId)}/biometric/sync`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    return idempotentPost<ApiResponse<SyncEmbeddingsResponse>>(
      url, payload, `syncEmbeddings:${companyId}:${payload.model_version}`, { headers },
    );
  };
  
  export const fullBiometricSync = async (
    companyId: string,
    deviceToken: string,
    targetDeviceId: string,
    params: { model_version: string },
  ): Promise<ApiResponse<SyncEmbeddingsResponse>> => {
    const url = `${DEVICE_BASE(companyId)}/biometric/full/${targetDeviceId}`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const incrementalBiometricSync = async (
    companyId: string,
    deviceToken: string,
    targetDeviceId: string,
    params: { model_version: string; since: string },
  ): Promise<ApiResponse<SyncEmbeddingsResponse>> => {
    const url = `${DEVICE_BASE(companyId)}/biometric/incremental/${targetDeviceId}`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const resetBiometricDevice = async (
    companyId: string,
    deviceToken: string,
    targetDeviceId: string,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${DEVICE_BASE(companyId)}/biometric/reset/${targetDeviceId}`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, {}, `resetBiometric:${companyId}:${targetDeviceId}`, { headers },
    );
  };
  
  export const biometricHealthCheck = async (
    companyId: string,
    deviceToken: string,
  ): Promise<ApiResponse<{ status: string; service: string }>> => {
    const url = `${DEVICE_BASE(companyId)}/biometric/health`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const deviceEnrollFace = async (
    companyId: string,
    deviceToken: string,
    payload: EnrollFacePayload,
  ): Promise<ApiResponse<FaceEmbedding>> => {
    const url = `${DEVICE_BASE(companyId)}/biometric/enroll`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    return idempotentPost<ApiResponse<FaceEmbedding>>(
      url, payload,
      `deviceEnrollFace:${companyId}:${payload.subject_id}:${payload.model_version}`,
      { headers },
    );
  };
  
  export const deviceReEnrollFace = async (
    companyId: string,
    deviceToken: string,
    payload: EnrollFacePayload,
  ): Promise<ApiResponse<FaceEmbedding>> => {
    const url = `${DEVICE_BASE(companyId)}/biometric/re-enroll`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    return idempotentPost<ApiResponse<FaceEmbedding>>(
      url, payload,
      `deviceReEnrollFace:${companyId}:${payload.subject_id}`,
      { headers },
    );
  };
  
  export const deviceDeactivateFace = async (
    companyId: string,
    deviceToken: string,
    payload: FaceActionPayload,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${DEVICE_BASE(companyId)}/biometric/deactivate`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, payload,
      `deviceDeactivateFace:${companyId}:${payload.subject_id}`,
      { headers },
    );
  };
  
  export const deviceActivateFace = async (
    companyId: string,
    deviceToken: string,
    payload: FaceActionPayload,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${DEVICE_BASE(companyId)}/biometric/activate`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, payload,
      `deviceActivateFace:${companyId}:${payload.subject_id}`,
      { headers },
    );
  };
  
  export const getFaceEmbedding = async (
    companyId: string,
    deviceToken: string,
    subjectType: AttendanceSubjectType,
    subjectId: string,
  ): Promise<ApiResponse<FaceEmbedding>> => {
    const url = `${DEVICE_BASE(companyId)}/biometric/embedding/${subjectType}/${subjectId}`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const listActiveFaceEmbeddings = async (
    companyId: string,
    deviceToken: string,
  ): Promise<ApiResponse<FaceEmbedding[]>> => {
    const url = `${DEVICE_BASE(companyId)}/biometric/embeddings`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  // ============================================================
  // 24. ACADEMIC-SPECIFIC DEVICE ROUTES
  // ============================================================
  
  export const academicSyncEmbeddings = async (
    companyId: string,
    deviceToken: string,
    payload: SyncEmbeddingsInput,
  ): Promise<ApiResponse<SyncEmbeddingsResponse>> => {
    const url = `${ACADEMIC_BASE(companyId)}/sync`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    return idempotentPost<ApiResponse<SyncEmbeddingsResponse>>(
      url, payload, `academicSync:${companyId}:${payload.model_version}`, { headers },
    );
  };
  
  export const academicFullSync = async (
    companyId: string,
    deviceToken: string,
    targetDeviceId: string,
    params: { model_version: string },
  ): Promise<ApiResponse<SyncEmbeddingsResponse>> => {
    const url = `${ACADEMIC_BASE(companyId)}/full/${targetDeviceId}`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    return idempotentPost<ApiResponse<SyncEmbeddingsResponse>>(
      url, {}, `academicFull:${companyId}:${targetDeviceId}`, { headers, params },
    );
  };
  
  export const academicResetDevice = async (
    companyId: string,
    deviceToken: string,
    targetDeviceId: string,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ACADEMIC_BASE(companyId)}/reset/${targetDeviceId}`;
    const headers = getDeviceHeaders(companyId, deviceToken);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, {}, `academicReset:${companyId}:${targetDeviceId}`, { headers },
    );
  };
  
  // ============================================================
  // META helpers
  // ============================================================
  
  export const geofenceHelpers = {
    isSameGeofence: (a?: Geofence | null, b?: Geofence | null): boolean =>
      !!a && !!b && a.geofence_id === b.geofence_id,
  };


  // ============================================================
// ADMIN — BIOMETRIC
// These hit /attendance/admin/biometric/* (admin JWT, not device token)
// ============================================================

export const adminListFaceEmbeddings = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId?: string,
  ): Promise<ApiResponse<FaceEmbedding[]>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/admin/biometric/embeddings`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const adminGetFaceEmbedding = async (
    companyId: string,
    subjectType: AttendanceSubjectType,
    subjectId: string,
    deviceId: string,
    accessToken: string,
    locationId?: string,
  ): Promise<ApiResponse<FaceEmbedding>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/admin/biometric/embedding/${subjectType}/${subjectId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    if (locationId) headers['X-Location-ID'] = locationId;
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const adminDeactivateFace = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: FaceActionPayload,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/admin/biometric/deactivate`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, payload,
      `adminDeactivateFace:${companyId}:${payload.subject_id}`,
      { headers },
    );
  };
  
  export const adminActivateFace = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: FaceActionPayload,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/admin/biometric/activate`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, payload,
      `adminActivateFace:${companyId}:${payload.subject_id}`,
      { headers },
    );
  };
  
  export const adminRotateEmbeddingModel = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
    payload: { embedding_id: string; new_version: string },
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/admin/biometric/rotate`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, payload,
      `adminRotateEmbedding:${companyId}:${payload.embedding_id}`,
      { headers },
    );
  };
  
  export const adminForceDeviceResync = async (
    companyId: string,
    targetDeviceId: string,
    deviceId: string,
    accessToken: string,
    locationId: string,
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `${ATTENDANCE_BASE(companyId)}/admin/biometric/force-resync/${targetDeviceId}`;
    const headers = getWriteHeaders(companyId, deviceId, accessToken, locationId);
    return idempotentPost<ApiResponse<{ message: string }>>(
      url, {},
      `adminForceResync:${companyId}:${targetDeviceId}`,
      { headers },
    );
  };