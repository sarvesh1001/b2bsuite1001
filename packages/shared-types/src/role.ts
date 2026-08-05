export interface Role {
    role_id: string;
    role_name: string;
    role_level: number;
    company_id: string;
    is_system_role: boolean;
    description?: string;
    created_at: string;
    updated_at: string;
}

export interface Permission {
    permission_id: string;
    permission_name: string;
    description: string;
    category: string;
    module: string;
    action?: string;
    requires_tier?: string;
    created_at: string;
}

export interface CreateRolePayload {
    role_name: string;
    role_level: number;
    description?: string;
    department_ids?: string[];
    permission_names?: string[];
}

export interface UpdateRolePayload {
    role_name?: string;
    description?: string;
    add_departments?: string[];
    remove_departments?: string[];
    add_permissions?: string[];
    remove_permissions?: string[];
    replace_permissions?: string[];
}

export interface ListRolesParams {
    page?: number;
    limit?: number;
}

export interface AssignPermissionsPayload {
    permission_names: string[];
}

export interface BulkAssignPayload {
    assignments: Array<{
        user_id: string;
        role_id: string;
    }>;
}