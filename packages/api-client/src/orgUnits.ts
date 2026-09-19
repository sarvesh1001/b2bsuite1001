// packages/api-client/src/orgUnits.ts
import {
    OrgUnit,
    CreateOrgUnitPayload,
    UpdateOrgUnitPayload,
    OrgUnitMember,
    AddOrgUnitMemberPayload,
    UpdateOrgUnitMemberPayload,
    OrgUnitRole,
    AssignOrgUnitRolePayload,
    UserMembership,
    ApiResponse,
  } from '@b2b/shared-types';
  import { axiosInstance } from './axios-instance';
  import { idempotentPost, idempotentPut, idempotentDelete } from './idempotency';
  
  const getBaseHeaders = (companyId: string, deviceId: string, accessToken: string) => ({
    'X-Company-ID': companyId,
    'X-Device-ID': deviceId,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  });
  
  // ============ Org Units ============
  
  export const listOrgUnits = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { page?: number; page_size?: number; type?: string; is_active?: boolean }
  ): Promise<ApiResponse<{ org_units: OrgUnit[]; total: number }>> => {
    const url = `/companies/${companyId}/org-units`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const searchOrgUnits = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params: { name?: string; type?: string; page?: number; page_size?: number }
  ): Promise<ApiResponse<{ org_units: OrgUnit[]; total: number }>> => {
    const url = `/companies/${companyId}/org-units/search`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getActiveOrgUnits = async (
    companyId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<OrgUnit[]>> => {
    const url = `/companies/${companyId}/org-units/active`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const getOrgUnit = async (
    companyId: string,
    orgUnitId: string,
    deviceId: string,
    accessToken: string,
    details = false
  ): Promise<ApiResponse<OrgUnit>> => {
    const url = `/companies/${companyId}/org-units/${orgUnitId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params: { details } });
    return response.data;
  };
  
  export const createOrgUnit = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateOrgUnitPayload
  ): Promise<ApiResponse<OrgUnit>> => {
    const url = `/companies/${companyId}/org-units`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<OrgUnit>>(url, payload, 'createOrgUnit', { headers });
  };
  
  export const updateOrgUnit = async (
    companyId: string,
    orgUnitId: string,
    deviceId: string,
    accessToken: string,
    payload: UpdateOrgUnitPayload
  ): Promise<ApiResponse<OrgUnit>> => {
    const url = `/companies/${companyId}/org-units/${orgUnitId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<OrgUnit>>(url, payload, 'updateOrgUnit', { headers });
  };
  
  export const deleteOrgUnit = async (
    companyId: string,
    orgUnitId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/org-units/${orgUnitId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'deleteOrgUnit', { headers });
  };
  
  // ============ Org Unit Members ============
  
  export const addOrgUnitMember = async (
    companyId: string,
    orgUnitId: string,
    deviceId: string,
    accessToken: string,
    payload: AddOrgUnitMemberPayload
  ): Promise<ApiResponse<OrgUnitMember>> => {
    const url = `/companies/${companyId}/org-units/${orgUnitId}/members`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<OrgUnitMember>>(url, payload, 'addOrgUnitMember', { headers });
  };
  
  export const listOrgUnitMembers = async (
    companyId: string,
    orgUnitId: string,
    deviceId: string,
    accessToken: string,
    active = true
  ): Promise<ApiResponse<OrgUnitMember[]>> => {
    const url = `/companies/${companyId}/org-units/${orgUnitId}/members`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params: { active } });
    return response.data;
  };
  
  export const updateOrgUnitMember = async (
    companyId: string,
    orgUnitId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    payload: UpdateOrgUnitMemberPayload
  ): Promise<ApiResponse<OrgUnitMember>> => {
    const url = `/companies/${companyId}/org-units/${orgUnitId}/members/${userId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<OrgUnitMember>>(url, payload, 'updateOrgUnitMember', { headers });
  };
  
  export const removeOrgUnitMember = async (
    companyId: string,
    orgUnitId: string,
    userId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/org-units/${orgUnitId}/members/${userId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'removeOrgUnitMember', { headers });
  };
  
  // ============ Org Unit Roles ============
  
  export const assignOrgUnitRole = async (
    companyId: string,
    orgUnitId: string,
    deviceId: string,
    accessToken: string,
    payload: AssignOrgUnitRolePayload
  ): Promise<ApiResponse<OrgUnitRole>> => {
    const url = `/companies/${companyId}/org-units/${orgUnitId}/roles`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<OrgUnitRole>>(url, payload, 'assignOrgUnitRole', { headers });
  };
  
  export const listOrgUnitRoles = async (
    companyId: string,
    orgUnitId: string,
    deviceId: string,
    accessToken: string,
    active = true
  ): Promise<ApiResponse<OrgUnitRole[]>> => {
    const url = `/companies/${companyId}/org-units/${orgUnitId}/roles`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params: { active } });
    return response.data;
  };
  
  export const removeOrgUnitRole = async (
    companyId: string,
    orgUnitId: string,
    userId: string,
    role: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/org-units/${orgUnitId}/members/${userId}/roles/${role}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'removeOrgUnitRole', { headers });
  };
  
  // ============ User Memberships ============
  
  export const getUserMemberships = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    active = true
  ): Promise<ApiResponse<UserMembership[]>> => {
    const url = `/companies/${companyId}/org-units/user/${userId}/memberships`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params: { active } });
    return response.data;
  };