// packages/api-client/src/employees.ts

import {
    CompanyEmployee,
    AddEmployeePayload,
    AddManagerPayload,
    SearchEmployeesPayload,
    AdvancedSearchEmployeesParams,
    ApiResponse,
  } from '@b2b/shared-types';
  import { axiosInstance } from './axios-instance';
  import { idempotentPost } from './idempotency';
  
  const getBaseHeaders = (companyId: string, deviceId: string, accessToken: string) => ({
    'X-Company-ID': companyId,
    'X-Device-ID': deviceId,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  });
  
  // ---- Get company employees ----
  export const getCompanyEmployees = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
  ): Promise<ApiResponse<{ employees: CompanyEmployee[]; meta: any }>> => {
    const url = `/companies/${companyId}/getemployees`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  // ---- Get company hierarchy ----
  export const getCompanyHierarchy = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
  ): Promise<ApiResponse<{ hierarchy: any[]; meta: any }>> => {
    const url = `/companies/${companyId}/hierarchy`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  // ---- Search employees ----
  export const searchEmployees = async (
    companyId: string,
    deviceId: string,
    payload: SearchEmployeesPayload,
    accessToken: string,
  ): Promise<ApiResponse<{ employees: CompanyEmployee[]; meta: any }>> => {
    const url = `/companies/${companyId}/employees/search`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.post(url, payload, { headers });
    return response.data;
  };
  
  // ---- Advanced search ----
  export const advancedSearchEmployees = async (
    companyId: string,
    deviceId: string,
    params: AdvancedSearchEmployeesParams,
    accessToken: string,
  ): Promise<ApiResponse<{ employees: CompanyEmployee[]; meta: any }>> => {
    const url = `/companies/${companyId}/employees/search/advanced`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  // ---- Get employee suggestions ----
  export const getEmployeeSuggestions = async (
    companyId: string,
    deviceId: string,
    prefix: string,
    limit: number,
    accessToken: string,
  ): Promise<ApiResponse<CompanyEmployee[]>> => {
    const url = `/companies/${companyId}/employees/suggestions`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params: { prefix, limit } });
    return response.data;
  };
  
  // ---- Find employee by username ----
  export const findEmployeeByUsername = async (
    companyId: string,
    deviceId: string,
    username: string,
    accessToken: string,
  ): Promise<ApiResponse<CompanyEmployee>> => {
    const url = `/companies/${companyId}/employees/username/${username}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get<ApiResponse<CompanyEmployee>>(url, { headers });
    return response.data;
  };
  
  // ---- Add employee (idempotent) ----
  export const addEmployee = async (
    companyId: string,
    deviceId: string,
    payload: AddEmployeePayload,
    accessToken: string,
  ): Promise<ApiResponse<CompanyEmployee>> => {
    const url = `/companies/${companyId}/rbac/employees`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<CompanyEmployee>>(url, payload, 'addEmployee', { headers });
  };
  
  // ---- Add manager (idempotent) ----
  export const addManager = async (
    companyId: string,
    deviceId: string,
    payload: AddManagerPayload,
    accessToken: string,
  ): Promise<ApiResponse<CompanyEmployee>> => {
    const url = `/companies/${companyId}/rbac/managers`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<CompanyEmployee>>(url, payload, 'addManager', { headers });
  };