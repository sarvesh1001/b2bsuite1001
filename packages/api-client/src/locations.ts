// packages/api-client/src/locations.ts
import { axiosInstance } from './axios-instance';
import type {
  AccessibleLocation,
  MyLocationsResponse,
  LocationAccessScope,
  LocationAccessLevel,
} from '@b2b/shared-types';

const TAG = '[api-client/locations]';

const log = (...args: any[]) => {
  // eslint-disable-next-line no-console
  console.log(TAG, ...args);
};

const logError = (...args: any[]) => {
  // eslint-disable-next-line no-console
  console.error(TAG, ...args);
};

const unwrap = <T>(res: any): T => res?.data?.data ?? res?.data ?? res;

// ---------- 25.0.1 – My accessible locations (post-login bootstrap) ----------
export const getMyLocations = async (
  companyId: string
): Promise<MyLocationsResponse> => {
  const url = `/companies/${companyId}/me/locations`;
  log('→ GET', url);
  try {
    const res = await axiosInstance.get(url);
    const data = unwrap<MyLocationsResponse>(res);
    log('← GET', url, 'status=', res.status, 'raw=', res.data, 'unwrapped=', data);
    return data;
  } catch (e: any) {
    logError('✗ GET', url, 'status=', e?.response?.status, 'data=', e?.response?.data, 'msg=', e?.message);
    throw e;
  }
};

// ---------- 25 – Location CRUD ----------
export interface CreateLocationPayload {
  location_code: string;
  location_name: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export const listLocations = async (
  companyId: string,
  page = 1,
  limit = 50
) => {
  const url = `/companies/${companyId}/locations?page=${page}&limit=${limit}`;
  log('→ GET', url);
  try {
    const res = await axiosInstance.get(url);
    const data = unwrap<any>(res);
    log(
      '← GET',
      url,
      'status=',
      res.status,
      'rawKeys=',
      res?.data && typeof res.data === 'object' ? Object.keys(res.data) : typeof res.data,
      'rawData=',
      res.data,
      'unwrappedType=',
      Array.isArray(data) ? 'array' : typeof data,
      'unwrappedKeys=',
      data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : '(n/a)',
      'unwrapped=',
      data,
    );
    return data;
  } catch (e: any) {
    logError('✗ GET', url, 'status=', e?.response?.status, 'data=', e?.response?.data, 'msg=', e?.message);
    throw e;
  }
};

export const getLocation = async (companyId: string, locationId: string) => {
  const url = `/companies/${companyId}/locations/${locationId}`;
  log('→ GET', url);
  try {
    const res = await axiosInstance.get(url);
    const data = unwrap<AccessibleLocation>(res);
    log('← GET', url, 'status=', res.status, 'raw=', res.data, 'unwrapped=', data);
    return data;
  } catch (e: any) {
    logError('✗ GET', url, 'status=', e?.response?.status, 'data=', e?.response?.data);
    throw e;
  }
};

export const createLocation = async (
  companyId: string,
  payload: CreateLocationPayload,
  idempotencyKey: string
) => {
  const url = `/companies/${companyId}/locations`;
  log('→ POST', url, 'payload=', payload, 'idem=', idempotencyKey);
  try {
    const res = await axiosInstance.post(url, payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    const data = unwrap<AccessibleLocation>(res);
    log('← POST', url, 'status=', res.status, 'raw=', res.data, 'unwrapped=', data);
    return data;
  } catch (e: any) {
    logError('✗ POST', url, 'status=', e?.response?.status, 'data=', e?.response?.data);
    throw e;
  }
};

export const updateLocation = async (
  companyId: string,
  locationId: string,
  payload: Partial<CreateLocationPayload> & { is_active?: boolean },
  idempotencyKey: string
) => {
  const url = `/companies/${companyId}/locations/${locationId}`;
  log('→ PUT', url, 'payload=', payload, 'idem=', idempotencyKey);
  try {
    const res = await axiosInstance.put(url, payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    const data = unwrap<AccessibleLocation>(res);
    log('← PUT', url, 'status=', res.status, 'raw=', res.data, 'unwrapped=', data);
    return data;
  } catch (e: any) {
    logError('✗ PUT', url, 'status=', e?.response?.status, 'data=', e?.response?.data);
    throw e;
  }
};

export const deleteLocation = async (
  companyId: string,
  locationId: string,
  idempotencyKey: string
) => {
  const url = `/companies/${companyId}/locations/${locationId}`;
  log('→ DELETE', url, 'idem=', idempotencyKey);
  try {
    const res = await axiosInstance.delete(url, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    const data = unwrap<any>(res);
    log('← DELETE', url, 'status=', res.status, 'raw=', res.data, 'unwrapped=', data);
    return data;
  } catch (e: any) {
    logError('✗ DELETE', url, 'status=', e?.response?.status, 'data=', e?.response?.data);
    throw e;
  }
};

// ---------- 26 – Employee location access ----------
export interface SetEmployeeLocationsPayload {
  primary_location_id: string;
  location_access_scope: LocationAccessScope;
  selected_locations?: {
    location_id: string;
    access_level: LocationAccessLevel;
  }[];
}

export const getEmployeeLocations = async (
  companyId: string,
  employeeUserId: string
) => {
  const url = `/companies/${companyId}/employees/${employeeUserId}/locations`;
  log('→ GET', url);
  try {
    const res = await axiosInstance.get(url);
    const data = unwrap<any>(res);
    log(
      '← GET',
      url,
      'status=',
      res.status,
      'rawKeys=',
      res?.data && typeof res.data === 'object' ? Object.keys(res.data) : typeof res.data,
      'rawData=',
      res.data,
      'unwrappedType=',
      Array.isArray(data) ? 'array' : typeof data,
      'unwrappedKeys=',
      data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : '(n/a)',
      'unwrapped=',
      data,
      'primary_location_id=',
      data?.primary_location_id,
      'location_access_scope=',
      data?.location_access_scope,
      'selected_locations=',
      data?.selected_locations,
    );
    return data;
  } catch (e: any) {
    // 404 = not configured — that's a valid state, not an error
    const status = e?.response?.status;
    if (status === 404) {
      log('← GET', url, 'status=404 (not configured) — returning null');
      return null;
    }
    logError('✗ GET', url, 'status=', status, 'data=', e?.response?.data, 'msg=', e?.message);
    throw e;
  }
};

export const setEmployeeLocations = async (
  companyId: string,
  employeeUserId: string,
  payload: SetEmployeeLocationsPayload,
  idempotencyKey: string
) => {
  const url = `/companies/${companyId}/employees/${employeeUserId}/locations`;
  log('→ PUT', url, 'payload=', payload, 'idem=', idempotencyKey);
  try {
    const res = await axiosInstance.put(url, payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    const data = unwrap<any>(res);
    log('← PUT', url, 'status=', res.status, 'raw=', res.data, 'unwrapped=', data);
    return data;
  } catch (e: any) {
    logError('✗ PUT', url, 'status=', e?.response?.status, 'data=', e?.response?.data);
    throw e;
  }
};

export const getEmployeeLocationHistory = async (
  companyId: string,
  employeeUserId: string
) => {
  const url = `/companies/${companyId}/employees/${employeeUserId}/locations/history`;
  log('→ GET', url);
  try {
    const res = await axiosInstance.get(url);
    const data = unwrap<any>(res);
    log('← GET', url, 'status=', res.status, 'raw=', res.data, 'unwrapped=', data);
    return data;
  } catch (e: any) {
    logError('✗ GET', url, 'status=', e?.response?.status, 'data=', e?.response?.data);
    throw e;
  }
};

export const addEmployeeLocationAccess = async (
  companyId: string,
  employeeUserId: string,
  locationId: string,
  accessLevel: LocationAccessLevel,
  idempotencyKey: string
) => {
  const url = `/companies/${companyId}/employees/${employeeUserId}/locations/access`;
  const payload = { location_id: locationId, access_level: accessLevel };
  log('→ POST', url, 'payload=', payload, 'idem=', idempotencyKey);
  try {
    const res = await axiosInstance.post(url, payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    const data = unwrap<any>(res);
    log('← POST', url, 'status=', res.status, 'raw=', res.data, 'unwrapped=', data);
    return data;
  } catch (e: any) {
    logError('✗ POST', url, 'status=', e?.response?.status, 'data=', e?.response?.data);
    throw e;
  }
};

export const removeEmployeeLocationAccess = async (
  companyId: string,
  employeeUserId: string,
  locationId: string,
  idempotencyKey: string
) => {
  const url = `/companies/${companyId}/employees/${employeeUserId}/locations/access/${locationId}`;
  log('→ DELETE', url, 'idem=', idempotencyKey);
  try {
    const res = await axiosInstance.delete(url, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    const data = unwrap<any>(res);
    log('← DELETE', url, 'status=', res.status, 'raw=', res.data, 'unwrapped=', data);
    return data;
  } catch (e: any) {
    logError('✗ DELETE', url, 'status=', e?.response?.status, 'data=', e?.response?.data);
    throw e;
  }
};