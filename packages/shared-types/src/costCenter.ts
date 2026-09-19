// packages/shared-types/src/costCenter.ts

export interface CostCenter {
  cost_center_id: string;
  company_id: string;
  cost_center_code: string;
  cost_center_name: string;
  description?: string | null;
  parent_id?: string | null;
  account_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;
}

export interface CostCenterTreeNode extends CostCenter {
  children?: CostCenterTreeNode[];
}

export interface CreateCostCenterPayload {
  cost_center_code: string;
  cost_center_name: string;
  description?: string;
  parent_id?: string | null;
  account_id?: string | null;
  is_active?: boolean;
}

export interface UpdateCostCenterPayload {
  cost_center_code?: string;
  cost_center_name?: string;
  description?: string | null;
  parent_id?: string | null;
  account_id?: string | null;
  is_active?: boolean;
}

export interface ListCostCentersParams {
  include_inactive?: boolean;
  tree?: boolean;
  limit?: number;
  offset?: number;
}

export interface CostCenterListResponse {
  items: CostCenter[];
  total: number;
  limit: number;
  offset: number;
}