export interface OrgUnit {
    id: string;
    company_id: string;
    name: string;
    org_unit_type: 'department' | 'team' | 'division' | 'branch';
    description?: string;
    department_id?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateOrgUnitPayload {
    name: string;
    org_unit_type: string;
    description?: string;
    department_id?: string | null;
    is_active?: boolean;
  }
  
  export interface UpdateOrgUnitPayload {
    name?: string;
    description?: string;
    is_active?: boolean;
  }
  
  export interface OrgUnitMember {
    id: string;
    org_unit_id: string;
    user_id: string;
    effective_from: string;
    effective_to?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    user_name?: string;
    user_email?: string;
  }
  
  export interface AddOrgUnitMemberPayload {
    user_id: string;
    effective_from: string;
    effective_to?: string | null;
  }
  
  export interface UpdateOrgUnitMemberPayload {
    effective_from?: string;
    effective_to?: string | null;
  }
  
  export interface OrgUnitRole {
    id: string;
    org_unit_id: string;
    user_id: string;
    role: string;
    position_id?: string | null;
    effective_from: string;
    effective_to?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface AssignOrgUnitRolePayload {
    user_id: string;
    role: string;
    position_id?: string | null;
    effective_from: string;
    effective_to?: string | null;
  }
  
  export interface UserMembership {
    org_unit_id: string;
    org_unit_name: string;
    role?: string;
    effective_from: string;
    effective_to?: string | null;
    is_active: boolean;
  }