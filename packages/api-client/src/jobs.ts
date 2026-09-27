// packages/api-client/src/jobs.ts

import {
    Job,
    CreateJobPayload,
    UpdateJobPayload,
    ListJobsParams,
    ListJobsResponse,
    JobPositionCountResponse,
    ApiResponse,
  } from '@b2b/shared-types';
  import { axiosInstance } from './axios-instance';
  import {
    idempotentPost,
    idempotentPatch,
    idempotentDelete,
  } from './idempotency';
  
  // ---------- helper: base headers ----------
  const getBaseHeaders = (
    companyId: string,
    deviceId: string,
    accessToken: string,
  ) => ({
    'X-Company-ID': companyId,
    'X-Device-ID': deviceId,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  });
  
  // ============================================================
  // List jobs
  //
  // GET /companies/{cid}/jobs?active_only=true
  //
  // The list envelope wraps `jobs` + a small meta block. Use
  // `active_only=false` when you want to show deactivated jobs
  // (e.g. an admin "recycle" view).
  // ============================================================
  export const listJobs = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: ListJobsParams,
  ): Promise<ApiResponse<ListJobsResponse>> => {
    const url = `/companies/${companyId}/jobs`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get<ApiResponse<ListJobsResponse>>(
      url,
      {
        headers,
        params: {
          // Send explicit true/false so the backend default is overridden
          // predictably from the client.
          active_only: params?.active_only ?? true,
        },
      },
    );
    return response.data;
  };
  
  // ============================================================
  // Get job by ID
  //
  // GET /companies/{cid}/jobs/{jid}
  // ============================================================
  export const getJob = async (
    companyId: string,
    deviceId: string,
    jobId: string,
    accessToken: string,
  ): Promise<ApiResponse<Job>> => {
    const url = `/companies/${companyId}/jobs/${jobId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get<ApiResponse<Job>>(url, {
      headers,
    });
    return response.data;
  };
  
  // ============================================================
  // Create job
  //
  // POST /companies/{cid}/jobs
  //
  // `job_code` is OPTIONAL on the wire — when omitted the backend
  // derives it from `job_title` (uppercased, non-alphanumerics →
  // underscore). Explicit codes are validated against
  // `^[A-Z][A-Z0-9_]{0,49}$`.
  //
  // Defaults applied by the backend when omitted:
  //   is_schedulable      → true
  //   attendance_required → true
  //   overtime_allowed    → false
  // ============================================================
  export const createJob = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateJobPayload,
  ): Promise<ApiResponse<Job>> => {
    const url = `/companies/${companyId}/jobs`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<Job>>(
      url,
      payload,
      'createJob',
      { headers },
    );
  };
  
  // ============================================================
  // Update job
  //
  // PATCH /companies/{cid}/jobs/{jid}
  //
  // `job_code` is intentionally NOT updatable — to change it, delete
  // and recreate the job. The backend rejects empty bodies (you must
  // actually change at least one field).
  // ============================================================
  export const updateJob = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    jobId: string,
    payload: UpdateJobPayload,
  ): Promise<ApiResponse<Job>> => {
    const url = `/companies/${companyId}/jobs/${jobId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPatch<ApiResponse<Job>>(
      url,
      payload,
      `updateJob:${companyId}:${jobId}`,
      { headers },
    );
  };
  
  // ============================================================
  // Deactivate job (soft delete)
  //
  // POST /companies/{cid}/jobs/{jid}/deactivate
  //
  // Hides the job from `active_only=true` list calls but keeps it
  // referencing existing positions. Any seat built on the job keeps
  // working; new seats can't be created against an inactive job.
  // ============================================================
  export const deactivateJob = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    jobId: string,
  ): Promise<ApiResponse<null>> => {
    const url = `/companies/${companyId}/jobs/${jobId}/deactivate`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<null>>(
      url,
      {},
      `deactivateJob:${companyId}:${jobId}`,
      { headers },
    );
  };
  
  // ============================================================
  // Reactivate job
  //
  // POST /companies/{cid}/jobs/{jid}/reactivate
  // ============================================================
  export const reactivateJob = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    jobId: string,
  ): Promise<ApiResponse<null>> => {
    const url = `/companies/${companyId}/jobs/${jobId}/reactivate`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<null>>(
      url,
      {},
      `reactivateJob:${companyId}:${jobId}`,
      { headers },
    );
  };
  
  // ============================================================
  // Delete job (hard delete)
  //
  // DELETE /companies/{cid}/jobs/{jid}
  //
  // Only succeeds when NO positions reference the job. The backend
  // returns 409 Conflict otherwise. Always call `getJobPositionCount`
  // first (or use the preflight helper from positions.ts) so the UI
  // can offer "deactivate" instead of failing the delete.
  // ============================================================
  export const deleteJob = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    jobId: string,
  ): Promise<ApiResponse<null>> => {
    const url = `/companies/${companyId}/jobs/${jobId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<null>>(
      url,
      undefined,
      `deleteJob:${companyId}:${jobId}`,
      { headers },
    );
  };
  
  // ============================================================
  // Preflight — count positions in a job
  //
  // GET /companies/{cid}/jobs/{jid}/positions/count
  //
  // Re-exported from positions.ts for callers who only import from
  // this module. Both call the same backend endpoint; pick whichever
  // fits your import layout.
  // ============================================================
  export const getJobPositionCount = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    jobId: string,
  ): Promise<ApiResponse<JobPositionCountResponse>> => {
    const url = `/companies/${companyId}/jobs/${jobId}/positions/count`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get<
      ApiResponse<JobPositionCountResponse>
    >(url, { headers });
    return response.data;
  };