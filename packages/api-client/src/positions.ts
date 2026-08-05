// packages/api-client/src/positions.ts

import {
    Position,
    CreatePositionPayload,
    UpdatePositionPayload,
    ListPositionsParams,
    ApiResponse,
  } from '@b2b/shared-types';
  import { axiosInstance } from './axios-instance';
  import { idempotentPost, idempotentPut, idempotentDelete } from './idempotency';
  
  const getBaseHeaders = (companyId: string, deviceId: string, accessToken: string) => ({
    'X-Company-ID': companyId,
    'X-Device-ID': deviceId,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  });
  
  // ---- List positions ----
  export const listPositions = async (
    companyId: string,
    deviceId: string,
    params: ListPositionsParams,
    accessToken: string,
  ): Promise<ApiResponse<{ positions: Position[]; meta: { count: number; limit: number; offset: number; total: number } }>> => {
    const url = `/companies/${companyId}/positions`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  // ---- Get position by ID ----
  export const getPosition = async (
    companyId: string,
    deviceId: string,
    positionId: string,
    accessToken: string,
  ): Promise<ApiResponse<Position>> => {
    const url = `/companies/${companyId}/positions/${positionId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get<ApiResponse<Position>>(url, { headers });
    return response.data;
  };
  
  // ---- Create position (idempotent) ----
  export const createPosition = async (
    companyId: string,
    deviceId: string,
    payload: CreatePositionPayload,
    accessToken: string,
  ): Promise<ApiResponse<Position>> => {
    const url = `/companies/${companyId}/positions`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<Position>>(url, payload, 'createPosition', { headers });
  };
  
  // ---- Update position (idempotent) ----
  export const updatePosition = async (
    companyId: string,
    deviceId: string,
    positionId: string,
    payload: UpdatePositionPayload,
    accessToken: string,
  ): Promise<ApiResponse<Position>> => {
    const url = `/companies/${companyId}/positions/${positionId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<Position>>(url, payload, 'updatePosition', { headers });
  };
  
  // ---- Delete position (idempotent) ----
  export const deletePosition = async (
    companyId: string,
    deviceId: string,
    positionId: string,
    accessToken: string,
  ): Promise<ApiResponse<null>> => {
    const url = `/companies/${companyId}/positions/${positionId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<null>>(url, undefined, 'deletePosition', { headers });
  };