// apps/mobile/src/constants/kyc.ts

export const KYC_STATUSES = {
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected',
    UNDER_REVIEW: 'under_review',
    EXPIRED: 'expired',
  } as const;
  
  export const KYC_LEVELS = {
    BASIC: 'basic',
    ADVANCED: 'advanced',
    FULL: 'full',
  } as const;
  
  export type KYCStatus = typeof KYC_STATUSES[keyof typeof KYC_STATUSES];
  export type KYCLevel = typeof KYC_LEVELS[keyof typeof KYC_LEVELS];
  
  // Valid status transitions
  export const KYC_TRANSITIONS: Record<KYCStatus, KYCStatus[]> = {
    [KYC_STATUSES.PENDING]: [KYC_STATUSES.VERIFIED, KYC_STATUSES.REJECTED, KYC_STATUSES.UNDER_REVIEW],
    [KYC_STATUSES.VERIFIED]: [KYC_STATUSES.EXPIRED, KYC_STATUSES.REJECTED],
    [KYC_STATUSES.REJECTED]: [KYC_STATUSES.PENDING, KYC_STATUSES.VERIFIED],
    [KYC_STATUSES.UNDER_REVIEW]: [KYC_STATUSES.VERIFIED, KYC_STATUSES.REJECTED],
    [KYC_STATUSES.EXPIRED]: [KYC_STATUSES.PENDING, KYC_STATUSES.VERIFIED],
  };
  
  // All statuses for display (e.g. in a dropdown)
  export const ALL_KYC_STATUSES = Object.values(KYC_STATUSES);
  export const ALL_KYC_LEVELS = Object.values(KYC_LEVELS);