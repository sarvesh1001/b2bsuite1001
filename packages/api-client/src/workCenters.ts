// packages/api-client/src/workCenters.ts

import axios, { AxiosRequestConfig } from 'axios';
import {
  WorkCenter,
  CreateWorkCenterPayload,
  UpdateWorkCenterPayload,
  ListWorkCentersParams,
  SearchWorkCentersParams,
  ApiResponse,
} from '@b2b/shared-types';

const API_VERSION = '/api/v1'; // adjust as needed

// Helper to generate idempotency key
const generateIdempotencyKey = (suffix?: string) => {
  const uuid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
  return suffix ? `${uuid}-${suffix}` : uuid;
};

// Base headers (will be merged with per‑request headers)
const getBaseHeaders = (companyId: string, deviceId: string) => ({
  'X-Company-ID': companyId,
  'X-Device-ID': deviceId,
  'Content-Type': 'application/json',
});

// ---------------- Create Work Center ----------------
export const createWorkCenter = async (
  companyId: string,
  deviceId: string,
  payload: CreateWorkCenterPayload,
  accessToken: string,
): Promise<ApiResponse<WorkCenter>> => {
  const url = `/companies/${companyId}/attendance/work-centers`;
  const headers = {
    ...getBaseHeaders(companyId, deviceId),
    Authorization: `Bearer ${accessToken}`,
    'Idempotency-Key': generateIdempotencyKey('create-workcenter'),
  };
  const response = await axios.post<ApiResponse<WorkCenter>>(url, payload, { headers });
  return response.data;
};

// ---------------- Get by Code ----------------
export const getWorkCenterByCode = async (
  companyId: string,
  deviceId: string,
  code: string,
  accessToken: string,
): Promise<ApiResponse<WorkCenter | null>> => {
  const url = `/companies/${companyId}/attendance/work-centers/${code}`;
  const headers = {
    ...getBaseHeaders(companyId, deviceId),
    Authorization: `Bearer ${accessToken}`,
  };
  const response = await axios.get<ApiResponse<WorkCenter | null>>(url, { headers });
  return response.data;
};

// ---------------- Update Work Center ----------------
export const updateWorkCenter = async (
  companyId: string,
  deviceId: string,
  code: string,
  payload: UpdateWorkCenterPayload,
  accessToken: string,
): Promise<ApiResponse<WorkCenter>> => {
  const url = `/companies/${companyId}/attendance/work-centers/${code}`;
  const headers = {
    ...getBaseHeaders(companyId, deviceId),
    Authorization: `Bearer ${accessToken}`,
    'Idempotency-Key': generateIdempotencyKey('update-workcenter'),
  };
  const response = await axios.put<ApiResponse<WorkCenter>>(url, payload, { headers });
  return response.data;
};

// ---------------- List Work Centers ----------------
export const listWorkCenters = async (
  companyId: string,
  deviceId: string,
  params: ListWorkCentersParams,
  accessToken: string,
): Promise<ApiResponse<WorkCenter[]>> => {
  const url = `/companies/${companyId}/attendance/work-centers`;
  const headers = {
    ...getBaseHeaders(companyId, deviceId),
    Authorization: `Bearer ${accessToken}`,
  };
  const response = await axios.get<ApiResponse<WorkCenter[]>>(url, { headers, params });
  return response.data;
};

// ---------------- Search Work Centers ----------------
export const searchWorkCenters = async (
  companyId: string,
  deviceId: string,
  params: SearchWorkCentersParams,
  accessToken: string,
): Promise<ApiResponse<WorkCenter[]>> => {
  const url = `/companies/${companyId}/attendance/work-centers/search`;
  const headers = {
    ...getBaseHeaders(companyId, deviceId),
    Authorization: `Bearer ${accessToken}`,
  };
  const response = await axios.get<ApiResponse<WorkCenter[]>>(url, { headers, params });
  return response.data;
};

// ---------------- Get Active Work Centers ----------------
export const getActiveWorkCenters = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
): Promise<ApiResponse<WorkCenter[]>> => {
  const url = `/companies/${companyId}/attendance/work-centers/active`;
  const headers = {
    ...getBaseHeaders(companyId, deviceId),
    Authorization: `Bearer ${accessToken}`,
  };
  const response = await axios.get<ApiResponse<WorkCenter[]>>(url, { headers });
  return response.data;
};

// ---------------- Delete Work Center ----------------
export const deleteWorkCenter = async (
  companyId: string,
  deviceId: string,
  code: string,
  accessToken: string,
): Promise<ApiResponse<null>> => {
  const url = `/companies/${companyId}/attendance/work-centers/${code}`;
  const headers = {
    ...getBaseHeaders(companyId, deviceId),
    Authorization: `Bearer ${accessToken}`,
  };
  const response = await axios.delete<ApiResponse<null>>(url, { headers });
  return response.data;
};

// ---------------- Health Check ----------------
export const workCenterHealth = async (
  companyId: string,
  deviceId: string,
  accessToken: string,
): Promise<{ success: boolean; message: string; timestamp: string }> => {
  const url = `/companies/${companyId}/attendance/work-centers/health`;
  const headers = {
    ...getBaseHeaders(companyId, deviceId),
    Authorization: `Bearer ${accessToken}`,
  };
  const response = await axios.get(url, { headers });
  return response.data;
};