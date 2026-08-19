import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  FiArrowLeft,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiEdit3,
  FiKey,
  FiMinus,
  FiPlus,
  FiSearch,
  FiShield,
  FiUsers,
  FiX,
  FiSave,
  FiAlertTriangle,
  FiInfo,
  FiChevronLeft,
} from 'react-icons/fi';

// ✅ Only import axiosInstance – no idempotent wrappers
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
// SCHEMA (only for basic info)
// =========================================================

const schema = z.object({
  role_name: z.string().min(1, 'Role name is required'),
  role_level: z
    .string()
    .min(1, 'Role level is required')
    .refine(
      (value) => {
        const num = Number(value);
        return Number.isInteger(num) && num >= 1 && num <= 1000;
      },
      { message: 'Level must be between 1 and 1000' }
    ),
  description: z.string().nullable().optional(),
});

type FormData = z.infer<typeof schema>;

// =========================================================
// MODULE HELPERS (unchanged)
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
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// =========================================================
// COMPONENT
// =========================================================

export default function EditRoleScreen() {
  const router = useRouter();
  const { roleId } = router.query;
  const isCreateMode = !roleId || roleId === 'new';

  const { accessToken, deviceId, companyId } = useUserAuthStore();

  // ---------- Helper for headers ----------
  const getHeaders = useCallback(() => ({
    'X-Company-ID': companyId!,
    'X-Device-ID': deviceId!,
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken!}`,
  }), [companyId, deviceId, accessToken]);

  // ---------- Basic info form ----------
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      role_name: '',
      role_level: '',
      description: '',
    },
  });

  // ---------- State ----------
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSystemRole, setIsSystemRole] = useState(false);
  const [roleNotFound, setRoleNotFound] = useState(false);

  // Departments
  const [allDepartments, setAllDepartments] = useState<DepartmentItem[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  // Department & permission selections
  const [originalDepartmentIds, setOriginalDepartmentIds] = useState<string[]>([]);
  const [originalPermissionNames, setOriginalPermissionNames] = useState<string[]>([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({});

  // Permission cache (module -> PermissionItem[])
  const [permissionCache, setPermissionCache] = useState<Record<string, PermissionItem[]>>({});
  const permissionsLoadedRef = useRef<Record<string, boolean>>({});

  // Department modal
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [tempDeptIds, setTempDeptIds] = useState<string[]>([]);
  const [departmentSearch, setDepartmentSearch] = useState('');

  // Permission modal
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [currentModule, setCurrentModule] = useState<string | null>(null);
  const [tempPermsForModule, setTempPermsForModule] = useState<string[]>([]);
  const [permissionSearch, setPermissionSearch] = useState('');

  // To avoid double fetch
  const fetchedRef = useRef(false);

  // ---------- Load all module permissions (cached) ----------
  const loadAllModulePermissions = useCallback(
    async (departments: DepartmentItem[]) => {
      if (!accessToken || !companyId || !deviceId) return;

      const moduleCodes = Array.from(
        new Set(
          departments
            .map((dept) => dept.module_code)
            .filter((code): code is string => !!code)
        )
      );

      const modulesToLoad = moduleCodes.filter(
        (moduleCode) => !permissionsLoadedRef.current[moduleCode]
      );

      if (modulesToLoad.length === 0) return;

      try {
        const results = await Promise.all(
          modulesToLoad.map(async (moduleCode) => {
            const response = await axiosInstance.get(
              `/companies/${companyId}/hr/permissions/module/${moduleCode}`,
              { headers: getHeaders() }
            );
            const permissions = response.data?.data || response.data || [];
            return { moduleCode, permissions };
          })
        );

        setPermissionCache((prev) => {
          const next = { ...prev };
          results.forEach(({ moduleCode, permissions }) => {
            next[moduleCode] = permissions;
            permissionsLoadedRef.current[moduleCode] = true;
          });
          return next;
        });
      } catch (error) {
        console.error('Failed to load module permissions:', error);
        setError('Could not load all permissions. Some may be missing.');
      }
    },
    [accessToken, companyId, deviceId, getHeaders]
  );

  // ---------- Initial data fetch ----------
  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken || !companyId || !deviceId) {
        setError('Missing authentication information.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadingDepartments(true);
      setError(null);

      try {
        // 1) Load departments
        const deptRes = await axiosInstance.get(
          `/companies/${companyId}/departments/root`,  // 🔁 adjust if needed
          { headers: getHeaders() }
        );
        const departments = deptRes.data?.data || deptRes.data || [];
        setAllDepartments(departments);

        // 2) Load all module permissions (cached)
        await loadAllModulePermissions(departments);

        // 3) Create mode
        if (isCreateMode) {
          reset({
            role_name: '',
            role_level: '',
            description: '',
          });
          setSelectedDepartmentIds([]);
          setSelectedPermissions({});
          setOriginalDepartmentIds([]);
          setOriginalPermissionNames([]);
          setIsSystemRole(false);
          setLoading(false);
          setLoadingDepartments(false);
          fetchedRef.current = true;
          return;
        }

        // 4) Edit mode
        const [roleRes, permRes, roleDeptRes] = await Promise.all([
          axiosInstance.get(
            `/companies/${companyId}/rbac/roles/${roleId}`,
            { headers: getHeaders() }
          ),
          axiosInstance.get(
            `/companies/${companyId}/rbac/roles/${roleId}/permissions`,
            { headers: getHeaders() }
          ),
          axiosInstance.get(
            `/companies/${companyId}/rbac/roles/${roleId}/departments`,
            { headers: getHeaders() }
          ),
        ]);

        const role = roleRes.data?.data || roleRes.data;
        if (!role) {
          setRoleNotFound(true);
          setLoading(false);
          setLoadingDepartments(false);
          return;
        }

        setIsSystemRole(role.is_system_role);

        const deptIds = (roleDeptRes.data?.data || roleDeptRes.data || []).map((d: any) => d.department_id);
        setOriginalDepartmentIds(deptIds);
        setSelectedDepartmentIds(deptIds);

        const perms = permRes.data?.data || permRes.data || [];
        const permNames = perms.map((p: PermissionItem) => p.permission_name);
        setOriginalPermissionNames(permNames);

        const grouped: Record<string, string[]> = {};
        perms.forEach((p: PermissionItem) => {
          const mod = p.module || 'other';
          if (!grouped[mod]) grouped[mod] = [];
          grouped[mod].push(p.permission_name);
        });
        setSelectedPermissions(grouped);

        reset({
          role_name: role.role_name,
          role_level: String(role.role_level ?? ''),
          description: role.description || '',
        });

        fetchedRef.current = true;
      } catch (err: any) {
        console.error('Failed to load data:', err);
        setError(err?.response?.data?.message || err?.message || 'Failed to load role information.');
      } finally {
        setLoading(false);
        setLoadingDepartments(false);
      }
    };

    if (!fetchedRef.current) {
      fetchData();
    }
  }, [roleId, accessToken, companyId, deviceId, reset, isCreateMode, loadAllModulePermissions, getHeaders]);

  // ---------- Derived data ----------
  const selectedDepartments = useMemo(
    () => allDepartments.filter((dept) => selectedDepartmentIds.includes(dept.department_id)),
    [allDepartments, selectedDepartmentIds]
  );

  const totalPermissionCount = useMemo(
    () =>
      Object.values(selectedPermissions).reduce(
        (total, perms) => total + perms.length,
        0
      ),
    [selectedPermissions]
  );

  const filteredDepartments = useMemo(() => {
    const query = departmentSearch.trim().toLowerCase();
    if (!query) return allDepartments;
    return allDepartments.filter((dept) =>
      dept.department_name.toLowerCase().includes(query)
    );
  }, [allDepartments, departmentSearch]);

  // ---------- Department modal handlers ----------
  const openDeptModal = () => {
    setTempDeptIds([...selectedDepartmentIds]);
    setDepartmentSearch('');
    setDeptModalOpen(true);
  };

  const toggleTempDept = (id: string) => {
    setTempDeptIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const toggleAllTempDepts = () => {
    if (tempDeptIds.length === allDepartments.length) {
      setTempDeptIds([]);
    } else {
      setTempDeptIds(allDepartments.map((d) => d.department_id));
    }
  };

  const confirmDepartments = () => {
    setSelectedDepartmentIds(tempDeptIds);
    setDeptModalOpen(false);
  };

  // ---------- Permission modal handlers ----------
  const openPermissionModal = () => {
    if (selectedDepartmentIds.length === 0) {
      alert('Please select at least one department before assigning permissions.');
      return;
    }
    setPermissionSearch('');
    setCurrentModule(null);
    setPermModalOpen(true);
  };

  const closePermissionModal = () => {
    setPermModalOpen(false);
    setCurrentModule(null);
    setPermissionSearch('');
  };

  const handleDepartmentSelect = (dept: DepartmentItem) => {
    if (!dept.module_code) {
      alert('This department does not have a module assigned.');
      return;
    }
    const moduleCode = dept.module_code;
    setCurrentModule(moduleCode);
    setPermissionSearch('');
    setTempPermsForModule(selectedPermissions[moduleCode] || []);
  };

  const toggleTempPermission = (permissionName: string) => {
    setTempPermsForModule((prev) =>
      prev.includes(permissionName)
        ? prev.filter((p) => p !== permissionName)
        : [...prev, permissionName]
    );
  };

  const toggleAllTempPermissions = () => {
    if (!currentModule) return;
    const permissions = permissionCache[currentModule] || [];
    const names = permissions.map((p) => p.permission_name);
    const allSelected = names.length > 0 && names.every((name) => tempPermsForModule.includes(name));
    setTempPermsForModule(allSelected ? [] : names);
  };

  const saveModulePermissions = () => {
    if (!currentModule) return;
    const module = currentModule;
    const permissions = [...tempPermsForModule];
    setSelectedPermissions((prev) => ({
      ...prev,
      [module]: permissions,
    }));
    setCurrentModule(null);
    setTempPermsForModule([]);
    setPermissionSearch('');
  };

  const cancelDepartmentPermissions = () => {
    setCurrentModule(null);
    setTempPermsForModule([]);
    setPermissionSearch('');
  };

  const confirmAllPermissions = () => {
    setPermModalOpen(false);
    setCurrentModule(null);
    setPermissionSearch('');
  };

  // Filtered permissions for current module
  const currentPermissions = currentModule ? permissionCache[currentModule] || [] : [];
  const filteredPermissions = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();
    if (!query) return currentPermissions;
    return currentPermissions.filter(
      (permission) =>
        permission.permission_name.toLowerCase().includes(query) ||
        permission.description?.toLowerCase().includes(query)
    );
  }, [currentPermissions, permissionSearch]);

  // ---------- Submit ----------
  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId || !deviceId) {
      setError('Authentication missing.');
      return;
    }

    setSaving(true);
    setError(null);

    // Compute selected permissions for selected departments only
    const selectedModuleCodes = new Set(
      allDepartments
        .filter((dept) => selectedDepartmentIds.includes(dept.department_id))
        .map((dept) => dept.module_code)
        .filter((code): code is string => !!code)
    );

    const allSelectedPerms = Object.entries(selectedPermissions)
      .filter(([moduleCode]) => selectedModuleCodes.has(moduleCode))
      .flatMap(([, permissions]) => permissions);

    try {
      if (isCreateMode) {
        const payload = {
          role_name: data.role_name,
          role_level: Number(data.role_level),
          description: data.description || '',
          department_ids: selectedDepartmentIds,
          permission_names: allSelectedPerms,
        };
        await axiosInstance.post(
          `/companies/${companyId}/rbac/roles`,
          payload,
          { headers: getHeaders() }
        );
      } else {
        const addDeptIds = selectedDepartmentIds.filter((id) => !originalDepartmentIds.includes(id));
        const removeDeptIds = originalDepartmentIds.filter((id) => !selectedDepartmentIds.includes(id));

        const addPerms = allSelectedPerms.filter(
          (permission) => !originalPermissionNames.includes(permission)
        );
        const removePerms = originalPermissionNames.filter(
          (permission) => !allSelectedPerms.includes(permission)
        );

        const payload = {
          role_name: data.role_name,
          role_level: Number(data.role_level),
          description: data.description || '',
          add_departments: addDeptIds,
          remove_departments: removeDeptIds,
          add_permissions: addPerms,
          remove_permissions: removePerms,
        };
        await axiosInstance.put(
          `/companies/${companyId}/rbac/roles/${roleId}`,
          payload,
          { headers: getHeaders() }
        );
      }
      router.back();
    } catch (err: any) {
      console.error('Save failed:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to save role.');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Loading state ----------
  if (loading) {
    return (
      <>
        <div className="rolePage loadingPage">
          <div className="loadingCard">
            <div className="spinner" />
            <h2>{isCreateMode ? 'Preparing new role' : 'Loading role'}</h2>
            <p>{isCreateMode ? 'Loading departments...' : 'Preparing role information...'}</p>
          </div>
        </div>
        <style jsx>{styles}</style>
      </>
    );
  }

  if (roleNotFound) {
    return (
      <>
        <div className="rolePage statePage">
          <div className="stateCard">
            <div className="stateIcon">
              <FiShield />
            </div>
            <h2>Role not found</h2>
            <p>This role may have been deleted or you may no longer have access to it.</p>
            <button type="button" className="primaryButton" onClick={() => router.back()}>
              <FiArrowLeft /> Go Back
            </button>
          </div>
        </div>
        <style jsx>{styles}</style>
      </>
    );
  }

  // ---------- Main render ----------
  return (
    <>
      <div className="rolePage">
        {/* =================================================
            HEADER
        ================================================= */}
        <header className="pageHeader">
          <div className="headerInner">
            <button type="button" className="backButton" onClick={() => router.back()} aria-label="Go back">
              <FiArrowLeft />
            </button>
            <div className="headerIcon">
              <FiShield />
            </div>
            <div className="headerText">
              <div className="breadcrumb">
                Administration <FiChevronRight /> Roles <FiChevronRight /> {isCreateMode ? 'Create' : 'Edit'}
              </div>
              <h1>{isCreateMode ? 'Create Role' : 'Edit Role'}</h1>
              <p>
                {isCreateMode
                  ? 'Define a new role and its permissions'
                  : 'Configure role details, departments and permissions'}
              </p>
            </div>
            {!isCreateMode && isSystemRole && (
              <div className="systemBadge">
                <FiShield /> System Role
              </div>
            )}
          </div>
          <div className="headerAccent" />
        </header>

        {/* =================================================
            CONTENT
        ================================================= */}
        <main className="content">
          {error && (
            <div className="errorBanner">
              <div className="errorBannerIcon">
                <FiAlertTriangle />
              </div>
              <div>
                <strong>Something went wrong</strong>
                <p>{error}</p>
              </div>
              <button type="button" onClick={() => setError(null)}>
                <FiX />
              </button>
            </div>
          )}

          {!isCreateMode && isSystemRole && (
            <div className="systemNotice">
              <div className="noticeIcon">
                <FiInfo />
              </div>
              <div>
                <strong>System role</strong>
                <p>
                  This is a built-in system role. You can update its name, level and description,
                  and modify its permissions, but it cannot be deleted.
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
                <h2>Role Information</h2>
                <p>Basic information about this role</p>
              </div>
            </div>

            <div className="formGrid">
              <Controller
                control={control}
                name="role_name"
                render={({ field }) => (
                  <div className="field">
                    <label>
                      Role Name <span>*</span>
                    </label>
                    <input {...field} className={errors.role_name ? 'input error' : 'input'} placeholder="e.g. HR Manager" />
                    {errors.role_name && <small className="fieldError">{errors.role_name.message}</small>}
                  </div>
                )}
              />

              <Controller
                control={control}
                name="role_level"
                render={({ field: { onChange, onBlur, value } }) => (
                  <div className="field">
                    <label>
                      Role Level <span>*</span>
                    </label>
                    <div className="levelInput">
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={value ?? ''}
                        onChange={(e) => {
                          onChange(e.target.value);
                        }}
                        onBlur={onBlur}
                        placeholder="Enter a number between 1 and 1000"
                      />
                      <span>1–1000</span>
                    </div>
                    {errors.role_level && <small className="fieldError">{errors.role_level.message}</small>}
                  </div>
                )}
              />

              <Controller
                control={control}
                name="description"
                render={({ field }) => (
                  <div className="field full">
                    <label>
                      Description <em>Optional</em>
                    </label>
                    <textarea {...field} value={field.value ?? ''} rows={4} placeholder="Describe what this role is responsible for..." />
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
                <h2>Department Access</h2>
                <p>Control which departments this role can access</p>
              </div>
              <div className="countBadge">
                {selectedDepartmentIds.length}
                <span>assigned</span>
              </div>
            </div>

            <div className="subSection">
              <div className="subSectionTitle">
                <span>Current Departments</span>
                <span className="smallCount">{selectedDepartmentIds.length}</span>
              </div>

              {selectedDepartments.length === 0 ? (
                <div className="emptyInline">
                  <FiUsers />
                  <span>No departments assigned</span>
                </div>
              ) : (
                <div className="tagGrid">
                  {selectedDepartments.map((dept) => (
                    <div key={dept.department_id} className="accessTag">
                      <div
                        className="tagIcon"
                        style={{
                          background: `${getModuleColor(dept.module_code)}12`,
                          color: getModuleColor(dept.module_code),
                        }}
                      >
                        {getModuleIcon(dept.module_code)}
                      </div>
                      <div className="tagText">
                        <strong>{dept.department_name}</strong>
                        {dept.module_code && <span>{formatModuleName(dept.module_code)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="actionGrid">
              <button type="button" className="managementButton add" onClick={openDeptModal}>
                <div className="managementIcon">
                  <FiPlus />
                </div>
                <div>
                  <strong>Add Departments</strong>
                  <span>Grant additional access</span>
                </div>
              </button>
              <button type="button" className="managementButton remove" onClick={openDeptModal}>
                <div className="managementIcon">
                  <FiMinus />
                </div>
                <div>
                  <strong>Remove Departments</strong>
                  <span>Revoke access</span>
                </div>
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
                <h2>Permission Access</h2>
                <p>Manage what this role can perform</p>
              </div>
              <div className="countBadge">
                {totalPermissionCount}
                <span>assigned</span>
              </div>
            </div>

            <div className="subSection">
              <div className="subSectionTitle">
                <span>Current Permissions</span>
                <span className="smallCount">{totalPermissionCount}</span>
              </div>

              {totalPermissionCount === 0 ? (
                <div className="emptyInline">
                  <FiKey />
                  <span>No permissions assigned</span>
                </div>
              ) : (
                <div className="permissionList">
                  {Object.entries(selectedPermissions)
                    .filter(([, perms]) => perms.length > 0)
                    .map(([module, perms]) => (
                      <div key={module} className="permissionRow">
                        <div
                          className="permissionModuleIcon"
                          style={{
                            color: getModuleColor(module),
                            background: `${getModuleColor(module)}12`,
                          }}
                        >
                          {getModuleIcon(module)}
                        </div>
                        <div className="permissionInfo">
                          <strong>{formatModuleName(module)}</strong>
                          <span>{perms.length} permission{perms.length > 1 ? 's' : ''}</span>
                        </div>
                        <span
                          className="modulePill"
                          style={{
                            color: getModuleColor(module),
                            background: `${getModuleColor(module)}12`,
                          }}
                        >
                          {perms.length}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="permissionActions">
              <div className="permissionActionCard add">
                <div className="permissionActionHeader">
                  <div className="permissionActionIcon">
                    <FiPlus />
                  </div>
                  <div>
                    <h3>Add Permissions</h3>
                    <p>Grant new capabilities</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="choosePermissionButton add"
                  onClick={openPermissionModal}
                  disabled={selectedDepartmentIds.length === 0}
                >
                  <FiKey />
                  Manage Permissions
                </button>
                {selectedDepartmentIds.length === 0 && (
                  <div style={{ marginTop: 6, fontSize: '9px', color: '#94A3B8' }}>
                    Select departments first
                  </div>
                )}
              </div>

              <div className="permissionActionCard remove">
                <div className="permissionActionHeader">
                  <div className="permissionActionIcon">
                    <FiMinus />
                  </div>
                  <div>
                    <h3>Remove Permissions</h3>
                    <p>Revoke selected capabilities</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="choosePermissionButton remove"
                  onClick={openPermissionModal}
                  disabled={selectedDepartmentIds.length === 0}
                >
                  <FiKey />
                  Manage Permissions
                </button>
                {selectedDepartmentIds.length === 0 && (
                  <div style={{ marginTop: 6, fontSize: '9px', color: '#94A3B8' }}>
                    Select departments first
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
              <span>{isDirty ? 'You have unsaved changes' : 'No unsaved changes'}</span>
            </div>
            <div className="saveActions">
              <button type="button" className="cancelButton" onClick={() => router.back()} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="saveButton" onClick={handleSubmit(onSubmit)} disabled={saving}>
                {saving ? (
                  <>
                    <span className="buttonSpinner" /> Saving...
                  </>
                ) : (
                  <>
                    <FiSave /> {isCreateMode ? 'Create Role' : 'Save Changes'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* =================================================
            DEPARTMENT MODAL
        ================================================= */}
        {deptModalOpen && (
          <div className="modalOverlay" onClick={() => setDeptModalOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modalHeader">
                <div>
                  <h3>Select Departments</h3>
                  <p>{tempDeptIds.length} selected</p>
                </div>
                <button type="button" onClick={() => setDeptModalOpen(false)}>
                  <FiX />
                </button>
              </div>

              <div className="modalSearch">
                <FiSearch />
                <input
                  autoFocus
                  value={departmentSearch}
                  onChange={(e) => setDepartmentSearch(e.target.value)}
                  placeholder="Search departments..."
                />
              </div>

              <div style={{ padding: '4px 15px 8px' }}>
                <div
                  className="selectAllCard"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 8,
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                  }}
                  onClick={toggleAllTempDepts}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FiCheck />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 11 }}>Select All</div>
                      <div style={{ fontSize: 8, color: '#94A3B8' }}>{allDepartments.length} departments</div>
                    </div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: 4, border: '1px solid #94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tempDeptIds.length === allDepartments.length ? '#2563EB' : 'white' }}>
                    {tempDeptIds.length === allDepartments.length && <FiCheck size={12} color="white" />}
                  </div>
                </div>
              </div>

              <div className="departmentList" style={{ flex: 1, overflowY: 'auto', padding: '0 15px 12px' }}>
                {loadingDepartments ? (
                  <div className="modalLoading">
                    <span className="spinner small" /> Loading departments...
                  </div>
                ) : (
                  filteredDepartments.map((dept) => {
                    const checked = tempDeptIds.includes(dept.department_id);
                    return (
                      <label
                        key={dept.department_id}
                        className={`departmentOption ${checked ? 'selected' : ''}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 9,
                          padding: 9,
                          borderRadius: 10,
                          cursor: 'pointer',
                          border: '1px solid transparent',
                          background: checked ? '#F8FBFF' : 'transparent',
                          borderColor: checked ? '#DBEAFE' : 'transparent',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTempDept(dept.department_id)}
                          style={{ display: 'none' }}
                        />
                        <div
                          className="departmentIcon"
                          style={{
                            width: 37,
                            height: 37,
                            borderRadius: 9,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `${getModuleColor(dept.module_code)}12`,
                            color: getModuleColor(dept.module_code),
                          }}
                        >
                          {getModuleIcon(dept.module_code)}
                        </div>
                        <div className="departmentInfo" style={{ flex: 1 }}>
                          <strong style={{ fontSize: 11 }}>{dept.department_name}</strong>
                          {dept.module_code && <span style={{ fontSize: 9, color: '#94A3B8' }}>{formatModuleName(dept.module_code)}</span>}
                        </div>
                        <div
                          className="customCheck"
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            border: '1px solid #D5DCE5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: checked ? '#2563EB' : 'white',
                            color: 'white',
                          }}
                        >
                          {checked && <FiCheck size={12} />}
                        </div>
                      </label>
                    );
                  })
                )}
                {filteredDepartments.length === 0 && !loadingDepartments && (
                  <div className="modalEmpty">
                    <FiSearch />
                    <strong>No departments found</strong>
                    <span>Try a different search.</span>
                  </div>
                )}
              </div>

              <div className="modalFooter">
                <span>{tempDeptIds.length} selected</span>
                <button type="button" className="modalDoneButton" onClick={confirmDepartments}>
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            PERMISSION MODAL
        ================================================= */}
        {permModalOpen && (
          <div className="modalOverlay" onClick={closePermissionModal}>
            <div className="modal permissionModal" onClick={(e) => e.stopPropagation()}>
              <div className="modalHeader">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {currentModule && (
                    <button type="button" onClick={cancelDepartmentPermissions} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <FiChevronLeft size={20} color="#2563EB" />
                    </button>
                  )}
                  <div>
                    <h3>
                      {currentModule
                        ? allDepartments.find((d) => d.module_code === currentModule)?.department_name || currentModule
                        : 'Permissions'}
                    </h3>
                    <p>
                      {currentModule
                        ? `${tempPermsForModule.length} selected`
                        : 'Choose a department'}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={closePermissionModal}>
                  <FiX />
                </button>
              </div>

              {!currentModule ? (
                <>
                  <div style={{ padding: '0 16px', marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, background: '#F5F9FF', border: '1px solid #DBEAFE' }}>
                      <div style={{ width: 37, height: 37, borderRadius: 10, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiKey size={18} color="#2563EB" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 11 }}>Choose a department</div>
                        <div style={{ fontSize: 9, color: '#64748B' }}>Select a department to manage its permissions.</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 12px' }}>
                    {allDepartments
                      .filter((d) => selectedDepartmentIds.includes(d.department_id))
                      .map((dept) => {
                        const moduleCode = dept.module_code;
                        const count = moduleCode ? (selectedPermissions[moduleCode] || []).length : 0;
                        const disabled = !moduleCode;
                        return (
                          <button
                            key={dept.department_id}
                            type="button"
                            className="moduleOption"
                            onClick={() => handleDepartmentSelect(dept)}
                            disabled={disabled}
                            style={{
                              all: 'unset',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: 9,
                              borderRadius: 10,
                              cursor: disabled ? 'not-allowed' : 'pointer',
                              opacity: disabled ? 0.5 : 1,
                              width: '100%',
                              borderBottom: '1px solid #EEF1F5',
                            }}
                          >
                            <div
                              className="moduleOptionIcon"
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: `${getModuleColor(moduleCode)}12`,
                                color: getModuleColor(moduleCode),
                              }}
                            >
                              {disabled ? '🚫' : getModuleIcon(moduleCode)}
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                              <div style={{ fontWeight: 600, fontSize: 11 }}>{dept.department_name}</div>
                              <div style={{ fontSize: 9, color: '#94A3B8' }}>
                                {moduleCode ? `${count} permissions selected` : 'No module assigned'}
                              </div>
                            </div>
                            {!disabled && (
                              <div style={{ minWidth: 27, height: 27, borderRadius: 8, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#2563EB' }}>{count}</span>
                              </div>
                            )}
                            <FiChevronRight size={18} color="#94A3B8" />
                          </button>
                        );
                      })}
                    {allDepartments.filter((d) => selectedDepartmentIds.includes(d.department_id)).length === 0 && (
                      <div className="modalEmpty">
                        <FiUsers />
                        <strong>No departments selected</strong>
                        <span>Please select departments first.</span>
                      </div>
                    )}
                  </div>

                  <div className="modalFooter">
                    <span>{totalPermissionCount} total permissions</span>
                    <button type="button" className="modalDoneButton" onClick={confirmAllPermissions}>
                      Done
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="modalSearch">
                    <FiSearch />
                    <input
                      autoFocus
                      value={permissionSearch}
                      onChange={(e) => setPermissionSearch(e.target.value)}
                      placeholder="Search permissions..."
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px', marginBottom: 8 }}>
                    <span style={{ fontSize: 9, color: '#94A3B8' }}>{filteredPermissions.length} permissions</span>
                    <button
                      type="button"
                      onClick={toggleAllTempPermissions}
                      style={{ all: 'unset', cursor: 'pointer', fontSize: 10, fontWeight: 700, color: '#2563EB' }}
                    >
                      {tempPermsForModule.length === currentPermissions.length && currentPermissions.length > 0
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 12px' }}>
                    {filteredPermissions.map((permission) => {
                      const checked = tempPermsForModule.includes(permission.permission_name);
                      return (
                        <label
                          key={permission.permission_name}
                          className={`permissionOption ${checked ? 'selected' : ''}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 9,
                            padding: 9,
                            borderRadius: 10,
                            cursor: 'pointer',
                            border: '1px solid transparent',
                            background: checked ? '#F8FBFF' : 'transparent',
                            borderColor: checked ? '#DBEAFE' : 'transparent',
                            marginBottom: 4,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTempPermission(permission.permission_name)}
                            style={{ display: 'none' }}
                          />
                          <div
                            className="permissionOptionIcon"
                            style={{
                              width: 37,
                              height: 37,
                              borderRadius: 9,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: `${getModuleColor(currentModule)}12`,
                              color: getModuleColor(currentModule),
                            }}
                          >
                            <FiKey size={16} />
                          </div>
                          <div className="permissionOptionInfo" style={{ flex: 1 }}>
                            <strong style={{ fontSize: 11 }}>{permission.permission_name}</strong>
                            {permission.description && <span style={{ fontSize: 9, color: '#94A3B8' }}>{permission.description}</span>}
                          </div>
                          <div
                            className="customCheck"
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 4,
                              border: '1px solid #D5DCE5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: checked ? '#2563EB' : 'white',
                              color: 'white',
                            }}
                          >
                            {checked && <FiCheck size={12} />}
                          </div>
                        </label>
                      );
                    })}
                    {filteredPermissions.length === 0 && (
                      <div className="modalEmpty">
                        <FiKey />
                        <strong>No permissions found</strong>
                        <span>Try a different search.</span>
                      </div>
                    )}
                  </div>

                  <div className="modalFooter">
                    <span>{tempPermsForModule.length} selected</span>
                    <button type="button" className="modalDoneButton" onClick={saveModulePermissions}>
                      Save Permissions
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{styles}</style>
    </>
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

  /* =====================================================
     PERMISSION ACTIONS
  ===================================================== */

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

  .choosePermissionButton {
    all: unset;

    width: 100%;

    height: 38px;

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

  .choosePermissionButton:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .choosePermissionButton:hover:not(:disabled) {
    filter: brightness(.96);
  }

  .choosePermissionButton svg {
    width: 14px;
    height: 14px;
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
    border: none;
    background: #2563eb;
    color: white;
  }

  .modalDoneButton:hover {
    filter: brightness(0.95);
  }

  .departmentOption,
  .permissionOption {
    transition: all 0.15s ease;
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

  .customCheck {
    transition: all 0.15s ease;
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