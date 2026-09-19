// packages/api-client/src/costCenter.ts

import {
    CostCenter,
    CostCenterTreeNode,
    CostCenterListResponse,
    CreateCostCenterPayload,
    UpdateCostCenterPayload,
    ListCostCentersParams,
    ApiResponse,
  } from '@b2b/shared-types';
  import { axiosInstance } from './axios-instance';
  import {
    idempotentPost,
    idempotentPut,
    idempotentDelete,
  } from './idempotency';
  
  const DEBUG = true;
  const log = (...args: any[]) => {
    if (DEBUG) console.log(...args);
  };
  
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
  // List (flat)
  // ------------------------------------------------------------------
  export const listCostCenters = async (
    companyId: string,
    deviceId: string,
    params: ListCostCentersParams,
    accessToken: string,
  ): Promise<ApiResponse<CostCenterListResponse>> => {
    const url = `/companies/${companyId}/accounting/cost-centers`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
  
    log(`📤 [listCostCenters] GET ${url}`, params);
  
    const response = await axiosInstance.get<ApiResponse<CostCenterListResponse>>(
      url,
      { headers, params },
    );
  
    log(
      `📡 [listCostCenters] response: ${
        response.data?.data?.items?.length ?? 0
      } items`,
    );
  
    return response.data;
  };
  
  // ------------------------------------------------------------------
  // List as tree
  // ------------------------------------------------------------------
  export const listCostCentersTree = async (
    companyId: string,
    deviceId: string,
    params: ListCostCentersParams,
    accessToken: string,
  ): Promise<ApiResponse<CostCenterTreeNode[]>> => {
    const url = `/companies/${companyId}/accounting/cost-centers`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
  
    const response = await axiosInstance.get<
      ApiResponse<CostCenterTreeNode[]>
    >(url, { headers, params: { ...params, tree: true } });
  
    return response.data;
  };
  
  // ------------------------------------------------------------------
  // Get by ID
  // ------------------------------------------------------------------
  export const getCostCenter = async (
    companyId: string,
    deviceId: string,
    costCenterId: string,
    accessToken: string,
  ): Promise<ApiResponse<CostCenter>> => {
    const url = `/companies/${companyId}/accounting/cost-centers/${costCenterId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
  
    const response = await axiosInstance.get<ApiResponse<CostCenter>>(url, {
      headers,
    });
  
    return response.data;
  };
  
  // ------------------------------------------------------------------
  // Create
  // ------------------------------------------------------------------
  export const createCostCenter = async (
    companyId: string,
    deviceId: string,
    payload: CreateCostCenterPayload,
    accessToken: string,
  ): Promise<ApiResponse<CostCenter>> => {
    const url = `/companies/${companyId}/accounting/cost-centers`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
  
    log('📤 [createCostCenter]', payload);
  
    return idempotentPost<ApiResponse<CostCenter>>(
      url,
      payload,
      'createCostCenter',
      { headers },
    );
  };
  
  // ------------------------------------------------------------------
  // Update
  // ------------------------------------------------------------------
  export const updateCostCenter = async (
    companyId: string,
    deviceId: string,
    costCenterId: string,
    payload: UpdateCostCenterPayload,
    accessToken: string,
  ): Promise<ApiResponse<CostCenter>> => {
    const url = `/companies/${companyId}/accounting/cost-centers/${costCenterId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
  
    return idempotentPut<ApiResponse<CostCenter>>(
      url,
      payload,
      `updateCostCenter-${costCenterId}`,
      { headers },
    );
  };
  
  // ------------------------------------------------------------------
  // Deactivate (soft delete)
  // ------------------------------------------------------------------
  export const deactivateCostCenter = async (
    companyId: string,
    deviceId: string,
    costCenterId: string,
    accessToken: string,
  ): Promise<ApiResponse<null>> => {
    const url = `/companies/${companyId}/accounting/cost-centers/${costCenterId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
  
    return idempotentDelete<ApiResponse<null>>(
      url,
      {},
      `deactivateCostCenter-${costCenterId}`,
      { headers },
    );
  };