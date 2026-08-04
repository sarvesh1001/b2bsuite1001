// packages/api-client/src/workCenters.ts

import {
    WorkCenter,
    CreateWorkCenterPayload,
    UpdateWorkCenterPayload,
    ListWorkCentersParams,
    SearchWorkCentersParams,
    ApiResponse,
  } from '@b2b/shared-types';
  import { axiosInstance } from './axios-instance';
  import { idempotentPost, idempotentPut, idempotentDelete } from './idempotency';
  
  // Helper headers for all requests (GET and mutations)
  const getBaseHeaders = (companyId: string, deviceId: string) => ({
    'X-Company-ID': companyId,
    'X-Device-ID': deviceId,
    'Content-Type': 'application/json',
  });
  
  // ---------------- Create Work Center (idempotent) ----------------
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
    };
    return idempotentPost<ApiResponse<WorkCenter>>(
      url,
      payload,
      'createWorkCenter',
      { headers }
    );
  };
  
  // ---------------- Get by Code (GET – no idempotency) ----------------
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
    const response = await axiosInstance.get<ApiResponse<WorkCenter | null>>(url, { headers });
    return response.data;
  };
  
  // ---------------- Update Work Center (idempotent) ----------------
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
    };
    return idempotentPut<ApiResponse<WorkCenter>>(
      url,
      payload,
      'updateWorkCenter',
      { headers }
    );
  };
  
  // ---------------- List Work Centers (GET) ----------------
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
    const response = await axiosInstance.get<ApiResponse<WorkCenter[]>>(url, { headers, params });
    return response.data;
  };
  
  // ---------------- Search Work Centers (GET) ----------------
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
    const response = await axiosInstance.get<ApiResponse<WorkCenter[]>>(url, { headers, params });
    return response.data;
  };
  
  // ---------------- Get Active Work Centers (GET) ----------------
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
    const response = await axiosInstance.get<ApiResponse<WorkCenter[]>>(url, { headers });
    return response.data;
  };
  
  // ---------------- Delete Work Center (idempotent) ----------------
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
    return idempotentDelete<ApiResponse<null>>(
      url,
      undefined,
      `deleteWorkCenter-${code}`,
      { headers }
    );
  };
  
  // ---------------- Health Check (GET) ----------------
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
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };