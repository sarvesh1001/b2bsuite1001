// packages/api-client/src/index.ts

// ✅ Generated (from OpenAPI)
export * from './generated/api';
export * from './generated/models';

// ✅ Manual clients (idempotent + typesafe)
export * from './workCenters';
export * from './departments';
export * from './employees';
export * from './positions';
export * from './roles';
export * from './users';      // 👈 New: phone endpoint
export * from './avatars';    // 👈 New: avatar management
export * from './chat';

// ✅ Idempotency helpers (optional, but useful to expose)
export * from './idempotency';

// ✅ Axios instance + auth setters
export {
  default as axiosInstance,
  customAxiosInstance,
  setAuthToken,
  setDeviceId,
  setRefreshTokenFunction,
  setUnauthorizedCallback,
} from './axios-instance';