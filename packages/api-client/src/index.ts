// packages/api-client/src/index.ts

// ✅ Generated (from OpenAPI)
export * from './generated/api';
export * from './generated/models';
export * from './device';

// ✅ Manual clients (idempotent + typesafe)
export * from './workCenters';
export * from './departments';
export * from './employees';
export * from './positions';
export * from './roles';
export * from './users';
export * from './avatars';
export * from './chat';
export * from './hr';
export * from './orgUnits';
export * from './leave';
export * from './payroll';
export * from './locations';   // getMyLocations, setEmployeeLocations, CRUD
export * from './costCenter'
// ✅ Idempotency helpers
export * from './idempotency';

// ✅ Axios instance + auth/context setters
export {
  default as axiosInstance,
  customAxiosInstance,
  setAuthToken,
  setDeviceId,
  setCompanyId,
  getCompanyId,
  setLocationId,
  getLocationId,
  isAllLocations,        // 🆕
  ALL_LOCATIONS_ID,      // 🆕
  applyContextFromJwt,
  setRefreshTokenFunction,
  setUnauthorizedCallback,
} from './axios-instance';