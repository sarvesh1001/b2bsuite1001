import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  useForm,
  Controller,
} from 'react-hook-form';
import {
  zodResolver,
} from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  FiArrowLeft,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiEdit3,
  FiGrid,
  FiInfo,
  FiKey,
  FiMinus,
  FiPlus,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
  FiSave,
  FiAlertTriangle,
  FiRefreshCw,
} from 'react-icons/fi';

// ✅ Use axiosInstance directly
import { axiosInstance } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';

// =========================================================
// TYPES
// =========================================================

type DepartmentItem = {
  department_id: string;
  department_name: string;
  module_code?: string;
};

type PermissionItem = {
  permission_name: string;
  description: string;
  module: string;
};

// =========================================================
// SCHEMA
// =========================================================

const schema = z.object({
  role_name: z
    .string()
    .min(1, 'Role name is required'),

  role_level: z
    .number()
    .int()
    .min(1, 'Level must be at least 1')
    .max(1000, 'Level cannot exceed 1000'),

  description: z
    .string()
    .nullable()
    .optional(),

  add_departments: z.array(z.string()),

  remove_departments: z.array(z.string()),

  add_permissions: z.array(z.string()),

  remove_permissions: z.array(z.string()),
});

type FormData = z.infer<typeof schema>;

// =========================================================
// MODULE COLORS
// =========================================================

const MODULE_COLORS: Record<string, string> = {
  administration: '#2563EB',
  hr: '#7C3AED',
  attendance: '#F59E0B',
  inventory: '#10B981',
  payroll: '#EF4444',
  sales: '#8B5CF6',
  procurement: '#F97316',
  production: '#14B8A6',
  logistics: '#3B82F6',
  accounting: '#6366F1',
  finance: '#8B5CF6',
  it: '#64748B',
  academics: '#EC4899',
  marketing: '#F59E0B',
  transport: '#14B8A6',
  operations: '#0EA5E9',
};

const MODULE_ICONS: Record<string, string> = {
  administration: '⚙️',
  hr: '👥',
  attendance: '📅',
  inventory: '📦',
  payroll: '💰',
  sales: '🏷️',
  procurement: '🚚',
  production: '🏭',
  logistics: '📍',
  accounting: '🧮',
  finance: '🏦',
  it: '💻',
  academics: '🎓',
  marketing: '📣',
  transport: '🚌',
  operations: '📋',
};

// =========================================================
// DEPARTMENT → MODULE
// =========================================================

const DEPARTMENT_TO_MODULE_KEY: Record<string, string> = {
  Academics: 'academics',
  Accounting: 'accounting',
  Administration: 'administration',
  Attendance: 'attendance',
  Finance: 'finance',
  HR: 'hr',
  IT: 'it',
  Inventory: 'inventory',
  Logistics: 'logistics',
  Marketing: 'marketing',
  Operations: 'operations',
  Payroll: 'payroll',
  Procurement: 'procurement',
  Production: 'production',
  Sales: 'sales',

  'Company Management': 'administration',
  'Employee Management': 'hr',
  'Manager Management': 'hr',
  'Quality Assurance': 'operations',
  'Quality Control': 'operations',
  'R&D': 'administration',
  'Customer Support': 'administration',
};

// =========================================================
// HELPERS
// =========================================================

function getModuleColor(module?: string) {
  return MODULE_COLORS[module || ''] || '#64748B';
}

function getModuleIcon(module?: string) {
  return MODULE_ICONS[module || ''] || '📁';
}

function formatModuleName(module?: string) {
  if (!module) return 'General';

  return module
    .split(/[-_]/)
    .map(
      word =>
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
    )
    .join(' ');
}

// =========================================================
// COMPONENT
// =========================================================

export default function EditRoleScreen() {
  const router = useRouter();
  const { roleId } = router.query;
  const isCreateMode = !roleId; // 👈 New flag

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  // =======================================================
  // STATE
  // =======================================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [isSystemRole, setIsSystemRole] =
    useState(false);

  const [roleNotFound, setRoleNotFound] =
    useState(false);

  // Departments
  const [allDepartments, setAllDepartments] =
    useState<DepartmentItem[]>([]);

  const [loadingDepartments, setLoadingDepartments] =
    useState(true);

  const [currentDepartments, setCurrentDepartments] =
    useState<DepartmentItem[]>([]);

  // Permissions
  const [currentPermissions, setCurrentPermissions] =
    useState<PermissionItem[]>([]);

  // Add permission
  const [addModule, setAddModule] =
    useState('');

  const [addPermissionsList, setAddPermissionsList] =
    useState<PermissionItem[]>([]);

  const [loadingAddPermissions, setLoadingAddPermissions] =
    useState(false);

  const [addPermissionModalOpen, setAddPermissionModalOpen] =
    useState(false);

  const [addSearchQuery, setAddSearchQuery] =
    useState('');

  const [tempAddPermissions, setTempAddPermissions] =
    useState<string[]>([]);

  // Remove permission
  const [removeModule, setRemoveModule] =
    useState('');

  const [removePermissionsList, setRemovePermissionsList] =
    useState<PermissionItem[]>([]);

  const [loadingRemovePermissions, setLoadingRemovePermissions] =
    useState(false);

  const [removePermissionModalOpen, setRemovePermissionModalOpen] =
    useState(false);

  const [removeSearchQuery, setRemoveSearchQuery] =
    useState('');

  const [tempRemovePermissions, setTempRemovePermissions] =
    useState<string[]>([]);

  // Department modals
  const [addDeptModalOpen, setAddDeptModalOpen] =
    useState(false);

  const [removeDeptModalOpen, setRemoveDeptModalOpen] =
    useState(false);

  // Module selector
  const [moduleSelectorOpen, setModuleSelectorOpen] =
    useState<'add' | 'remove' | null>(null);

  const [moduleSearch, setModuleSearch] =
    useState('');

  // =======================================================
  // FORM
  // =======================================================

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: {
      errors,
      isDirty,
    },
  } = useForm<FormData>({
    resolver: zodResolver(schema),

    defaultValues: {
      role_name: '',
      role_level: 1,
      description: '',
      add_departments: [],
      remove_departments: [],
      add_permissions: [],
      remove_permissions: [],
    },
  });

  const addDeptIds =
    watch('add_departments') || [];

  const removeDeptIds =
    watch('remove_departments') || [];

  const addPermissions =
    watch('add_permissions') || [];

  const removePermissions =
    watch('remove_permissions') || [];

  // =======================================================
  // MODULES
  // =======================================================

  const modules = useMemo(
    () =>
      Array.from(
        new Set(
          allDepartments
            .map(d => d.module_code)
            .filter(Boolean) as string[]
        )
      ),
    [allDepartments]
  );

  const filteredModules = useMemo(() => {
    const query = moduleSearch
      .trim()
      .toLowerCase();

    if (!query) return modules;

    return modules.filter(module =>
      formatModuleName(module)
        .toLowerCase()
        .includes(query)
    );
  }, [modules, moduleSearch]);

  // =======================================================
  // FETCH DATA
  // =======================================================

  useEffect(() => {
    // --- AUTH CHECK ---
    if (!accessToken || !companyId || !deviceId) {
      setError('Missing authentication information.');
      setLoading(false);
      return;
    }

    // --- CREATE MODE: only load departments ---
    if (isCreateMode) {
      const fetchDepartmentsOnly = async () => {
        setLoading(true);
        setLoadingDepartments(true);
        setError(null);

        try {
          const headers = {
            'X-Company-ID': companyId,
            'X-Device-ID': deviceId,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          };

          const deptRes = await axiosInstance.get(
            `/companies/${companyId}/hr/departments/root`,
            { headers }
          );
          const departments = deptRes.data?.data || deptRes.data || [];
          setAllDepartments(departments);

          // Reset form to defaults (already set by useForm)
          reset({
            role_name: '',
            role_level: 1,
            description: '',
            add_departments: [],
            remove_departments: [],
            add_permissions: [],
            remove_permissions: [],
          });

          // Clear edit‑mode data
          setCurrentDepartments([]);
          setCurrentPermissions([]);
          setIsSystemRole(false);
          setRoleNotFound(false);
        } catch (err: any) {
          console.error(err);
          setError(
            err?.response?.data?.message ||
              err?.message ||
              'Failed to load departments.'
          );
        } finally {
          setLoading(false);
          setLoadingDepartments(false);
        }
      };

      fetchDepartmentsOnly();
      return;
    }

    // --- EDIT MODE (original logic) ---
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setLoadingDepartments(true);

      try {
        const headers = {
          'X-Company-ID': companyId,
          'X-Device-ID': deviceId,
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        };

        // 1. Get role details
        const roleRes = await axiosInstance.get(
          `/companies/${companyId}/hr/roles/${roleId}`,
          { headers }
        );
        const role = roleRes.data?.data || roleRes.data;

        if (!role) {
          setRoleNotFound(true);
          return;
        }

        setIsSystemRole(Boolean(role.is_system_role));

        // 2. Get root departments
        const deptRes = await axiosInstance.get(
          `/companies/${companyId}/hr/departments/root`,
          { headers }
        );
        const departments = deptRes.data?.data || deptRes.data || [];
        setAllDepartments(departments);

        // 3. Get role permissions (detailed)
        const permRes = await axiosInstance.get(
          `/companies/${companyId}/hr/roles/${roleId}/permissions/detailed`,
          { headers }
        );
        const permissions = permRes.data?.data || permRes.data || [];
        setCurrentPermissions(permissions);

        // 4. Get role departments
        const roleDeptRes = await axiosInstance.get(
          `/companies/${companyId}/hr/roles/${roleId}/departments`,
          { headers }
        );
        const roleDepts = roleDeptRes.data?.data || roleDeptRes.data || [];
        setCurrentDepartments(roleDepts);

        // Reset form
        reset({
          role_name: role.role_name || '',
          role_level: role.role_level || 1,
          description: role.description || '',
          add_departments: [],
          remove_departments: [],
          add_permissions: [],
          remove_permissions: [],
        });
      } catch (err: any) {
        console.error(err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Failed to load role information.'
        );
      } finally {
        setLoading(false);
        setLoadingDepartments(false);
      }
    };

    fetchData();
  }, [roleId, accessToken, companyId, deviceId, reset, isCreateMode]);

  // =======================================================
  // FETCH PERMISSIONS FOR MODULE
  // =======================================================

  const fetchPermissions = async (
    moduleCode: string,
    mode: 'add' | 'remove'
  ) => {
    if (!accessToken || !companyId || !deviceId) return;

    if (mode === 'add') {
      setLoadingAddPermissions(true);
    } else {
      setLoadingRemovePermissions(true);
    }

    try {
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        'X-Device-ID': deviceId,
        'X-Company-ID': companyId,
      };

      const response = await axiosInstance.get(
        `/companies/${companyId}/hr/permissions/module/${moduleCode}`,
        { headers }
      );

      const data = response.data?.data || response.data || [];

      if (mode === 'add') {
        setAddPermissionsList(data);
      } else {
        setRemovePermissionsList(data);
      }
    } catch (err) {
      console.error(err);
      setError(
        'Could not load permissions for this module.'
      );
    } finally {
      if (mode === 'add') {
        setLoadingAddPermissions(false);
      } else {
        setLoadingRemovePermissions(false);
      }
    }
  };

  // =======================================================
  // MODULE SELECTION
  // =======================================================

  const selectModule = async (
    moduleCode: string
  ) => {
    const mode = moduleSelectorOpen;

    if (!mode) return;

    setModuleSelectorOpen(null);
    setModuleSearch('');

    if (mode === 'add') {
      setAddModule(moduleCode);
      await fetchPermissions(
        moduleCode,
        'add'
      );
    } else {
      setRemoveModule(moduleCode);
      await fetchPermissions(
        moduleCode,
        'remove'
      );
    }
  };

  // =======================================================
  // ADD PERMISSIONS
  // =======================================================

  const openAddPermissionPicker = () => {
    if (!addModule) {
      setModuleSelectorOpen('add');
      return;
    }

    setTempAddPermissions([
      ...addPermissions,
    ]);

    setAddSearchQuery('');

    setAddPermissionModalOpen(true);
  };

  const toggleTempAddPermission = (
    permission: string
  ) => {
    setTempAddPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(
            p => p !== permission
          )
        : [...prev, permission]
    );
  };

  const confirmAddPermissions = () => {
    setValue(
      'add_permissions',
      tempAddPermissions,
      {
        shouldDirty: true,
      }
    );

    setAddPermissionModalOpen(false);
  };

  const removeAddPermission = (
    permission: string
  ) => {
    setValue(
      'add_permissions',
      addPermissions.filter(
        p => p !== permission
      ),
      {
        shouldDirty: true,
      }
    );
  };

  // =======================================================
  // REMOVE PERMISSIONS
  // =======================================================

  const openRemovePermissionPicker = () => {
    if (!removeModule) {
      setModuleSelectorOpen('remove');
      return;
    }

    setTempRemovePermissions([
      ...removePermissions,
    ]);

    setRemoveSearchQuery('');

    setRemovePermissionModalOpen(true);
  };

  const toggleTempRemovePermission = (
    permission: string
  ) => {
    setTempRemovePermissions(prev =>
      prev.includes(permission)
        ? prev.filter(
            p => p !== permission
          )
        : [...prev, permission]
    );
  };

  const confirmRemovePermissions = () => {
    setValue(
      'remove_permissions',
      tempRemovePermissions,
      {
        shouldDirty: true,
      }
    );

    setRemovePermissionModalOpen(false);
  };

  const removeRemovePermission = (
    permission: string
  ) => {
    setValue(
      'remove_permissions',
      removePermissions.filter(
        p => p !== permission
      ),
      {
        shouldDirty: true,
      }
    );
  };

  // =======================================================
  // DEPARTMENTS
  // =======================================================

  const toggleDepartment = (
    id: string,
    type: 'add' | 'remove'
  ) => {
    const current =
      type === 'add'
        ? addDeptIds
        : removeDeptIds;

    const field =
      type === 'add'
        ? 'add_departments'
        : 'remove_departments';

    setValue(
      field,
      current.includes(id)
        ? current.filter(
            departmentId =>
              departmentId !== id
          )
        : [...current, id],
      {
        shouldDirty: true,
      }
    );
  };

  const toggleRemoveCurrentDepartment = (
    departmentId: string
  ) => {
    setValue(
      'remove_departments',
      removeDeptIds.includes(
        departmentId
      )
        ? removeDeptIds.filter(
            id => id !== departmentId
          )
        : [
            ...removeDeptIds,
            departmentId,
          ],
      {
        shouldDirty: true,
      }
    );
  };

  // =======================================================
  // CURRENT PERMISSIONS
  // =======================================================

  const toggleRemoveCurrentPermission = (
    permissionName: string
  ) => {
    setValue(
      'remove_permissions',
      removePermissions.includes(
        permissionName
      )
        ? removePermissions.filter(
            permission =>
              permission !==
              permissionName
          )
        : [
            ...removePermissions,
            permissionName,
          ],
      {
        shouldDirty: true,
      }
    );
  };

  // =======================================================
  // SUBMIT
  // =======================================================

  const onSubmit = async (
    data: FormData
  ) => {
    if (
      !accessToken ||
      !companyId ||
      !deviceId
    ) {
      setError('Missing authentication.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      role_name: data.role_name,
      description: data.description,
      role_level: data.role_level,
      add_departments: data.add_departments || [],
      remove_departments: data.remove_departments || [],
      add_permissions: data.add_permissions || [],
      remove_permissions: data.remove_permissions || [],
    };

    const headers = {
      'X-Company-ID': companyId,
      'X-Device-ID': deviceId,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    try {
      if (isCreateMode) {
        // POST → create new role
        await axiosInstance.post(
          `/companies/${companyId}/hr/roles`,
          payload,
          { headers }
        );
      } else {
        // PUT → update existing role
        await axiosInstance.put(
          `/companies/${companyId}/hr/roles/${roleId}`,
          payload,
          { headers }
        );
      }
      router.back();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to save role.'
      );
    } finally {
      setSaving(false);
    }
  };

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <>
        <div className="rolePage loadingPage">
          <div className="loadingCard">
            <div className="spinner" />

            <h2>
              {isCreateMode ? 'Preparing new role' : 'Loading role'}
            </h2>

            <p>
              {isCreateMode
                ? 'Loading departments...'
                : 'Preparing role information and permissions...'}
            </p>
          </div>
        </div>

        <style jsx>{styles}</style>
      </>
    );
  }

  // =======================================================
  // NOT FOUND
  // =======================================================

  if (roleNotFound) {
    return (
      <>
        <div className="rolePage statePage">
          <div className="stateCard">
            <div className="stateIcon">
              <FiShield />
            </div>

            <h2>
              Role not found
            </h2>

            <p>
              This role may have been deleted
              or you may no longer have access
              to it.
            </p>

            <button
              type="button"
              className="primaryButton"
              onClick={() =>
                router.back()
              }
            >
              <FiArrowLeft />
              Go Back
            </button>
          </div>
        </div>

        <style jsx>{styles}</style>
      </>
    );
  }

  // =======================================================
  // MAIN RENDER
  // =======================================================

  return (
    <>
      <div className="rolePage">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="pageHeader">
          <div className="headerInner">

            <button
              type="button"
              className="backButton"
              onClick={() =>
                router.back()
              }
              aria-label="Go back"
            >
              <FiArrowLeft />
            </button>

            <div className="headerIcon">
              <FiShield />
            </div>

            <div className="headerText">
              <div className="breadcrumb">
                Administration
                <FiChevronRight />
                Roles
                <FiChevronRight />
                {isCreateMode ? 'Create' : 'Edit'}
              </div>

              <h1>
                {isCreateMode ? 'Create Role' : 'Edit Role'}
              </h1>

              <p>
                {isCreateMode
                  ? 'Define a new role and its permissions'
                  : 'Configure role details, departments and permissions'}
              </p>
            </div>

            {isSystemRole && (
              <div className="systemBadge">
                <FiShield />
                System Role
              </div>
            )}
          </div>

          <div className="headerAccent" />
        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="content">

          {/* Error */}
          {error && (
            <div className="errorBanner">
              <div className="errorBannerIcon">
                <FiAlertTriangle />
              </div>

              <div>
                <strong>
                  Something went wrong
                </strong>

                <p>{error}</p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setError(null)
                }
              >
                <FiX />
              </button>
            </div>
          )}

          {/* =================================================
              SYSTEM ROLE NOTICE
          ================================================= */}

          {isSystemRole && (
            <div className="systemNotice">
              <div className="noticeIcon">
                <FiInfo />
              </div>

              <div>
                <strong>
                  System role
                </strong>

                <p>
                  This is a built-in system
                  role. You can update its
                  name, level and description,
                  but it cannot be deleted.
                </p>
              </div>
            </div>
          )}

          {/* =================================================
              ROLE INFORMATION
          ================================================= */}

          <section className="sectionCard">

            <div className="sectionHeader">
              <div className="sectionHeaderIcon blue">
                <FiEdit3 />
              </div>

              <div>
                <h2>
                  Role Information
                </h2>

                <p>
                  Basic information about this
                  role
                </p>
              </div>
            </div>

            <div className="formGrid">

              {/* Role name */}
              <Controller
                control={control}
                name="role_name"
                render={({ field }) => (
                  <div className="field">
                    <label>
                      Role Name
                      <span>*</span>
                    </label>

                    <input
                      {...field}
                      className={
                        errors.role_name
                          ? 'input error'
                          : 'input'
                      }
                      placeholder="e.g. HR Manager"
                    />

                    {errors.role_name && (
                      <small className="fieldError">
                        {
                          errors
                            .role_name
                            .message
                        }
                      </small>
                    )}
                  </div>
                )}
              />

              {/* Role level */}
              <Controller
                control={control}
                name="role_level"
                render={({
                  field: {
                    onChange,
                    onBlur,
                    value,
                  },
                }) => (
                  <div className="field">
                    <label>
                      Role Level
                      <span>*</span>
                    </label>

                    <div className="levelInput">
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={
                          value ?? ''
                        }
                        onChange={e => {
                          if (
                            e.target.value ===
                            ''
                          ) {
                            onChange(
                              undefined
                            );
                            return;
                          }

                          const number =
                            Number(
                              e.target
                                .value
                            );

                          if (
                            !Number.isNaN(
                              number
                            )
                          ) {
                            onChange(
                              Math.min(
                                Math.max(
                                  1,
                                  number
                                ),
                                1000
                              )
                            );
                          }
                        }}
                        onBlur={onBlur}
                      />

                      <span>
                        1–1000
                      </span>
                    </div>

                    {errors.role_level && (
                      <small className="fieldError">
                        {
                          errors
                            .role_level
                            .message
                        }
                      </small>
                    )}
                  </div>
                )}
              />

              {/* Description */}
              <Controller
                control={control}
                name="description"
                render={({ field }) => (
                  <div className="field full">
                    <label>
                      Description
                      <em>
                        Optional
                      </em>
                    </label>

                    <textarea
                      {...field}
                      value={
                        field.value ?? ''
                      }
                      rows={4}
                      placeholder="Describe what this role is responsible for..."
                    />
                  </div>
                )}
              />

            </div>
          </section>

          {/* =================================================
              DEPARTMENTS
          ================================================= */}

          <section className="sectionCard">

            <div className="sectionHeader">
              <div className="sectionHeaderIcon purple">
                <FiUsers />
              </div>

              <div>
                <h2>
                  Department Access
                </h2>

                <p>
                  Control which departments
                  this role can access
                </p>
              </div>

              <div className="countBadge">
                {currentDepartments.length}
                <span>
                  assigned
                </span>
              </div>
            </div>

            {/* Current */}
            <div className="subSection">

              <div className="subSectionTitle">
                <span>
                  Current Departments
                </span>

                <span className="smallCount">
                  {currentDepartments.length}
                </span>
              </div>

              {currentDepartments.length ===
              0 ? (
                <div className="emptyInline">
                  <FiUsers />
                  <span>
                    No departments assigned
                  </span>
                </div>
              ) : (
                <div className="tagGrid">
                  {currentDepartments.map(
                    department => {
                      const removing =
                        removeDeptIds.includes(
                          department.department_id
                        );

                      const color =
                        getModuleColor(
                          department.module_code
                        );

                      return (
                        <div
                          key={
                            department.department_id
                          }
                          className={
                            removing
                              ? 'accessTag removing'
                              : 'accessTag'
                          }
                        >
                          <div
                            className="tagIcon"
                            style={{
                              background:
                                `${color}12`,
                              color,
                            }}
                          >
                            {getModuleIcon(
                              department.module_code
                            )}
                          </div>

                          <div className="tagText">
                            <strong>
                              {
                                department.department_name
                              }
                            </strong>

                            {department.module_code && (
                              <span>
                                {formatModuleName(
                                  department.module_code
                                )}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              toggleRemoveCurrentDepartment(
                                department.department_id
                              )
                            }
                            className="tagAction"
                            title={
                              removing
                                ? 'Undo removal'
                                : 'Remove department'
                            }
                          >
                            {removing ? (
                              <FiCheck />
                            ) : (
                              <FiX />
                            )}
                          </button>
                        </div>
                      );
                    }
                  )}
                </div>
              )}

            </div>

            {/* Department actions */}
            <div className="actionGrid">

              <button
                type="button"
                className="managementButton add"
                onClick={() =>
                  setAddDeptModalOpen(true)
                }
              >
                <div className="managementIcon">
                  <FiPlus />
                </div>

                <div>
                  <strong>
                    Add Departments
                  </strong>

                  <span>
                    Grant additional access
                  </span>
                </div>

                {addDeptIds.length > 0 && (
                  <b>
                    {addDeptIds.length}
                  </b>
                )}
              </button>

              <button
                type="button"
                className="managementButton remove"
                onClick={() =>
                  setRemoveDeptModalOpen(
                    true
                  )
                }
              >
                <div className="managementIcon">
                  <FiMinus />
                </div>

                <div>
                  <strong>
                    Remove Departments
                  </strong>

                  <span>
                    Revoke additional access
                  </span>
                </div>

                {removeDeptIds.length > 0 && (
                  <b>
                    {removeDeptIds.length}
                  </b>
                )}
              </button>

            </div>
          </section>

          {/* =================================================
              PERMISSIONS
          ================================================= */}

          <section className="sectionCard">

            <div className="sectionHeader">
              <div className="sectionHeaderIcon orange">
                <FiKey />
              </div>

              <div>
                <h2>
                  Permission Access
                </h2>

                <p>
                  Manage what this role can
                  perform across the system
                </p>
              </div>

              <div className="countBadge">
                {currentPermissions.length}
                <span>
                  assigned
                </span>
              </div>
            </div>

            {/* Current permissions */}
            <div className="subSection">

              <div className="subSectionTitle">
                <span>
                  Current Permissions
                </span>

                <span className="smallCount">
                  {currentPermissions.length}
                </span>
              </div>

              {currentPermissions.length ===
              0 ? (
                <div className="emptyInline">
                  <FiKey />
                  <span>
                    No permissions assigned
                  </span>
                </div>
              ) : (
                <div className="permissionList">
                  {currentPermissions.map(
                    permission => {
                      const removing =
                        removePermissions.includes(
                          permission.permission_name
                        );

                      const color =
                        getModuleColor(
                          permission.module
                        );

                      return (
                        <div
                          key={
                            permission.permission_name
                          }
                          className={
                            removing
                              ? 'permissionRow removing'
                              : 'permissionRow'
                          }
                        >
                          <div
                            className="permissionModuleIcon"
                            style={{
                              color,
                              background:
                                `${color}12`,
                            }}
                          >
                            {getModuleIcon(
                              permission.module
                            )}
                          </div>

                          <div className="permissionInfo">
                            <strong>
                              {
                                permission.permission_name
                              }
                            </strong>

                            <span>
                              {
                                permission.description ||
                                'No description available'
                              }
                            </span>
                          </div>

                          <span
                            className="modulePill"
                            style={{
                              color,
                              background:
                                `${color}12`,
                            }}
                          >
                            {formatModuleName(
                              permission.module
                            )}
                          </span>

                          <button
                            type="button"
                            className="permissionRemove"
                            onClick={() =>
                              toggleRemoveCurrentPermission(
                                permission.permission_name
                              )
                            }
                          >
                            {removing ? (
                              <FiCheck />
                            ) : (
                              <FiX />
                            )}
                          </button>
                        </div>
                      );
                    }
                  )}
                </div>
              )}

            </div>

            {/* Permission actions */}
            <div className="permissionActions">

              {/* Add */}
              <div className="permissionActionCard add">

                <div className="permissionActionHeader">
                  <div className="permissionActionIcon">
                    <FiPlus />
                  </div>

                  <div>
                    <h3>
                      Add Permissions
                    </h3>

                    <p>
                      Grant new capabilities
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="moduleSelect"
                  onClick={() =>
                    setModuleSelectorOpen(
                      'add'
                    )
                  }
                >
                  <span>
                    {addModule
                      ? `${getModuleIcon(
                          addModule
                        )}  ${formatModuleName(
                          addModule
                        )}`
                      : 'Select a module'}
                  </span>

                  <FiChevronDown />
                </button>

                {addModule && (
                  <button
                    type="button"
                    className="choosePermissionButton add"
                    onClick={
                      openAddPermissionPicker
                    }
                  >
                    <FiKey />
                    Choose Permissions

                    {addPermissions.length >
                      0 && (
                      <span>
                        {
                          addPermissions.length
                        }
                      </span>
                    )}
                  </button>
                )}

                {addPermissions.length >
                  0 && (
                  <div className="selectedPermissionTags">
                    {addPermissions.map(
                      permission => (
                        <span
                          key={permission}
                          className="selectedTag add"
                        >
                          {permission}

                          <button
                            type="button"
                            onClick={() =>
                              removeAddPermission(
                                permission
                              )
                            }
                          >
                            <FiX />
                          </button>
                        </span>
                      )
                    )}
                  </div>
                )}

              </div>

              {/* Remove */}
              <div className="permissionActionCard remove">

                <div className="permissionActionHeader">
                  <div className="permissionActionIcon">
                    <FiMinus />
                  </div>

                  <div>
                    <h3>
                      Remove Permissions
                    </h3>

                    <p>
                      Revoke selected capabilities
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="moduleSelect"
                  onClick={() =>
                    setModuleSelectorOpen(
                      'remove'
                    )
                  }
                >
                  <span>
                    {removeModule
                      ? `${getModuleIcon(
                          removeModule
                        )}  ${formatModuleName(
                          removeModule
                        )}`
                      : 'Select a module'}
                  </span>

                  <FiChevronDown />
                </button>

                {removeModule && (
                  <button
                    type="button"
                    className="choosePermissionButton remove"
                    onClick={
                      openRemovePermissionPicker
                    }
                  >
                    <FiKey />
                    Choose Permissions

                    {removePermissions.length >
                      0 && (
                      <span>
                        {
                          removePermissions.length
                        }
                      </span>
                    )}
                  </button>
                )}

                {removePermissions.length >
                  0 && (
                  <div className="selectedPermissionTags">
                    {removePermissions.map(
                      permission => (
                        <span
                          key={permission}
                          className="selectedTag remove"
                        >
                          {permission}

                          <button
                            type="button"
                            onClick={() =>
                              removeRemovePermission(
                                permission
                              )
                            }
                          >
                            <FiX />
                          </button>
                        </span>
                      )
                    )}
                  </div>
                )}

              </div>

            </div>
          </section>

        </main>

        {/* =================================================
            STICKY SAVE BAR
        ================================================= */}

        <div className="saveBar">
          <div className="saveBarInner">

            <div className="saveStatus">
              <div className="saveDot" />

              <span>
                {isDirty
                  ? 'You have unsaved changes'
                  : 'No unsaved changes'}
              </span>
            </div>

            <div className="saveActions">

              <button
                type="button"
                className="cancelButton"
                onClick={() =>
                  router.back()
                }
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="saveButton"
                onClick={handleSubmit(
                  onSubmit
                )}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="buttonSpinner" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave />
                    {isCreateMode ? 'Create Role' : 'Save Changes'}
                  </>
                )}
              </button>

            </div>
          </div>
        </div>

        {/* =================================================
            MODULE SELECTOR MODAL
        ================================================= */}

        {moduleSelectorOpen && (
          <div
            className="modalOverlay"
            onClick={() =>
              setModuleSelectorOpen(null)
            }
          >
            <div
              className="modal smallModal"
              onClick={e =>
                e.stopPropagation()
              }
            >
              <div className="modalHeader">
                <div>
                  <h3>
                    Select Module
                  </h3>

                  <p>
                    Choose where to manage
                    permissions
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setModuleSelectorOpen(
                      null
                    )
                  }
                >
                  <FiX />
                </button>
              </div>

              <div className="modalSearch">
                <FiSearch />

                <input
                  autoFocus
                  value={moduleSearch}
                  onChange={e =>
                    setModuleSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search modules..."
                />
              </div>

              <div className="moduleList">
                {filteredModules.map(
                  module => {
                    const color =
                      getModuleColor(
                        module
                      );

                    return (
                      <button
                        type="button"
                        key={module}
                        className="moduleOption"
                        onClick={() =>
                          selectModule(
                            module
                          )
                        }
                      >
                        <div
                          className="moduleOptionIcon"
                          style={{
                            color,
                            background:
                              `${color}12`,
                          }}
                        >
                          {getModuleIcon(
                            module
                          )}
                        </div>

                        <div>
                          <strong>
                            {formatModuleName(
                              module
                            )}
                          </strong>

                          <span>
                            Manage module
                            permissions
                          </span>
                        </div>

                        <FiChevronRight />
                      </button>
                    );
                  }
                )}

                {filteredModules.length ===
                  0 && (
                  <div className="modalEmpty">
                    <FiSearch />

                    <span>
                      No modules found
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            DEPARTMENT MODAL
        ================================================= */}

        {(addDeptModalOpen ||
          removeDeptModalOpen) && (
          <div
            className="modalOverlay"
            onClick={() => {
              setAddDeptModalOpen(false);
              setRemoveDeptModalOpen(false);
            }}
          >
            <div
              className="modal"
              onClick={e =>
                e.stopPropagation()
              }
            >
              <div className="modalHeader">
                <div>
                  <h3>
                    {addDeptModalOpen
                      ? 'Add Departments'
                      : 'Remove Departments'}
                  </h3>

                  <p>
                    {addDeptModalOpen
                      ? 'Select departments to grant access'
                      : 'Select departments to revoke access'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAddDeptModalOpen(
                      false
                    );
                    setRemoveDeptModalOpen(
                      false
                    );
                  }}
                >
                  <FiX />
                </button>
              </div>

              <div className="modalSearch">
                <FiSearch />

                <input
                  placeholder="Search departments..."
                  onChange={e => {
                    const input =
                      e.target.value.toLowerCase();

                    const rows =
                      document.querySelectorAll(
                        '[data-department-row]'
                      );

                    rows.forEach(row => {
                      const name =
                        row.textContent?.toLowerCase() ||
                        '';

                      (
                        row as HTMLElement
                      ).style.display =
                        name.includes(input)
                          ? 'flex'
                          : 'none';
                    });
                  }}
                />
              </div>

              <div className="departmentList">
                {loadingDepartments ? (
                  <div className="modalLoading">
                    <span className="spinner small" />

                    Loading departments...
                  </div>
                ) : (
                  allDepartments.map(
                    department => {
                      const isAdd =
                        addDeptModalOpen;

                      const selected =
                        isAdd
                          ? addDeptIds.includes(
                              department.department_id
                            )
                          : removeDeptIds.includes(
                              department.department_id
                            );

                      const color =
                        getModuleColor(
                          department.module_code
                        );

                      return (
                        <label
                          key={
                            department.department_id
                          }
                          data-department-row
                          className={
                            selected
                              ? 'departmentOption selected'
                              : 'departmentOption'
                          }
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              toggleDepartment(
                                department.department_id,
                                isAdd
                                  ? 'add'
                                  : 'remove'
                              )
                            }
                          />

                          <div
                            className="departmentIcon"
                            style={{
                              background:
                                `${color}12`,
                              color,
                            }}
                          >
                            {getModuleIcon(
                              department.module_code
                            )}
                          </div>

                          <div className="departmentInfo">
                            <strong>
                              {
                                department.department_name
                              }
                            </strong>

                            {department.module_code && (
                              <span>
                                {formatModuleName(
                                  department.module_code
                                )}
                              </span>
                            )}
                          </div>

                          <div className="customCheck">
                            {selected && (
                              <FiCheck />
                            )}
                          </div>
                        </label>
                      );
                    }
                  )
                )}
              </div>

              <div className="modalFooter">
                <span>
                  {(
                    addDeptModalOpen
                      ? addDeptIds
                      : removeDeptIds
                  ).length}{' '}
                  selected
                </span>

                <button
                  type="button"
                  className="modalDoneButton"
                  onClick={() => {
                    setAddDeptModalOpen(
                      false
                    );
                    setRemoveDeptModalOpen(
                      false
                    );
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            PERMISSION MODAL
        ================================================= */}

        {(addPermissionModalOpen ||
          removePermissionModalOpen) && (
          <div
            className="modalOverlay"
            onClick={() => {
              setAddPermissionModalOpen(
                false
              );
              setRemovePermissionModalOpen(
                false
              );
            }}
          >
            <div
              className="modal permissionModal"
              onClick={e =>
                e.stopPropagation()
              }
            >
              <div className="modalHeader">
                <div>
                  <h3>
                    {addPermissionModalOpen
                      ? 'Add Permissions'
                      : 'Remove Permissions'}
                  </h3>

                  <p>
                    {getModuleIcon(
                      addPermissionModalOpen
                        ? addModule
                        : removeModule
                    )}{' '}
                    {formatModuleName(
                      addPermissionModalOpen
                        ? addModule
                        : removeModule
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAddPermissionModalOpen(
                      false
                    );
                    setRemovePermissionModalOpen(
                      false
                    );
                  }}
                >
                  <FiX />
                </button>
              </div>

              <div className="modalSearch">
                <FiSearch />

                <input
                  autoFocus
                  placeholder="Search permissions..."
                  value={
                    addPermissionModalOpen
                      ? addSearchQuery
                      : removeSearchQuery
                  }
                  onChange={e => {
                    if (
                      addPermissionModalOpen
                    ) {
                      setAddSearchQuery(
                        e.target.value
                      );
                    } else {
                      setRemoveSearchQuery(
                        e.target.value
                      );
                    }
                  }}
                />
              </div>

              <PermissionModalList
                items={
                  addPermissionModalOpen
                    ? addPermissionsList
                    : removePermissionsList
                }
                loading={
                  addPermissionModalOpen
                    ? loadingAddPermissions
                    : loadingRemovePermissions
                }
                query={
                  addPermissionModalOpen
                    ? addSearchQuery
                    : removeSearchQuery
                }
                selected={
                  addPermissionModalOpen
                    ? tempAddPermissions
                    : tempRemovePermissions
                }
                onToggle={
                  addPermissionModalOpen
                    ? toggleTempAddPermission
                    : toggleTempRemovePermission
                }
              />

              <div className="modalFooter">
                <span>
                  {(
                    addPermissionModalOpen
                      ? tempAddPermissions
                      : tempRemovePermissions
                  ).length}{' '}
                  selected
                </span>

                <div className="modalFooterActions">
                  <button
                    type="button"
                    className="cancelModalButton"
                    onClick={() => {
                      setAddPermissionModalOpen(
                        false
                      );
                      setRemovePermissionModalOpen(
                        false
                      );
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className={
                      addPermissionModalOpen
                        ? 'modalDoneButton'
                        : 'modalDoneButton danger'
                    }
                    onClick={
                      addPermissionModalOpen
                        ? confirmAddPermissions
                        : confirmRemovePermissions
                    }
                  >
                    <FiCheck />
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      <style jsx>{styles}</style>
    </>
  );
}

// =========================================================
// PERMISSION MODAL LIST
// =========================================================

function PermissionModalList({
  items,
  loading,
  query,
  selected,
  onToggle,
}: {
  items: PermissionItem[];
  loading: boolean;
  query: string;
  selected: string[];
  onToggle: (permission: string) => void;
}) {
  if (loading) {
    return (
      <div className="modalLoading">
        <span className="spinner small" />
        Loading permissions...
      </div>
    );
  }

  const filtered = items.filter(
    permission => {
      const search =
        query.toLowerCase();

      return (
        permission.permission_name
          .toLowerCase()
          .includes(search) ||
        permission.description
          ?.toLowerCase()
          .includes(search)
      );
    }
  );

  if (filtered.length === 0) {
    return (
      <div className="modalEmpty">
        <FiKey />

        <strong>
          No permissions found
        </strong>

        <span>
          Try a different search term.
        </span>
      </div>
    );
  }

  return (
    <div className="permissionModalList">
      {filtered.map(permission => {
        const checked =
          selected.includes(
            permission.permission_name
          );

        const color =
          getModuleColor(
            permission.module
          );

        return (
          <label
            key={
              permission.permission_name
            }
            className={
              checked
                ? 'permissionOption selected'
                : 'permissionOption'
            }
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() =>
                onToggle(
                  permission.permission_name
                )
              }
            />

            <div
              className="permissionOptionIcon"
              style={{
                background:
                  `${color}12`,
                color,
              }}
            >
              <FiKey />
            </div>

            <div className="permissionOptionInfo">
              <strong>
                {permission.permission_name}
              </strong>

              <span>
                {permission.description ||
                  'No description available'}
              </span>
            </div>

            <div className="customCheck">
              {checked && <FiCheck />}
            </div>
          </label>
        );
      })}
    </div>
  );
}

// =========================================================
// STYLES (unchanged)
// =========================================================

const styles = `
  * {
    box-sizing: border-box;
  }

  .rolePage {
    min-height: 100vh;

    background:
      radial-gradient(
        circle at 0% 0%,
        rgba(123,47,190,0.045),
        transparent 28%
      ),
      #f7f9fc;

    color: #172033;

    font-family:
      Inter,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;

    padding-bottom: 105px;
  }

  /* =====================================================
     HEADER
  ===================================================== */

  .pageHeader {
    position: relative;

    background: rgba(255,255,255,0.96);

    border-bottom: 1px solid #e5eaf1;

    box-shadow:
      0 2px 12px rgba(15,23,42,0.035);
  }

  .headerInner {
    width: min(1200px, calc(100% - 48px));

    min-height: 112px;

    margin: 0 auto;

    display: flex;
    align-items: center;

    gap: 16px;
  }

  .headerAccent {
    position: absolute;

    left: 0;
    bottom: 0;

    width: 100%;
    height: 3px;

    background:
      linear-gradient(
        90deg,
        #2563eb,
        #7b2fbe
      );
  }

  .backButton {
    all: unset;

    width: 42px;
    height: 42px;

    display: flex;
    align-items: center;
    justify-content: center;

    border: 1px solid #e2e8f0;
    border-radius: 11px;

    background: #fff;
    color: #64748b;

    cursor: pointer;

    transition:
      color .18s ease,
      background .18s ease,
      transform .18s ease;
  }

  .backButton:hover {
    color: #2563eb;
    background: #eff6ff;
    transform: translateX(-2px);
  }

  .backButton svg {
    width: 19px;
    height: 19px;
  }

  .headerIcon {
    width: 58px;
    height: 58px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 15px;

    background: #eef2ff;
    color: #6366f1;

    flex-shrink: 0;
  }

  .headerIcon svg {
    width: 27px;
    height: 27px;
  }

  .headerText {
    min-width: 0;
    flex: 1;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 5px;

    margin-bottom: 5px;

    color: #94a3b8;

    font-size: 11px;
    font-weight: 600;
  }

  .breadcrumb svg {
    width: 12px;
    height: 12px;
  }

  .headerText h1 {
    margin: 0;

    color: #172033;

    font-size: 27px;
    line-height: 1.15;

    font-weight: 750;

    letter-spacing: -.5px;
  }

  .headerText p {
    margin: 5px 0 0;

    color: #64748b;

    font-size: 12px;
  }

  .systemBadge {
    display: flex;
    align-items: center;
    gap: 7px;

    padding: 8px 11px;

    border: 1px solid #fed7aa;
    border-radius: 9px;

    background: #fff7ed;
    color: #c2410c;

    font-size: 11px;
    font-weight: 700;

    white-space: nowrap;
  }

  .systemBadge svg {
    width: 14px;
    height: 14px;
  }

  /* =====================================================
     CONTENT
  ===================================================== */

  .content {
    width: min(1000px, calc(100% - 48px));

    margin: 0 auto;

    padding: 32px 0 40px;
  }

  /* =====================================================
     ERROR
  ===================================================== */

  .errorBanner {
    display: flex;
    align-items: center;
    gap: 12px;

    padding: 13px 15px;

    margin-bottom: 18px;

    border: 1px solid #fecaca;
    border-radius: 11px;

    background: #fef2f2;
    color: #991b1b;
  }

  .errorBannerIcon {
    width: 34px;
    height: 34px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;

    background: #fee2e2;
    color: #dc2626;

    flex-shrink: 0;
  }

  .errorBannerIcon svg {
    width: 17px;
    height: 17px;
  }

  .errorBanner strong {
    font-size: 12px;
  }

  .errorBanner p {
    margin: 2px 0 0;

    font-size: 11px;
    color: #b91c1c;
  }

  .errorBanner button {
    all: unset;

    margin-left: auto;

    width: 28px;
    height: 28px;

    display: flex;
    align-items: center;
    justify-content: center;

    cursor: pointer;
  }

  /* =====================================================
     SYSTEM NOTICE
  ===================================================== */

  .systemNotice {
    display: flex;
    align-items: flex-start;
    gap: 12px;

    padding: 14px 16px;

    margin-bottom: 18px;

    border: 1px solid #fed7aa;
    border-radius: 12px;

    background: #fffaf5;
  }

  .noticeIcon {
    width: 34px;
    height: 34px;

    display: flex;
    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    border-radius: 9px;

    background: #ffedd5;
    color: #ea580c;
  }

  .noticeIcon svg {
    width: 17px;
    height: 17px;
  }

  .systemNotice strong {
    color: #9a3412;

    font-size: 12px;
  }

  .systemNotice p {
    margin: 3px 0 0;

    color: #c2410c;

    font-size: 11px;
    line-height: 1.5;
  }

  /* =====================================================
     SECTION CARD
  ===================================================== */

  .sectionCard {
    padding: 25px;

    margin-bottom: 18px;

    border: 1px solid #e4e9f0;
    border-radius: 16px;

    background: #ffffff;

    box-shadow:
      0 3px 10px rgba(15,23,42,0.025);
  }

  .sectionHeader {
    display: flex;
    align-items: center;
    gap: 12px;

    padding-bottom: 20px;

    border-bottom: 1px solid #edf0f4;
  }

  .sectionHeaderIcon {
    width: 43px;
    height: 43px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 11px;

    flex-shrink: 0;
  }

  .sectionHeaderIcon svg {
    width: 19px;
    height: 19px;
  }

  .sectionHeaderIcon.blue {
    color: #2563eb;
    background: #eff6ff;
  }

  .sectionHeaderIcon.purple {
    color: #7c3aed;
    background: #f5f3ff;
  }

  .sectionHeaderIcon.orange {
    color: #ea580c;
    background: #fff7ed;
  }

  .sectionHeader h2 {
    margin: 0;

    color: #1e293b;

    font-size: 16px;
    font-weight: 700;
  }

  .sectionHeader p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 11px;
  }

  .countBadge {
    margin-left: auto;

    display: flex;
    align-items: baseline;
    gap: 5px;

    color: #475569;

    font-size: 16px;
    font-weight: 750;
  }

  .countBadge span {
    color: #94a3b8;

    font-size: 10px;
    font-weight: 600;
  }

  /* =====================================================
     FORM
  ===================================================== */

  .formGrid {
    display: grid;

    grid-template-columns:
      repeat(2, minmax(0,1fr));

    gap: 20px;

    padding-top: 21px;
  }

  .field {
    min-width: 0;
  }

  .field.full {
    grid-column: 1 / -1;
  }

  .field label {
    display: flex;
    align-items: center;
    gap: 4px;

    margin-bottom: 7px;

    color: #475569;

    font-size: 11px;
    font-weight: 650;
  }

  .field label span {
    color: #ef4444;
  }

  .field label em {
    margin-left: 4px;

    color: #94a3b8;

    font-size: 9px;
    font-style: normal;
    font-weight: 500;
  }

  .input,
  .field textarea {
    width: 100%;

    border: 1px solid #dfe5ed;
    border-radius: 9px;

    background: #fff;

    color: #1e293b;

    outline: none;

    font-family: inherit;
    font-size: 13px;

    transition:
      border-color .18s ease,
      box-shadow .18s ease;
  }

  .input {
    height: 43px;

    padding: 0 12px;
  }

  .field textarea {
    padding: 11px 12px;

    resize: vertical;

    line-height: 1.5;
  }

  .input:focus,
  .field textarea:focus {
    border-color: #7b2fbe;

    box-shadow:
      0 0 0 3px rgba(123,47,190,.08);
  }

  .input.error {
    border-color: #ef4444;
  }

  .fieldError {
    display: block;

    margin-top: 5px;

    color: #dc2626;

    font-size: 10px;
  }

  .levelInput {
    position: relative;
  }

  .levelInput input {
    width: 100%;
    height: 43px;

    padding: 0 65px 0 12px;

    border: 1px solid #dfe5ed;
    border-radius: 9px;

    outline: none;

    color: #1e293b;

    font-size: 13px;
  }

  .levelInput input:focus {
    border-color: #7b2fbe;

    box-shadow:
      0 0 0 3px rgba(123,47,190,.08);
  }

  .levelInput span {
    position: absolute;

    top: 50%;
    right: 12px;

    transform: translateY(-50%);

    color: #94a3b8;

    font-size: 9px;
    font-weight: 600;
  }

  /* =====================================================
     SUB SECTION
  ===================================================== */

  .subSection {
    padding-top: 20px;
  }

  .subSectionTitle {
    display: flex;
    align-items: center;
    gap: 7px;

    margin-bottom: 11px;

    color: #475569;

    font-size: 11px;
    font-weight: 700;
  }

  .smallCount {
    min-width: 20px;
    height: 20px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 6px;

    background: #f1f5f9;

    color: #64748b;

    font-size: 9px;
  }

  .emptyInline {
    min-height: 72px;

    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    border: 1px dashed #dbe2ea;
    border-radius: 10px;

    color: #94a3b8;

    font-size: 11px;
  }

  .emptyInline svg {
    width: 16px;
    height: 16px;
  }

  /* =====================================================
     DEPARTMENT TAGS
  ===================================================== */

  .tagGrid {
    display: grid;

    grid-template-columns:
      repeat(2, minmax(0,1fr));

    gap: 9px;
  }

  .accessTag {
    position: relative;

    display: flex;
    align-items: center;

    min-width: 0;

    padding: 9px;

    border: 1px solid #e6ebf1;
    border-radius: 11px;

    background: #fafbfd;

    transition:
      border-color .18s ease,
      background .18s ease;
  }

  .accessTag:hover {
    border-color: #cbd5e1;
  }

  .accessTag.removing {
    border-color: #fecaca;
    background: #fff7f7;
  }

  .tagIcon {
    width: 36px;
    height: 36px;

    display: flex;
    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    border-radius: 9px;

    font-size: 17px;
  }

  .tagText {
    min-width: 0;

    display: flex;
    flex-direction: column;

    margin-left: 9px;
  }

  .tagText strong {
    overflow: hidden;

    color: #334155;

    font-size: 11px;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tagText span {
    margin-top: 2px;

    color: #94a3b8;

    font-size: 9px;
  }

  .tagAction {
    all: unset;

    width: 27px;
    height: 27px;

    margin-left: auto;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 7px;

    color: #94a3b8;

    cursor: pointer;

    transition:
      color .18s ease,
      background .18s ease;
  }

  .tagAction:hover {
    color: #ef4444;
    background: #fee2e2;
  }

  .accessTag.removing .tagAction {
    color: #16a34a;
    background: #dcfce7;
  }

  .tagAction svg {
    width: 13px;
    height: 13px;
  }

  /* =====================================================
     MANAGEMENT BUTTONS
  ===================================================== */

  .actionGrid {
    display: grid;

    grid-template-columns:
      repeat(2, minmax(0,1fr));

    gap: 11px;

    margin-top: 18px;
  }

  .managementButton {
    position: relative;

    all: unset;

    min-width: 0;

    display: flex;
    align-items: center;

    gap: 10px;

    padding: 13px;

    border: 1px solid #e2e8f0;
    border-radius: 11px;

    cursor: pointer;

    transition:
      transform .18s ease,
      border-color .18s ease,
      background .18s ease;
  }

  .managementButton:hover {
    transform: translateY(-2px);
  }

  .managementButton.add:hover {
    border-color: #bbf7d0;
    background: #f6fff8;
  }

  .managementButton.remove:hover {
    border-color: #fecaca;
    background: #fff8f8;
  }

  .managementIcon {
    width: 35px;
    height: 35px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;
  }

  .managementButton.add .managementIcon {
    background: #dcfce7;
    color: #16a34a;
  }

  .managementButton.remove .managementIcon {
    background: #fee2e2;
    color: #dc2626;
  }

  .managementIcon svg {
    width: 17px;
    height: 17px;
  }

  .managementButton div:nth-child(2) {
    display: flex;
    flex-direction: column;

    min-width: 0;
  }

  .managementButton strong {
    color: #334155;

    font-size: 11px;
  }

  .managementButton span {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 9px;
  }

  .managementButton b {
    margin-left: auto;

    min-width: 22px;
    height: 22px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 7px;

    background: #f1f5f9;

    color: #64748b;

    font-size: 9px;
  }

  /* =====================================================
     PERMISSIONS
  ===================================================== */

  .permissionList {
    display: flex;
    flex-direction: column;

    gap: 7px;
  }

  .permissionRow {
    display: flex;
    align-items: center;

    min-width: 0;

    padding: 9px;

    border: 1px solid #e7ebf0;
    border-radius: 10px;

    background: #fafbfd;
  }

  .permissionRow.removing {
    border-color: #fecaca;
    background: #fff7f7;
  }

  .permissionModuleIcon {
    width: 35px;
    height: 35px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;

    flex-shrink: 0;
  }

  .permissionModuleIcon svg {
    width: 16px;
    height: 16px;
  }

  .permissionInfo {
    min-width: 0;
    flex: 1;

    display: flex;
    flex-direction: column;

    margin-left: 10px;
  }

  .permissionInfo strong {
    overflow: hidden;

    color: #334155;

    font-size: 11px;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .permissionInfo span {
    overflow: hidden;

    margin-top: 3px;

    color: #94a3b8;

    font-size: 9px;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .modulePill {
    margin: 0 10px;

    padding: 5px 7px;

    border-radius: 6px;

    font-size: 8px;
    font-weight: 700;

    white-space: nowrap;
  }

  .permissionRemove {
    all: unset;

    width: 27px;
    height: 27px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 7px;

    color: #94a3b8;

    cursor: pointer;
  }

  .permissionRemove:hover {
    background: #fee2e2;
    color: #ef4444;
  }

  .permissionRow.removing .permissionRemove {
    background: #dcfce7;
    color: #16a34a;
  }

  .permissionRemove svg {
    width: 13px;
    height: 13px;
  }

  .permissionActions {
    display: grid;

    grid-template-columns:
      repeat(2, minmax(0,1fr));

    gap: 12px;

    margin-top: 20px;
  }

  .permissionActionCard {
    padding: 15px;

    border: 1px solid #e4e9f0;
    border-radius: 12px;

    background: #fafbfd;
  }

  .permissionActionCard.add {
    border-color: #dcfce7;
    background: #fbfffc;
  }

  .permissionActionCard.remove {
    border-color: #fee2e2;
    background: #fffdfd;
  }

  .permissionActionHeader {
    display: flex;
    align-items: center;
    gap: 9px;

    margin-bottom: 13px;
  }

  .permissionActionIcon {
    width: 34px;
    height: 34px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;
  }

  .permissionActionCard.add
    .permissionActionIcon {
    background: #dcfce7;
    color: #16a34a;
  }

  .permissionActionCard.remove
    .permissionActionIcon {
    background: #fee2e2;
    color: #dc2626;
  }

  .permissionActionIcon svg {
    width: 16px;
    height: 16px;
  }

  .permissionActionHeader h3 {
    margin: 0;

    color: #334155;

    font-size: 11px;
  }

  .permissionActionHeader p {
    margin: 3px 0 0;

    color: #94a3b8;

    font-size: 9px;
  }

  .moduleSelect {
    all: unset;

    width: 100%;

    height: 40px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    padding: 0 11px;

    border: 1px solid #dfe5ed;
    border-radius: 8px;

    background: #fff;

    color: #64748b;

    cursor: pointer;

    font-size: 10px;
  }

  .moduleSelect:hover {
    border-color: #cbd5e1;
  }

  .moduleSelect svg {
    width: 14px;
    height: 14px;
  }

  .choosePermissionButton {
    all: unset;

    width: 100%;

    height: 38px;

    margin-top: 8px;

    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;

    border-radius: 8px;

    cursor: pointer;

    font-size: 10px;
    font-weight: 650;
  }

  .choosePermissionButton.add {
    background: #16a34a;
    color: white;
  }

  .choosePermissionButton.remove {
    background: #dc2626;
    color: white;
  }

  .choosePermissionButton:hover {
    filter: brightness(.96);
  }

  .choosePermissionButton svg {
    width: 14px;
    height: 14px;
  }

  .choosePermissionButton span {
    min-width: 18px;
    height: 18px;

    display: flex;
    align-items: center;
    justify-content: center;

    margin-left: 2px;

    border-radius: 5px;

    background: rgba(255,255,255,.18);

    font-size: 8px;
  }

  .selectedPermissionTags {
    display: flex;
    flex-wrap: wrap;

    gap: 5px;

    margin-top: 9px;
  }

  .selectedTag {
    max-width: 100%;

    display: inline-flex;
    align-items: center;
    gap: 4px;

    padding: 5px 7px;

    border-radius: 6px;

    font-size: 8px;
    font-weight: 600;
  }

  .selectedTag.add {
    background: #dcfce7;
    color: #166534;
  }

  .selectedTag.remove {
    background: #fee2e2;
    color: #991b1b;
  }

  .selectedTag button {
    all: unset;

    display: flex;

    cursor: pointer;
  }

  .selectedTag button svg {
    width: 10px;
    height: 10px;
  }

  /* =====================================================
     SAVE BAR
  ===================================================== */

  .saveBar {
    position: fixed;

    left: 0;
    bottom: 0;

    z-index: 40;

    width: 100%;

    border-top: 1px solid #e2e8f0;

    background: rgba(255,255,255,.94);

    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);

    box-shadow:
      0 -5px 20px rgba(15,23,42,.05);
  }

  .saveBarInner {
    width: min(1000px, calc(100% - 48px));

    min-height: 68px;

    margin: 0 auto;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;
  }

  .saveStatus {
    display: flex;
    align-items: center;
    gap: 7px;

    color: #94a3b8;

    font-size: 10px;
    font-weight: 550;
  }

  .saveDot {
    width: 7px;
    height: 7px;

    border-radius: 50%;

    background: #cbd5e1;
  }

  .saveActions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cancelButton,
  .saveButton {
    height: 39px;

    padding: 0 15px;

    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;

    border-radius: 8px;

    cursor: pointer;

    font-family: inherit;
    font-size: 10px;
    font-weight: 650;
  }

  .cancelButton {
    border: 1px solid #dfe5ed;

    background: #fff;

    color: #64748b;
  }

  .saveButton {
    border: none;

    background:
      linear-gradient(
        135deg,
        #2563eb,
        #7b2fbe
      );

    color: white;

    box-shadow:
      0 5px 13px rgba(88,61,180,.18);
  }

  .saveButton:hover {
    filter: brightness(.97);
  }

  .saveButton:disabled,
  .cancelButton:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .saveButton svg {
    width: 14px;
    height: 14px;
  }

  .buttonSpinner {
    width: 13px;
    height: 13px;

    border: 2px solid rgba(255,255,255,.35);
    border-top-color: #fff;

    border-radius: 50%;

    animation: spin .7s linear infinite;
  }

  /* =====================================================
     MODALS
  ===================================================== */

  .modalOverlay {
    position: fixed;

    inset: 0;

    z-index: 100;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 20px;

    background: rgba(15,23,42,.42);

    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
  }

  .modal {
    width: min(560px, 100%);
    max-height: min(720px, 90vh);

    display: flex;
    flex-direction: column;

    overflow: hidden;

    border: 1px solid #e2e8f0;
    border-radius: 17px;

    background: #fff;

    box-shadow:
      0 25px 70px rgba(15,23,42,.2);
  }

  .smallModal {
    width: min(430px, 100%);
  }

  .permissionModal {
    width: min(650px, 100%);
  }

  .modalHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;

    gap: 15px;

    padding: 19px 20px;

    border-bottom: 1px solid #edf0f4;
  }

  .modalHeader h3 {
    margin: 0;

    color: #1e293b;

    font-size: 15px;
    font-weight: 700;
  }

  .modalHeader p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 10px;
  }

  .modalHeader > button {
    all: unset;

    width: 31px;
    height: 31px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    color: #94a3b8;

    cursor: pointer;
  }

  .modalHeader > button:hover {
    background: #f1f5f9;
    color: #475569;
  }

  .modalHeader > button svg {
    width: 16px;
    height: 16px;
  }

  .modalSearch {
    height: 40px;

    margin: 12px 15px 7px;

    display: flex;
    align-items: center;

    gap: 8px;

    padding: 0 11px;

    border: 1px solid #e1e7ee;
    border-radius: 9px;

    background: #f8fafc;
  }

  .modalSearch svg {
    width: 15px;
    height: 15px;

    color: #94a3b8;

    flex-shrink: 0;
  }

  .modalSearch input {
    width: 100%;

    border: none;
    outline: none;

    background: transparent;

    color: #334155;

    font-family: inherit;
    font-size: 11px;
  }

  .modalSearch input::placeholder {
    color: #a3adba;
  }

  .moduleList,
  .departmentList,
  .permissionModalList {
    overflow-y: auto;

    padding: 7px 15px 12px;

    flex: 1;
  }

  .moduleOption {
    all: unset;

    width: 100%;

    display: flex;
    align-items: center;

    gap: 10px;

    padding: 9px;

    border-radius: 10px;

    cursor: pointer;

    transition:
      background .15s ease;
  }

  .moduleOption:hover {
    background: #f8fafc;
  }

  .moduleOptionIcon {
    width: 38px;
    height: 38px;

    display: flex;
    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    border-radius: 10px;

    font-size: 18px;
  }

  .moduleOption > div:nth-child(2) {
    min-width: 0;
    flex: 1;

    display: flex;
    flex-direction: column;
  }

  .moduleOption strong {
    color: #334155;

    font-size: 11px;
  }

  .moduleOption span {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 9px;
  }

  .moduleOption > svg {
    width: 15px;
    height: 15px;

    color: #cbd5e1;
  }

  /* =====================================================
     DEPARTMENT OPTIONS
  ===================================================== */

  .departmentOption,
  .permissionOption {
    position: relative;

    display: flex;
    align-items: center;

    gap: 9px;

    padding: 9px;

    margin-bottom: 4px;

    border: 1px solid transparent;
    border-radius: 10px;

    cursor: pointer;

    transition:
      background .15s ease,
      border-color .15s ease;
  }

  .departmentOption:hover,
  .permissionOption:hover {
    background: #f8fafc;
  }

  .departmentOption.selected,
  .permissionOption.selected {
    border-color: #dbeafe;
    background: #f8fbff;
  }

  .departmentOption input,
  .permissionOption input {
    position: absolute;

    opacity: 0;

    pointer-events: none;
  }

  .departmentIcon,
  .permissionOptionIcon {
    width: 37px;
    height: 37px;

    display: flex;
    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    border-radius: 9px;
  }

  .departmentInfo,
  .permissionOptionInfo {
    min-width: 0;
    flex: 1;

    display: flex;
    flex-direction: column;
  }

  .departmentInfo strong,
  .permissionOptionInfo strong {
    overflow: hidden;

    color: #334155;

    font-size: 11px;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .departmentInfo span,
  .permissionOptionInfo span {
    overflow: hidden;

    margin-top: 3px;

    color: #94a3b8;

    font-size: 9px;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .customCheck {
    width: 20px;
    height: 20px;

    display: flex;
    align-items: center;
    justify-content: center;

    border: 1px solid #d5dce5;
    border-radius: 6px;

    color: white;

    flex-shrink: 0;
  }

  .selected .customCheck {
    border-color: #2563eb;
    background: #2563eb;
  }

  .customCheck svg {
    width: 12px;
    height: 12px;
  }

  /* =====================================================
     PERMISSION OPTIONS
  ===================================================== */

  .permissionOptionIcon svg {
    width: 16px;
    height: 16px;
  }

  .permissionOptionInfo {
    padding-right: 5px;
  }

  .modalEmpty {
    min-height: 180px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    gap: 6px;

    color: #94a3b8;

    text-align: center;
  }

  .modalEmpty svg {
    width: 24px;
    height: 24px;

    margin-bottom: 4px;

    color: #cbd5e1;
  }

  .modalEmpty strong {
    color: #64748b;

    font-size: 11px;
  }

  .modalEmpty span {
    font-size: 9px;
  }

  .modalLoading {
    min-height: 180px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 9px;

    color: #94a3b8;

    font-size: 10px;
  }

  .spinner.small {
    width: 18px;
    height: 18px;

    border-width: 2px;
  }

  .modalFooter {
    min-height: 62px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 15px;

    padding: 11px 15px;

    border-top: 1px solid #edf0f4;

    background: #fafbfd;

    color: #94a3b8;

    font-size: 9px;
    font-weight: 600;
  }

  .modalFooterActions {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .cancelModalButton,
  .modalDoneButton {
    height: 35px;

    padding: 0 13px;

    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;

    border-radius: 8px;

    cursor: pointer;

    font-family: inherit;

    font-size: 9px;
    font-weight: 650;
  }

  .cancelModalButton {
    border: 1px solid #dfe5ed;

    background: white;

    color: #64748b;
  }

  .modalDoneButton {
    border: none;

    background: #2563eb;

    color: white;
  }

  .modalDoneButton.danger {
    background: #dc2626;
  }

  .modalDoneButton svg {
    width: 13px;
    height: 13px;
  }

  /* =====================================================
     LOADING / STATE
  ===================================================== */

  .loadingPage,
  .statePage {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loadingCard,
  .stateCard {
    width: min(390px, calc(100% - 40px));

    padding: 40px 30px;

    display: flex;
    flex-direction: column;
    align-items: center;

    border: 1px solid #e5eaf1;
    border-radius: 17px;

    background: white;

    box-shadow:
      0 15px 40px rgba(15,23,42,.06);

    text-align: center;
  }

  .spinner {
    width: 38px;
    height: 38px;

    border: 3px solid #e8edf3;
    border-top-color: #7b2fbe;

    border-radius: 50%;

    animation: spin .75s linear infinite;
  }

  .loadingCard h2,
  .stateCard h2 {
    margin: 20px 0 0;

    color: #1e293b;

    font-size: 18px;
  }

  .loadingCard p,
  .stateCard p {
    margin: 7px 0 0;

    color: #94a3b8;

    font-size: 11px;
    line-height: 1.5;
  }

  .stateIcon {
    width: 62px;
    height: 62px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 16px;

    background: #eef2ff;
    color: #6366f1;
  }

  .stateIcon svg {
    width: 28px;
    height: 28px;
  }

  .primaryButton {
    all: unset;

    margin-top: 22px;

    height: 38px;

    padding: 0 15px;

    display: flex;
    align-items: center;
    gap: 7px;

    border-radius: 8px;

    background: #7b2fbe;

    color: white;

    cursor: pointer;

    font-size: 10px;
    font-weight: 650;
  }

  .primaryButton svg {
    width: 14px;
    height: 14px;
  }

  /* =====================================================
     ANIMATION
  ===================================================== */

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  /* =====================================================
     RESPONSIVE
  ===================================================== */

  @media (max-width: 850px) {
    .tagGrid,
    .actionGrid,
    .permissionActions,
    .formGrid {
      grid-template-columns: 1fr;
    }

    .field.full {
      grid-column: auto;
    }

    .modulePill {
      display: none;
    }

    .systemBadge {
      display: none;
    }
  }

  @media (max-width: 600px) {
    .headerInner,
    .content,
    .saveBarInner {
      width: calc(100% - 28px);
    }

    .headerInner {
      min-height: 96px;
    }

    .headerIcon {
      width: 47px;
      height: 47px;
    }

    .headerIcon svg {
      width: 22px;
      height: 22px;
    }

    .headerText h1 {
      font-size: 22px;
    }

    .breadcrumb {
      display: none;
    }

    .content {
      padding-top: 20px;
    }

    .sectionCard {
      padding: 18px;
      border-radius: 14px;
    }

    .sectionHeader {
      padding-bottom: 16px;
    }

    .sectionHeaderIcon {
      width: 38px;
      height: 38px;
    }

    .sectionHeader h2 {
      font-size: 14px;
    }

    .countBadge {
      display: none;
    }

    .permissionRow {
      align-items: flex-start;
    }

    .permissionInfo span {
      white-space: normal;
    }

    .saveBarInner {
      min-height: 64px;
    }

    .saveStatus {
      display: none;
    }

    .saveActions {
      width: 100%;
    }

    .cancelButton,
    .saveButton {
      flex: 1;
    }

    .modalOverlay {
      align-items: flex-end;
      padding: 0;
    }

    .modal {
      width: 100%;
      max-height: 88vh;

      border-radius: 18px 18px 0 0;
    }
  }
`;