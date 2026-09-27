import type {
  OrgUnit, CreateOrgUnitPayload, UpdateOrgUnitPayload,
  OrgUnitMember, AddOrgUnitMemberPayload, UpdateOrgUnitMemberPayload,
  OrgUnitRole, AssignOrgUnitRolePayload, UserMembership, ApiEnvelope,
  SearchOrgUnitsParams,
} from '@b2b/shared-types';
import { axiosInstance } from './axios-instance';
import { idempotentPost, idempotentPut, idempotentDelete } from './idempotency';

const getBaseHeaders = (companyId: string, deviceId: string, accessToken: string) => ({
  'X-Company-ID': companyId,
  'X-Device-ID': deviceId,
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
});

/* -------------------- Org Units -------------------- */

export const listOrgUnits = async (
  companyId: string, deviceId: string, accessToken: string,
  params: { page?: number; page_size?: number; type?: string; is_active?: boolean } = {}
): Promise<ApiEnvelope<OrgUnit[]>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<OrgUnit[]>>(
    `/companies/${companyId}/org-units`,
    { headers: getBaseHeaders(companyId, deviceId, accessToken), params }
  );
  return data;
};

/**
 * Search org units.
 *
 * Wire format notes:
 *   - `location_ids` is serialized as a comma-separated string
 *     (`?location_ids=a,b,c`) because the backend parses it that way.
 *   - `is_universal=true`  → only orgs with NO bound locations.
 *   - `is_universal=false` → only orgs bound to ≥1 location.
 */
export const searchOrgUnits = async (
  companyId: string, deviceId: string, accessToken: string,
  params: SearchOrgUnitsParams = {}
): Promise<ApiEnvelope<OrgUnit[]>> => {
  // Axios serializes arrays as `key[]=a&key[]=b` by default — override it.
  const { location_ids, ...rest } = params;
  const wire: Record<string, any> = { ...rest };
  if (location_ids && location_ids.length > 0) {
    wire.location_ids = location_ids.join(',');
  }

  const { data } = await axiosInstance.get<ApiEnvelope<OrgUnit[]>>(
    `/companies/${companyId}/org-units/search`,
    { headers: getBaseHeaders(companyId, deviceId, accessToken), params: wire }
  );
  return data;
};

export const getActiveOrgUnits = async (
  companyId: string, deviceId: string, accessToken: string
): Promise<ApiEnvelope<OrgUnit[]>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<OrgUnit[]>>(
    `/companies/${companyId}/org-units/active`,
    { headers: getBaseHeaders(companyId, deviceId, accessToken) }
  );
  return data;
};

export const getOrgUnit = async (
  companyId: string, orgUnitId: string, deviceId: string, accessToken: string, details = false
): Promise<ApiEnvelope<OrgUnit>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<OrgUnit>>(
    `/companies/${companyId}/org-units/${orgUnitId}`,
    { headers: getBaseHeaders(companyId, deviceId, accessToken), params: { details } }
  );
  return data;
};

export const createOrgUnit = (
  companyId: string, deviceId: string, accessToken: string, payload: CreateOrgUnitPayload
) =>
  idempotentPost<ApiEnvelope<OrgUnit>>(
    `/companies/${companyId}/org-units`, payload, 'createOrgUnit',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) }
  );

export const updateOrgUnit = (
  companyId: string, orgUnitId: string, deviceId: string, accessToken: string,
  payload: UpdateOrgUnitPayload
) =>
  idempotentPut<ApiEnvelope<OrgUnit>>(
    `/companies/${companyId}/org-units/${orgUnitId}`, payload, 'updateOrgUnit',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) }
  );

export const deleteOrgUnit = (
  companyId: string, orgUnitId: string, deviceId: string, accessToken: string
) =>
  idempotentDelete<ApiEnvelope<{ message: string }>>(
    `/companies/${companyId}/org-units/${orgUnitId}`, {}, 'deleteOrgUnit',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) }
  );

/* -------------------- Members -------------------- */

export const addOrgUnitMember = (
  companyId: string, orgUnitId: string, deviceId: string, accessToken: string,
  payload: AddOrgUnitMemberPayload
) =>
  idempotentPost<ApiEnvelope<OrgUnitMember>>(
    `/companies/${companyId}/org-units/${orgUnitId}/members`, payload, 'addOrgUnitMember',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) }
  );

export const listOrgUnitMembers = async (
  companyId: string, orgUnitId: string, deviceId: string, accessToken: string, active = true
): Promise<ApiEnvelope<OrgUnitMember[]>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<OrgUnitMember[]>>(
    `/companies/${companyId}/org-units/${orgUnitId}/members`,
    { headers: getBaseHeaders(companyId, deviceId, accessToken), params: { active } }
  );
  return data;
};

export const updateOrgUnitMember = (
  companyId: string, orgUnitId: string, userId: string, deviceId: string, accessToken: string,
  payload: UpdateOrgUnitMemberPayload
) =>
  idempotentPut<ApiEnvelope<OrgUnitMember>>(
    `/companies/${companyId}/org-units/${orgUnitId}/members/${userId}`,
    payload, 'updateOrgUnitMember',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) }
  );

export const removeOrgUnitMember = (
  companyId: string, orgUnitId: string, userId: string, deviceId: string, accessToken: string
) =>
  idempotentDelete<ApiEnvelope<{ message: string }>>(
    `/companies/${companyId}/org-units/${orgUnitId}/members/${userId}`, {}, 'removeOrgUnitMember',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) }
  );

/* -------------------- Roles -------------------- */

export const assignOrgUnitRole = (
  companyId: string, orgUnitId: string, deviceId: string, accessToken: string,
  payload: AssignOrgUnitRolePayload
) =>
  idempotentPost<ApiEnvelope<OrgUnitRole>>(
    `/companies/${companyId}/org-units/${orgUnitId}/roles`, payload, 'assignOrgUnitRole',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) }
  );

export const listOrgUnitRoles = async (
  companyId: string, orgUnitId: string, deviceId: string, accessToken: string, active = true
): Promise<ApiEnvelope<OrgUnitRole[]>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<OrgUnitRole[]>>(
    `/companies/${companyId}/org-units/${orgUnitId}/roles`,
    { headers: getBaseHeaders(companyId, deviceId, accessToken), params: { active } }
  );
  return data;
};

export const removeOrgUnitRole = (
  companyId: string, orgUnitId: string, userId: string, role: string,
  deviceId: string, accessToken: string
) =>
  idempotentDelete<ApiEnvelope<{ message: string }>>(
    `/companies/${companyId}/org-units/${orgUnitId}/members/${userId}/roles/${role}`,
    {}, 'removeOrgUnitRole',
    { headers: getBaseHeaders(companyId, deviceId, accessToken) }
  );

/* -------------------- User Memberships -------------------- */

export const getUserMemberships = async (
  companyId: string, userId: string, deviceId: string, accessToken: string, active = true
): Promise<ApiEnvelope<UserMembership[]>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<UserMembership[]>>(
    `/companies/${companyId}/org-units/user/${userId}/memberships`,
    { headers: getBaseHeaders(companyId, deviceId, accessToken), params: { active } }
  );
  return data;
};