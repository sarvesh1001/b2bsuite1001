import {
  WorkCenter,
  CreateWorkCenterPayload,
  UpdateWorkCenterPayload,
  ListWorkCentersParams,
  SearchWorkCentersParams,
  ApiResponse,
} from '@b2b/shared-types';
import { axiosInstance } from './axios-instance';
import {
  idempotentPost,
  idempotentPut,
  idempotentDelete,
} from './idempotency';

// ------------------------------------------------------------------
// Logging helper — one place to toggle verbosity
// ------------------------------------------------------------------
const DEBUG = true;

const log = (...args: any[]) => {
  if (DEBUG) console.log(...args);
};

const logBanner = (title: string) => {
  if (!DEBUG) return;
  console.log('══════════════════════════════════════════════');
  console.log(title);
  console.log('══════════════════════════════════════════════');
};

// ------------------------------------------------------------------
// base headers
// ------------------------------------------------------------------
// NOTE: X-Location-ID is intentionally NOT set here. It is auto-injected
// by the axios interceptor from the current location context.
// Pass `locationIdOverride` on a per-call basis when you need to force
// a specific location for that request (see createWorkCenter below).
// ------------------------------------------------------------------
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

// ------------------------------------------------------------------
// Create Work Center (idempotent)
// ------------------------------------------------------------------
// `locationIdOverride`:
//   When provided, forces X-Location-ID on THIS request, overriding the
//   interceptor's current-context value. Required when the caller wants
//   to create a work center in a location that isn't the current header
//   context (e.g. user is in "ALL" mode, or picked a different location
//   in the create form's location picker).
//
//   Must match `payload.location_id`, otherwise the backend will reject
//   the request (or create it under the wrong tenant scope).
// ------------------------------------------------------------------
export const createWorkCenter = async (
  companyId: string,
  deviceId: string,
  payload: CreateWorkCenterPayload,
  accessToken: string,
  locationIdOverride?: string | null,
): Promise<ApiResponse<WorkCenter>> => {
  const url = `/companies/${companyId}/attendance/work-centers`;

  const headers = getBaseHeaders(companyId, deviceId, accessToken);

  if (locationIdOverride) {
    headers['X-Location-ID'] = locationIdOverride;
  }

  // ─────────── REQUEST LOG ───────────
  logBanner('📤 [createWorkCenter] REQUEST');
  log('   URL               :', url);
  log('   X-Company-ID      :', companyId);
  log('   X-Device-ID       :', deviceId);
  log('   X-Location-ID     :', locationIdOverride ?? '(NOT SET — interceptor will inject)');
  log('   Authorization     :', `Bearer ${accessToken?.slice(0, 20)}…`);
  log('   ──────────────────────────────────────');
  log('   payload.location_id :', payload?.location_id ?? '❌ MISSING');
  log('   payload (full)      :');
  log(JSON.stringify(payload, null, 2));
  log('   ──────────────────────────────────────');
  log('   headers (final)   :', headers);
  log('══════════════════════════════════════════════');

  // 🚨 explicit warning if the two location values disagree
  if (
    locationIdOverride &&
    payload?.location_id &&
    locationIdOverride !== payload.location_id
  ) {
    console.warn(
      '⚠️ [createWorkCenter] MISMATCH: header X-Location-ID ≠ body location_id',
      {
        header: locationIdOverride,
        body: payload.location_id,
      }
    );
  }

  if (!payload?.location_id) {
    console.warn(
      '⚠️ [createWorkCenter] payload.location_id is EMPTY — ' +
        'backend will likely create a work center with location_id = NULL'
    );
  }

  try {
    const res = await idempotentPost<ApiResponse<WorkCenter>>(
      url,
      payload,
      'createWorkCenter',
      { headers }
    );

    // ─────────── RESPONSE LOG ───────────
    logBanner('📡 [createWorkCenter] RESPONSE');
    log('   success             :', res?.success);
    log('   data.location_id    :', res?.data?.location_id ?? '❌ null/undefined');
    log('   data.work_center_code:', res?.data?.work_center_code);
    log('   data (full)         :');
    log(JSON.stringify(res?.data, null, 2));
    log('══════════════════════════════════════════════');

    if (
      res?.success &&
      (!res?.data?.location_id || res.data.location_id === null)
    ) {
      console.warn(
        '⚠️ [createWorkCenter] Server created the row but location_id is NULL in the response — ' +
          'this is a BACKEND bug (DTO stripping or handler not persisting the field)'
      );
    }

    return res;
  } catch (error: any) {
    logBanner('❌ [createWorkCenter] ERROR');
    log('   message  :', error?.message);
    log('   status   :', error?.response?.status);
    log('   response :', error?.response?.data);
    log('══════════════════════════════════════════════');
    throw error;
  }
};

// ------------------------------------------------------------------
// Get by Code (GET – no idempotency)
// ------------------------------------------------------------------
export const getWorkCenterByCode = async (
  companyId: string,
  deviceId: string,
  code: string,
  accessToken: string,
): Promise<ApiResponse<WorkCenter | null>> => {
  const url = `/companies/${companyId}/attendance/work-centers/${code}`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);

  log(`📤 [getWorkCenterByCode] GET ${url}`);

  const response = await axiosInstance.get<
    ApiResponse<WorkCenter | null>
  >(url, { headers });

  log('📡 [getWorkCenterByCode] response:', {
    code,
    location_id: response.data?.data?.location_id,
  });

  return response.data;
};

// ------------------------------------------------------------------
// Update Work Center (idempotent)
// ------------------------------------------------------------------
// Note: location_id is intentionally NOT updatable via this endpoint.
// A work center cannot be moved between locations after creation.
// X-Location-ID continues to reflect the current context.
// ------------------------------------------------------------------
export const updateWorkCenter = async (
  companyId: string,
  deviceId: string,
  code: string,
  payload: UpdateWorkCenterPayload,
  accessToken: string,
): Promise<ApiResponse<WorkCenter>> => {
  const url = `/companies/${companyId}/attendance/work-centers/${code}`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);

  logBanner('📤 [updateWorkCenter] REQUEST');
  log('   URL      :', url);
  log('   code     :', code);
  log('   payload  :', JSON.stringify(payload, null, 2));
  log('══════════════════════════════════════════════');

  const res = await idempotentPut<ApiResponse<WorkCenter>>(
    url,
    payload,
    'updateWorkCenter',
    { headers }
  );

  log('📡 [updateWorkCenter] response:', {
    success: res?.success,
    location_id: res?.data?.location_id,
  });

  return res;
};

// ------------------------------------------------------------------
// List Work Centers (GET)
// ------------------------------------------------------------------
export const listWorkCenters = async (
  companyId: string,
  deviceId: string,
  params: ListWorkCentersParams,
  accessToken: string,
): Promise<ApiResponse<WorkCenter[]>> => {
  const url = `/companies/${companyId}/attendance/work-centers`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);

  log(`📤 [listWorkCenters] GET ${url}`, params);

  const response = await axiosInstance.get<ApiResponse<WorkCenter[]>>(
    url,
    { headers, params }
  );

  const items = response.data?.data ?? [];
  log(
    `📡 [listWorkCenters] response: ${Array.isArray(items) ? items.length : 'null'} items`,
    Array.isArray(items)
      ? items.map((w: any) => ({
          code: w.work_center_code,
          location_id: w.location_id,
        }))
      : items
  );

  return response.data;
};

// ------------------------------------------------------------------
// Search Work Centers (GET)
// ------------------------------------------------------------------
export const searchWorkCenters = async (
  companyId: string,
  deviceId: string,
  params: SearchWorkCentersParams,
  accessToken: string,
): Promise<ApiResponse<WorkCenter[]>> => {
  const url = `/companies/${companyId}/attendance/work-centers/search`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);

  log(`📤 [searchWorkCenters] GET ${url}`, params);

  const response = await axiosInstance.get<ApiResponse<WorkCenter[]>>(
    url,
    { headers, params }
  );

  log(
    `📡 [searchWorkCenters] response: ${
      Array.isArray(response.data?.data)
        ? response.data.data.length
        : 'null'
    } items`
  );

  return response.data;
};

// ------------------------------------------------------------------
// Get Active Work Centers (GET)
// ------------------------------------------------------------------
export const getActiveWorkCenters = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
): Promise<ApiResponse<WorkCenter[]>> => {
  const url = `/companies/${companyId}/attendance/work-centers/active`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);

  log(`📤 [getActiveWorkCenters] GET ${url}`);

  const response = await axiosInstance.get<ApiResponse<WorkCenter[]>>(
    url,
    { headers }
  );

  log(
    `📡 [getActiveWorkCenters] response: ${
      Array.isArray(response.data?.data)
        ? response.data.data.length
        : 'null'
    } items`
  );

  return response.data;
};

// ------------------------------------------------------------------
// Delete Work Center (idempotent)
// ------------------------------------------------------------------
export const deleteWorkCenter = async (
  companyId: string,
  deviceId: string,
  code: string,
  accessToken: string,
): Promise<ApiResponse<null>> => {
  const url = `/companies/${companyId}/attendance/work-centers/${code}`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);

  log(`📤 [deleteWorkCenter] DELETE ${url}`);

  const res = await idempotentDelete<ApiResponse<null>>(
    url,
    {}, // data is optional; pass empty object for consistency
    `deleteWorkCenter-${code}`,
    { headers }
  );

  log('📡 [deleteWorkCenter] response:', {
    success: res?.success,
    code,
  });

  return res;
};

// ------------------------------------------------------------------
// Health Check (GET)
// ------------------------------------------------------------------
export const workCenterHealth = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
): Promise<{ success: boolean; message: string; timestamp: string }> => {
  const url = `/companies/${companyId}/attendance/work-centers/health`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);

  log(`📤 [workCenterHealth] GET ${url}`);

  const response = await axiosInstance.get(url, { headers });

  log('📡 [workCenterHealth] response:', response.data);

  return response.data;
};