// packages/shared-types/src/position.ts

export interface Position {
    position_id: string;
    company_id: string;
    department_id: string;
    title: string;
    is_open: boolean;
    is_schedulable: boolean;
    attendance_required: boolean;
    overtime_allowed: boolean;
    work_center_code?: string;
    work_center_name?: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreatePositionPayload {
    company_id: string;
    department_id: string;
    title: string;
    is_open?: boolean;
    is_schedulable?: boolean;
    attendance_required?: boolean;
    overtime_allowed?: boolean;
    work_center_code?: string;
  }
  
  export interface UpdatePositionPayload {
    title?: string;
    is_open?: boolean;
    is_schedulable?: boolean;
    attendance_required?: boolean;
    overtime_allowed?: boolean;
    work_center_code?: string;
  }
  
  export interface ListPositionsParams {
    department_id?: string;
    only_open?: boolean;
    limit?: number;
    offset?: number;
  }