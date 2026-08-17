import { z } from 'zod';
export * from './workCenter';
export * from './department';
export * from './role';
export * from './position';
export * from './employee';
export * from './avatar';     // 👈 Export avatar types (Avatar, AvatarSummary)
export * from './chat';

// ---------- User ----------
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
});

export type User = z.infer<typeof UserSchema>;

// ---------- UserTokens (for JWT responses) ----------
export interface UserTokens {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
}

// ---------- Company ----------
export interface Company {
  company_id: string;
  company_name: string;
  owner_user_id: string;
  is_active: boolean;
  subscription_tier: 'basic' | 'premium' | 'enterprise';
  subscription_status: string;
  max_employees: number;
  max_departments?: number;
  data_region: string;
  created_at: string;
  updated_at?: string;
}

// ---------- Generic API Response Wrapper ----------
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: any;
}

// You can also export the Zod schemas if needed later.