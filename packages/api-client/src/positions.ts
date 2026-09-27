// packages/api-client/src/positions.ts

import {
  Position,
  CreatePositionPayload,
  UpdatePositionPayload,
  ListPositionsParams,
  JobPositionCountResponse,
  ApiResponse,
} from '@b2b/shared-types';
import { axiosInstance } from './axios-instance';
import { idempotentPost, idempotentPut, idempotentDelete } from './idempotency';

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
// List positions
//
// GET /companies/{cid}/positions
//
// The backend returns PositionView rows — i.e. `Position` with the
// joined job/department/location/work-center fields populated. The
// shared `Position` type includes all of them as optional fields.
// ============================================================
export const listPositions = async (
  companyId: string,
  deviceId: string,
  params: ListPositionsParams,
  accessToken: string,
): Promise<
  ApiResponse<{
    positions: Position[];
    meta: { count: number; limit: number; offset: number; total: number };
  }>
> => {
  const url = `/companies/${companyId}/positions`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get(url, { headers, params });
  return response.data;
};

// ============================================================
// Get position by ID
//
// GET /companies/{cid}/positions/{pid}
// ============================================================
export const getPosition = async (
  companyId: string,
  deviceId: string,
  positionId: string,
  accessToken: string,
): Promise<ApiResponse<Position>> => {
  const url = `/companies/${companyId}/positions/${positionId}`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  const response = await axiosInstance.get<ApiResponse<Position>>(url, {
    headers,
  });
  return response.data;
};

// ============================================================
// Create position
//
// POST /companies/{cid}/positions
//
// Payload shape change vs. the old flow:
//   • `title` is GONE.
//   • `job_id` is REQUIRED (look it up from /jobs).
//   • `location_id` and `title_override` are new.
//   • `is_schedulable` / `attendance_required` / `overtime_allowed`
//     are GONE — those live on the job, not the seat.
// ============================================================
export const createPosition = async (
  companyId: string,
  deviceId: string,
  payload: CreatePositionPayload,
  accessToken: string,
): Promise<ApiResponse<Position>> => {
  const url = `/companies/${companyId}/positions`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPost<ApiResponse<Position>>(
    url,
    payload,
    'createPosition',
    { headers },
  );
};

// ============================================================
// Update position
//
// PUT /companies/{cid}/positions/{pid}
//
// All fields optional. `title` is gone; `title_override` replaces it.
// `job_id` is now editable (a seat can be re-pointed at a different job).
// ============================================================
export const updatePosition = async (
  companyId: string,
  deviceId: string,
  positionId: string,
  payload: UpdatePositionPayload,
  accessToken: string,
): Promise<ApiResponse<Position>> => {
  const url = `/companies/${companyId}/positions/${positionId}`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentPut<ApiResponse<Position>>(
    url,
    payload,
    'updatePosition',
    { headers },
  );
};

// ============================================================
// Delete position
//
// DELETE /companies/{cid}/positions/{pid}
// ============================================================
export const deletePosition = async (
  companyId: string,
  deviceId: string,
  positionId: string,
  accessToken: string,
): Promise<ApiResponse<null>> => {
  const url = `/companies/${companyId}/positions/${positionId}`;
  const headers = getBaseHeaders(companyId, deviceId, accessToken);
  return idempotentDelete<ApiResponse<null>>(
    url,
    undefined,
    'deletePosition',
    { headers },
  );
};

// ============================================================
// Preflight — count positions in a job
//
// GET /companies/{cid}/jobs/{jid}/positions/count
//
// Call this before showing a "delete job" button. When
// `deletable === false`, the UI should offer "deactivate" instead.
// ============================================================
