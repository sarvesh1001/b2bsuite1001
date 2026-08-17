import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  FiChevronDown,
  FiX,
  FiCheck,
  FiArrowLeft,
  FiShield,
  FiUsers,
  FiKey,
  FiInfo,
  FiSave,
  FiPlus,
  FiTrash2,
  FiLayers,
  FiLock,
  FiChevronRight,
  FiSearch,
  FiAlertTriangle,
  FiRefreshCw,
} from 'react-icons/fi';

import {
  getRole,
  updateRole,
  getRootDepartments,
  getRolePermissionsDetailed,
  getRoleDepartments,
} from '@b2b/api-client';

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
// ZOD
// =========================================================

const schema = z.object({
  role_name: z
    .string()
    .min(1, 'Role name is required')
    .optional(),

  role_level: z
    .number()
    .int()
    .min(1, 'Level must be at least 1')
    .max(1000, 'Level cannot exceed 1000')
    .optional(),

  description: z
    .string()
    .nullable()
    .optional(),
});

type FormData = z.infer<typeof schema>;

// =========================================================
// COMPONENT
// =========================================================

export default function EditRoleScreen() {
  const router = useRouter();
  const { roleId } = router.query;

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  // -------------------------------------------------------
  // State
  // -------------------------------------------------------

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSystemRole, setIsSystemRole] = useState(false);

  const [allDepartments, setAllDepartments] = useState<
    DepartmentItem[]
  >([]);

  const [loadingDepartments, setLoadingDepartments] =
    useState(true);

  const [originalDepartmentIds, setOriginalDepartmentIds] =
    useState<string[]>([]);

  const [originalPermissionNames, setOriginalPermissionNames] =
    useState<string[]>([]);

  const [selectedDepartmentIds, setSelectedDepartmentIds] =
    useState<string[]>([]);

  const [selectedPermissions, setSelectedPermissions] =
    useState<Record<string, string[]>>({});

  const [permissionCache, setPermissionCache] =
    useState<Record<string, PermissionItem[]>>({});

  // Department modal
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [tempDeptIds, setTempDeptIds] = useState<string[]>([]);
  const [departmentSearch, setDepartmentSearch] =
    useState('');

  // Permission modal
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [currentModule, setCurrentModule] =
    useState<string | null>(null);

  const [tempPermsForModule, setTempPermsForModule] =
    useState<string[]>([]);

  const [loadingPermissions, setLoadingPermissions] =
    useState(false);

  const [permissionSearch, setPermissionSearch] =
    useState('');

  // -------------------------------------------------------
  // Form
  // -------------------------------------------------------

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      role_name: '',
      role_level: 100,
      description: '',
    },
  });

  // =======================================================
  // FETCH ROLE
  // =======================================================

  useEffect(() => {
    if (!roleId || !accessToken || !companyId || !deviceId) {
      if (!roleId) {
        return;
      }

      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setLoadingDepartments(true);

      try {
        const [
          roleRes,
          deptRes,
          permRes,
          roleDeptRes,
        ] = await Promise.all([
          getRole(
            companyId,
            deviceId,
            roleId as string,
            accessToken
          ),

          getRootDepartments(
            companyId,
            deviceId,
            accessToken
          ),

          getRolePermissionsDetailed(
            companyId,
            deviceId,
            roleId as string,
            accessToken
          ),

          getRoleDepartments(
            companyId,
            deviceId,
            roleId as string,
            accessToken
          ),
        ]);

        const role = roleRes.data;

        if (!role) {
          alert('Role not found');
          router.back();
          return;
        }

        setIsSystemRole(role.is_system_role);

        setAllDepartments(deptRes.data || []);

        // Departments
        const deptIds = (roleDeptRes.data || []).map(
          (d: DepartmentItem) => d.department_id
        );

        setOriginalDepartmentIds(deptIds);
        setSelectedDepartmentIds(deptIds);

        // Permissions
        const perms = permRes.data || [];

        const permNames = perms.map(
          (p: PermissionItem) => p.permission_name
        );

        setOriginalPermissionNames(permNames);

        const grouped: Record<string, string[]> = {};
        const cache: Record<string, PermissionItem[]> = {};

        perms.forEach((p: PermissionItem) => {
          const module = p.module || 'other';

          if (!grouped[module]) {
            grouped[module] = [];
          }

          grouped[module].push(p.permission_name);

          if (!cache[module]) {
            cache[module] = [];
          }

          cache[module].push(p);
        });

        setSelectedPermissions(grouped);
        setPermissionCache(cache);

        reset({
          role_name: role.role_name,
          role_level: role.role_level,
          description: role.description || '',
        });
      } catch (error: any) {
        console.error(error);

        alert(
          error?.message ||
            'Failed to load role'
        );

        router.back();
      } finally {
        setLoading(false);
        setLoadingDepartments(false);
      }
    };

    fetchData();
  }, [
    roleId,
    accessToken,
    companyId,
    deviceId,
    reset,
    router,
  ]);

  // =======================================================
  // PERMISSION FETCH
  // =======================================================

  const fetchPermissionsForModule = useCallback(
    async (
      moduleCode: string
    ): Promise<PermissionItem[]> => {
      if (permissionCache[moduleCode]) {
        return permissionCache[moduleCode];
      }

      if (!accessToken || !companyId || !deviceId) {
        return [];
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/companies/${companyId}/hr/permissions/module/${moduleCode}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'X-Device-ID': deviceId,
              'X-Company-ID': companyId,
            },
          }
        );

        const json = await response.json();

        const data = json.data || [];

        setPermissionCache(prev => ({
          ...prev,
          [moduleCode]: data,
        }));

        return data;
      } catch (error) {
        console.error(
          'Failed to fetch permissions',
          error
        );

        alert('Could not load permissions');

        return [];
      }
    },
    [
      accessToken,
      companyId,
      deviceId,
      permissionCache,
    ]
  );

  // =======================================================
  // DEPARTMENT MODAL
  // =======================================================

  const openDeptModal = () => {
    setTempDeptIds([...selectedDepartmentIds]);
    setDepartmentSearch('');
    setDeptModalOpen(true);
  };

  const toggleTempDept = (id: string) => {
    setTempDeptIds(prev =>
      prev.includes(id)
        ? prev.filter(d => d !== id)
        : [...prev, id]
    );
  };

  const toggleAllTempDepts = () => {
    if (
      tempDeptIds.length === allDepartments.length
    ) {
      setTempDeptIds([]);
    } else {
      setTempDeptIds(
        allDepartments.map(
          d => d.department_id
        )
      );
    }
  };

  const confirmDepartments = () => {
    setSelectedDepartmentIds(tempDeptIds);
    setDeptModalOpen(false);
  };

  // =======================================================
  // PERMISSION MODAL
  // =======================================================

  const openPermissionModal = () => {
    if (selectedDepartmentIds.length === 0) {
      alert(
        'Please select at least one department first.'
      );
      return;
    }

    setPermModalOpen(true);
    setCurrentModule(null);
    setPermissionSearch('');
  };

  const closePermissionModal = () => {
    setPermModalOpen(false);
    setCurrentModule(null);
    setPermissionSearch('');
    setTempPermsForModule([]);
  };

  const handleDepartmentSelect = async (
    dept: DepartmentItem
  ) => {
    if (!dept.module_code) {
      alert(
        'This department does not have a module assigned.'
      );
      return;
    }

    setCurrentModule(dept.module_code);
    setLoadingPermissions(true);
    setPermissionSearch('');

    const permissions =
      await fetchPermissionsForModule(
        dept.module_code
      );

    const currentlySelected =
      selectedPermissions[
        dept.module_code
      ] || [];

    setTempPermsForModule(
      currentlySelected.filter(permission =>
        permissions.some(
          p =>
            p.permission_name ===
            permission
        )
      )
    );

    setLoadingPermissions(false);
  };

  const toggleTempPermission = (
    permName: string
  ) => {
    setTempPermsForModule(prev =>
      prev.includes(permName)
        ? prev.filter(
            p => p !== permName
          )
        : [...prev, permName]
    );
  };

  const toggleAllTempPermissions = () => {
    if (!currentModule) return;

    const perms =
      permissionCache[currentModule] || [];

    const names = perms.map(
      p => p.permission_name
    );

    const allSelected =
      names.length > 0 &&
      names.every(
        p =>
          tempPermsForModule.includes(p)
      );

    if (allSelected) {
      setTempPermsForModule([]);
    } else {
      setTempPermsForModule(names);
    }
  };

  const saveModulePermissions = () => {
    if (!currentModule) return;

    setSelectedPermissions(prev => ({
      ...prev,
      [currentModule]:
        tempPermsForModule,
    }));

    setCurrentModule(null);
    setTempPermsForModule([]);
  };

  const cancelDepartmentPermissions = () => {
    setCurrentModule(null);
    setTempPermsForModule([]);
  };

  const confirmAllPermissions = () => {
    setPermModalOpen(false);
    setCurrentModule(null);
    setTempPermsForModule([]);
  };

  // =======================================================
  // SUBMIT
  // =======================================================

  const onSubmit = async (data: FormData) => {
    if (
      !accessToken ||
      !companyId ||
      !deviceId ||
      !roleId
    ) {
      return;
    }

    setSaving(true);

    try {
      const addDeptIds =
        selectedDepartmentIds.filter(
          id =>
            !originalDepartmentIds.includes(id)
        );

      const removeDeptIds =
        originalDepartmentIds.filter(
          id =>
            !selectedDepartmentIds.includes(id)
        );

      const addDeptNames =
        addDeptIds.map(id => {
          const dept =
            allDepartments.find(
              d =>
                d.department_id === id
            );

          return dept
            ? dept.department_name
            : id;
        });

      const removeDeptNames =
        removeDeptIds.map(id => {
          const dept =
            allDepartments.find(
              d =>
                d.department_id === id
            );

          return dept
            ? dept.department_name
            : id;
        });

      const allSelectedPerms =
        Object.values(
          selectedPermissions
        ).flat();

      const addPerms =
        allSelectedPerms.filter(
          p =>
            !originalPermissionNames.includes(
              p
            )
        );

      const removePerms =
        originalPermissionNames.filter(
          p =>
            !allSelectedPerms.includes(p)
        );

      const payload: any = {
        role_name: data.role_name,
        description: data.description,

        add_departments:
          addDeptNames,

        remove_departments:
          removeDeptNames,

        add_permissions:
          addPerms,

        remove_permissions:
          removePerms,
      };

      if (
        data.role_level !== undefined
      ) {
        payload.role_level =
          data.role_level;
      }

      await updateRole(
        companyId,
        deviceId,
        roleId as string,
        payload,
        accessToken
      );

      alert(
        'Role updated successfully'
      );

      router.back();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Update failed';

      alert(message);
    } finally {
      setSaving(false);
    }
  };

  // =======================================================
  // HELPERS
  // =======================================================

  const getDeptName = (id: string) =>
    allDepartments.find(
      d => d.department_id === id
    )?.department_name || id;

  const getModuleColor = (
    module: string
  ) =>
    MODULE_COLORS[
      module.toLowerCase()
    ] || '#64748B';

  const getModuleIcon = (
    module: string
  ) =>
    MODULE_ICONS[
      module.toLowerCase()
    ] || '🔐';

  const totalPermissions = Object.values(
    selectedPermissions
  ).flat().length;

  const moduleCount =
    Object.keys(
      selectedPermissions
    ).filter(
      module =>
        selectedPermissions[module]
          ?.length > 0
    ).length;

  const filteredDepartments =
    allDepartments.filter(dept =>
      dept.department_name
        .toLowerCase()
        .includes(
          departmentSearch.toLowerCase()
        )
    );

  const currentPermissions =
    currentModule
      ? permissionCache[currentModule] || []
      : [];

  const filteredPermissions =
    currentPermissions.filter(permission =>
      permission.permission_name
        .toLowerCase()
        .includes(
          permissionSearch.toLowerCase()
        )
    );

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <>
        <div className="rolePage loadingPage">
          <div className="loadingCard">
            <div className="spinner" />

            <h2>Loading role</h2>

            <p>
              Fetching role configuration and
              permissions...
            </p>
          </div>
        </div>

        <style jsx>{styles}</style>
      </>
    );
  }

  // =======================================================
  // MAIN
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
                <span>Administration</span>
                <FiChevronRight />
                <span>Roles</span>
                <FiChevronRight />
                <span>Edit</span>
              </div>

              <h1>Edit Role</h1>

              <p>
                Configure role details,
                departments and permissions
              </p>
            </div>

            {isSystemRole && (
              <div className="systemBadge">
                <FiLock />
                System Role
              </div>
            )}
          </div>

          <div className="headerAccent" />
        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="pageContent">

          {/* =================================================
              ROLE INFORMATION
          ================================================= */}

          <section className="card">

            <div className="cardHeader">

              <div className="cardHeaderIcon blue">
                <FiShield />
              </div>

              <div>
                <h2>Role Information</h2>
                <p>
                  Basic information about this
                  role
                </p>
              </div>

            </div>

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
                    role. Its permissions can
                    be configured, but the role
                    itself cannot be deleted.
                  </p>
                </div>
              </div>
            )}

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
                      placeholder="e.g. HR Manager"
                      className={
                        errors.role_name
                          ? 'input error'
                          : 'input'
                      }
                    />

                    {errors.role_name && (
                      <p className="fieldError">
                        {
                          errors.role_name
                            .message
                        }
                      </p>
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

                    <div className="inputWithHint">
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={
                          value ?? ''
                        }
                        onChange={e => {
                          const raw =
                            e.target.value;

                          if (
                            raw === ''
                          ) {
                            onChange(
                              undefined
                            );
                            return;
                          }

                          const num =
                            Number(raw);

                          if (
                            !isNaN(num)
                          ) {
                            onChange(
                              Math.min(
                                Math.max(
                                  1,
                                  num
                                ),
                                1000
                              )
                            );
                          }
                        }}
                        onBlur={onBlur}
                        className={
                          errors.role_level
                            ? 'input error'
                            : 'input'
                        }
                      />

                      <span>
                        1–1000
                      </span>
                    </div>

                    {errors.role_level && (
                      <p className="fieldError">
                        {
                          errors.role_level
                            .message
                        }
                      </p>
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
                      <small>
                        Optional
                      </small>
                    </label>

                    <textarea
                      {...field}
                      value={
                        field.value ?? ''
                      }
                      rows={4}
                      placeholder="Describe what this role is responsible for..."
                      className="textarea"
                    />

                  </div>
                )}
              />

            </div>

          </section>

          {/* =================================================
              DEPARTMENTS
          ================================================= */}

          <section className="card">

            <div className="cardHeader">

              <div className="cardHeaderIcon purple">
                <FiUsers />
              </div>

              <div className="cardHeaderMain">

                <div>
                  <h2>
                    Departments
                  </h2>

                  <p>
                    Assign this role to
                    one or more departments
                  </p>
                </div>

                <div className="countBadge purpleBadge">
                  {
                    selectedDepartmentIds.length
                  } selected
                </div>

              </div>

            </div>

            <div className="selectionPanel">

              <div className="selectionPanelTop">

                <div className="selectionSummary">

                  <div className="summaryDot purpleDot" />

                  <span>
                    {
                      selectedDepartmentIds.length
                    }{' '}
                    department
                    {selectedDepartmentIds.length !==
                    1
                      ? 's'
                      : ''}{' '}
                    assigned
                  </span>

                </div>

                <button
                  type="button"
                  className="outlineButton"
                  onClick={
                    openDeptModal
                  }
                >
                  <FiPlus />
                  Manage Departments
                </button>

              </div>

              {selectedDepartmentIds.length ===
              0 ? (
                <div className="emptySelection">
                  <FiUsers />

                  <span>
                    No departments assigned
                  </span>

                  <button
                    type="button"
                    onClick={
                      openDeptModal
                    }
                  >
                    Add a department
                  </button>
                </div>
              ) : (
                <div className="chipList">

                  {selectedDepartmentIds.map(
                    id => (
                      <div
                        key={id}
                        className="selectionChip purpleChip"
                      >
                        <span>
                          {getDeptName(
                            id
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedDepartmentIds(
                              prev =>
                                prev.filter(
                                  item =>
                                    item !==
                                    id
                                )
                            )
                          }
                          aria-label={`Remove ${getDeptName(
                            id
                          )}`}
                        >
                          <FiX />
                        </button>
                      </div>
                    )
                  )}

                </div>
              )}

            </div>

          </section>

          {/* =================================================
              PERMISSIONS
          ================================================= */}

          <section className="card">

            <div className="cardHeader">

              <div className="cardHeaderIcon green">
                <FiKey />
              </div>

              <div className="cardHeaderMain">

                <div>
                  <h2>
                    Permissions
                  </h2>

                  <p>
                    Control what this role can
                    access and perform
                  </p>
                </div>

                <div className="permissionStats">

                  <div>
                    <strong>
                      {totalPermissions}
                    </strong>

                    <span>
                      Permissions
                    </span>
                  </div>

                  <div>
                    <strong>
                      {moduleCount}
                    </strong>

                    <span>
                      Modules
                    </span>
                  </div>

                </div>

              </div>

            </div>

            <div className="permissionContainer">

              {selectedDepartmentIds.length ===
              0 ? (
                <div className="permissionEmpty">

                  <div className="largeEmptyIcon">
                    <FiLock />
                  </div>

                  <h3>
                    Select departments first
                  </h3>

                  <p>
                    Permissions are organized
                    by department and module.
                    Assign a department before
                    configuring permissions.
                  </p>

                  <button
                    type="button"
                    className="primarySmallButton"
                    onClick={
                      openDeptModal
                    }
                  >
                    <FiUsers />
                    Select Departments
                  </button>

                </div>
              ) : (
                <>

                  <div className="permissionTopBar">

                    <div>
                      <strong>
                        Module Access
                      </strong>

                      <span>
                        Choose a department
                        to configure its
                        permissions
                      </span>
                    </div>

                    <button
                      type="button"
                      className="outlineButton"
                      onClick={
                        openPermissionModal
                      }
                    >
                      <FiKey />
                      Manage Permissions
                    </button>

                  </div>

                  <div className="permissionModuleGrid">

                    {allDepartments
                      .filter(d =>
                        selectedDepartmentIds.includes(
                          d.department_id
                        )
                      )
                      .map(dept => {

                        const module =
                          dept.module_code ||
                          'other';

                        const color =
                          getModuleColor(
                            module
                          );

                        const count =
                          selectedPermissions[
                            module
                          ]?.length || 0;

                        return (
                          <button
                            type="button"
                            key={
                              dept.department_id
                            }
                            className="permissionModule"
                            onClick={() =>
                              handleDepartmentSelect(
                                dept
                              )
                            }
                            disabled={
                              !dept.module_code
                            }
                            style={
                              {
                                '--module-color':
                                  color,
                                '--module-soft': `${color}12`,
                                '--module-border': `${color}30`,
                              } as React.CSSProperties
                            }
                          >

                            <div className="permissionModuleIcon">
                              {
                                getModuleIcon(
                                  module
                                )
                              }
                            </div>

                            <div className="permissionModuleInfo">

                              <strong>
                                {
                                  dept.department_name
                                }
                              </strong>

                              <span>
                                {dept.module_code
                                  ? `${count} permission${
                                      count !==
                                      1
                                        ? 's'
                                        : ''
                                    } selected`
                                  : 'No module assigned'}
                              </span>

                            </div>

                            <div className="permissionModuleArrow">
                              <FiChevronRight />
                            </div>

                          </button>
                        );
                      })}

                  </div>

                </>
              )}

            </div>

          </section>

        </main>

        {/* =================================================
            SAVE BAR
        ================================================= */}

        <div className="saveBar">

          <div className="saveBarInner">

            <div className="saveInfo">

              <div className="saveStatusDot" />

              <div>
                <strong>
                  Ready to save changes
                </strong>

                <span>
                  {
                    selectedDepartmentIds.length
                  }{' '}
                  departments ·{' '}
                  {totalPermissions}{' '}
                  permissions
                </span>
              </div>

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
                    Save Changes
                  </>
                )}
              </button>

            </div>

          </div>

        </div>

      </div>

      {/* ===================================================
          DEPARTMENT MODAL
      =================================================== */}

      {deptModalOpen && (
        <div
          className="modalOverlay"
          onClick={() =>
            setDeptModalOpen(false)
          }
        >

          <div
            className="modal departmentModal"
            onClick={e =>
              e.stopPropagation()
            }
          >

            <div className="modalHeader">

              <div>
                <h3>
                  Select Departments
                </h3>

                <p>
                  Choose the departments
                  this role belongs to
                </p>
              </div>

              <button
                type="button"
                className="modalClose"
                onClick={() =>
                  setDeptModalOpen(false)
                }
              >
                <FiX />
              </button>

            </div>

            <div className="modalToolbar">

              <div className="searchBox">
                <FiSearch />

                <input
                  value={
                    departmentSearch
                  }
                  onChange={e =>
                    setDepartmentSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search departments..."
                />
              </div>

              <button
                type="button"
                className="selectAllButton"
                onClick={
                  toggleAllTempDepts
                }
              >
                {tempDeptIds.length ===
                  allDepartments.length &&
                allDepartments.length > 0
                  ? 'Deselect All'
                  : 'Select All'}
              </button>

            </div>

            <div className="modalBody">

              {loadingDepartments ? (
                <div className="modalLoading">
                  <div className="spinner small" />
                  <span>
                    Loading departments...
                  </span>
                </div>
              ) : filteredDepartments.length ===
                0 ? (
                <div className="modalEmpty">
                  <FiSearch />
                  <span>
                    No departments found
                  </span>
                </div>
              ) : (
                <div className="departmentList">

                  {filteredDepartments.map(
                    dept => {

                      const checked =
                        tempDeptIds.includes(
                          dept.department_id
                        );

                      return (
                        <button
                          type="button"
                          key={
                            dept.department_id
                          }
                          className={
                            checked
                              ? 'departmentRow selected'
                              : 'departmentRow'
                          }
                          onClick={() =>
                            toggleTempDept(
                              dept.department_id
                            )
                          }
                        >

                          <div
                            className={
                              checked
                                ? 'customCheckbox checked'
                                : 'customCheckbox'
                            }
                          >
                            {checked && (
                              <FiCheck />
                            )}
                          </div>

                          <div className="departmentRowInfo">

                            <strong>
                              {
                                dept.department_name
                              }
                            </strong>

                            {dept.module_code && (
                              <span>
                                {dept.module_code}
                              </span>
                            )}

                          </div>

                          {checked && (
                            <FiCheck className="rowCheck" />
                          )}

                        </button>
                      );
                    }
                  )}

                </div>
              )}

            </div>

            <div className="modalFooter">

              <span>
                {tempDeptIds.length}{' '}
                selected
              </span>

              <div>
                <button
                  type="button"
                  className="modalCancelButton"
                  onClick={() =>
                    setDeptModalOpen(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="modalPrimaryButton"
                  onClick={
                    confirmDepartments
                  }
                >
                  <FiCheck />
                  Confirm Selection
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ===================================================
          PERMISSION MODAL
      =================================================== */}

      {permModalOpen && (
        <div
          className="modalOverlay"
          onClick={
            closePermissionModal
          }
        >

          <div
            className="modal permissionModal"
            onClick={e =>
              e.stopPropagation()
            }
          >

            <div className="modalHeader">

              <div>

                {currentModule ? (
                  <>
                    <div className="modalBackTitle">
                      <button
                        type="button"
                        onClick={
                          cancelDepartmentPermissions
                        }
                      >
                        <FiArrowLeft />
                      </button>

                      <h3>
                        {getModuleIcon(
                          currentModule
                        )}{' '}
                        {allDepartments.find(
                          d =>
                            d.module_code ===
                            currentModule
                        )?.department_name ||
                          currentModule}
                      </h3>
                    </div>

                    <p>
                      Select permissions for
                      this module
                    </p>
                  </>
                ) : (
                  <>
                    <h3>
                      Manage Permissions
                    </h3>

                    <p>
                      Select a department to
                      configure its permissions
                    </p>
                  </>
                )}

              </div>

              <button
                type="button"
                className="modalClose"
                onClick={
                  closePermissionModal
                }
              >
                <FiX />
              </button>

            </div>

            {currentModule === null ? (
              <>
                <div className="modalBody permissionDepartmentBody">

                  {selectedDepartmentIds.length ===
                  0 ? (
                    <div className="modalEmpty">
                      <FiUsers />

                      <span>
                        No departments
                        selected
                      </span>
                    </div>
                  ) : (
                    <div className="permissionDepartmentList">

                      {allDepartments
                        .filter(d =>
                          selectedDepartmentIds.includes(
                            d.department_id
                          )
                        )
                        .map(dept => {

                          const module =
                            dept.module_code ||
                            'other';

                          const color =
                            getModuleColor(
                              module
                            );

                          const count =
                            selectedPermissions[
                              module
                            ]?.length || 0;

                          return (
                            <button
                              type="button"
                              key={
                                dept.department_id
                              }
                              className="permissionDepartmentRow"
                              disabled={
                                !dept.module_code
                              }
                              onClick={() =>
                                handleDepartmentSelect(
                                  dept
                                )
                              }
                              style={
                                {
                                  '--module-color':
                                    color,
                                  '--module-soft': `${color}12`,
                                } as React.CSSProperties
                              }
                            >

                              <div className="permissionDepartmentIcon">
                                {
                                  getModuleIcon(
                                    module
                                  )
                                }
                              </div>

                              <div className="permissionDepartmentInfo">

                                <strong>
                                  {
                                    dept.department_name
                                  }
                                </strong>

                                <span>
                                  {dept.module_code ||
                                    'No module assigned'}
                                </span>

                              </div>

                              <div className="permissionCount">
                                {count}
                              </div>

                              <FiChevronRight />

                            </button>
                          );
                        })}

                    </div>
                  )}

                </div>

                <div className="modalFooter">

                  <span>
                    {totalPermissions}{' '}
                    permissions selected
                  </span>

                  <button
                    type="button"
                    className="modalPrimaryButton"
                    onClick={
                      confirmAllPermissions
                    }
                  >
                    <FiCheck />
                    Done
                  </button>

                </div>
              </>
            ) : (
              <>
                <div className="permissionToolbar">

                  <div className="searchBox permissionSearch">
                    <FiSearch />

                    <input
                      value={
                        permissionSearch
                      }
                      onChange={e =>
                        setPermissionSearch(
                          e.target.value
                        )
                      }
                      placeholder="Search permissions..."
                    />
                  </div>

                  <button
                    type="button"
                    className="selectAllButton"
                    onClick={
                      toggleAllTempPermissions
                    }
                  >
                    {currentPermissions.length >
                      0 &&
                    tempPermsForModule.length ===
                      currentPermissions.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>

                </div>

                <div className="modalBody permissionBody">

                  {loadingPermissions ? (
                    <div className="modalLoading">
                      <div className="spinner small" />

                      <span>
                        Loading permissions...
                      </span>
                    </div>
                  ) : filteredPermissions.length ===
                    0 ? (
                    <div className="modalEmpty">
                      <FiKey />

                      <span>
                        No permissions found
                      </span>
                    </div>
                  ) : (
                    <div className="permissionList">

                      {filteredPermissions.map(
                        perm => {

                          const checked =
                            tempPermsForModule.includes(
                              perm.permission_name
                            );

                          return (
                            <button
                              type="button"
                              key={
                                perm.permission_name
                              }
                              className={
                                checked
                                  ? 'permissionRow selected'
                                  : 'permissionRow'
                              }
                              onClick={() =>
                                toggleTempPermission(
                                  perm.permission_name
                                )
                              }
                            >

                              <div
                                className={
                                  checked
                                    ? 'customCheckbox checked'
                                    : 'customCheckbox'
                                }
                              >
                                {checked && (
                                  <FiCheck />
                                )}
                              </div>

                              <div className="permissionRowInfo">

                                <strong>
                                  {
                                    perm.permission_name
                                  }
                                </strong>

                                {perm.description && (
                                  <span>
                                    {
                                      perm.description
                                    }
                                  </span>
                                )}

                              </div>

                            </button>
                          );
                        }
                      )}

                    </div>
                  )}

                </div>

                <div className="modalFooter">

                  <span>
                    {
                      tempPermsForModule.length
                    }{' '}
                    selected
                  </span>

                  <div>
                    <button
                      type="button"
                      className="modalCancelButton"
                      onClick={
                        cancelDepartmentPermissions
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="modalPrimaryButton"
                      onClick={
                        saveModulePermissions
                      }
                    >
                      <FiCheck />
                      Save Permissions
                    </button>
                  </div>

                </div>
              </>
            )}

          </div>

        </div>
      )}

      <style jsx>{styles}</style>
    </>
  );
}

// =========================================================
// STYLES
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
        rgba(123, 47, 190, 0.045),
        transparent 30%
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

    padding-bottom: 100px;
  }

  /* =======================================================
     HEADER
  ======================================================= */

  .pageHeader {
    position: relative;

    background: rgba(255, 255, 255, 0.96);

    border-bottom: 1px solid #e5eaf1;

    box-shadow:
      0 2px 10px rgba(15, 23, 42, 0.035);
  }

  .headerInner {
    width: min(1200px, calc(100% - 48px));

    min-height: 105px;

    margin: 0 auto;

    display: flex;
    align-items: center;

    gap: 15px;
  }

  .headerAccent {
    position: absolute;

    bottom: 0;
    left: 0;

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

    width: 40px;
    height: 40px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border: 1px solid #e2e8f0;
    border-radius: 10px;

    background: #ffffff;
    color: #64748b;

    cursor: pointer;

    transition:
      transform 0.18s ease,
      background 0.18s ease,
      color 0.18s ease;
  }

  .backButton:hover {
    color: #2563eb;
    background: #eff6ff;
    transform: translateX(-2px);
  }

  .backButton svg {
    width: 18px;
    height: 18px;
  }

  .headerIcon {
    width: 54px;
    height: 54px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 14px;

    background: #eef4ff;
    color: #2563eb;
  }

  .headerIcon svg {
    width: 25px;
    height: 25px;
  }

  .headerText {
    min-width: 0;
    flex: 1;
  }

  .breadcrumb {
    display: flex;
    align-items: center;

    gap: 4px;

    margin-bottom: 5px;

    color: #94a3b8;

    font-size: 10px;
    font-weight: 650;
  }

  .breadcrumb svg {
    width: 11px;
    height: 11px;
  }

  .headerText h1 {
    margin: 0;

    color: #172033;

    font-size: 27px;
    line-height: 1.15;

    font-weight: 750;

    letter-spacing: -0.5px;
  }

  .headerText p {
    margin: 5px 0 0;

    color: #64748b;

    font-size: 12px;
  }

  .systemBadge {
    display: flex;
    align-items: center;
    gap: 6px;

    padding: 8px 11px;

    border: 1px solid #fed7aa;
    border-radius: 9px;

    background: #fff7ed;
    color: #c2410c;

    font-size: 11px;
    font-weight: 650;

    white-space: nowrap;
  }

  .systemBadge svg {
    width: 14px;
    height: 14px;
  }

  /* =======================================================
     CONTENT
  ======================================================= */

  .pageContent {
    width: min(1000px, calc(100% - 48px));

    margin: 0 auto;

    padding: 30px 0 45px;

    display: flex;
    flex-direction: column;

    gap: 18px;
  }

  /* =======================================================
     CARD
  ======================================================= */

  .card {
    border: 1px solid #e5eaf1;
    border-radius: 16px;

    background: #ffffff;

    box-shadow:
      0 2px 6px rgba(15, 23, 42, 0.025);

    overflow: hidden;
  }

  .cardHeader {
    display: flex;
    align-items: center;

    gap: 12px;

    padding: 20px 22px;

    border-bottom: 1px solid #edf0f4;
  }

  .cardHeaderIcon {
    width: 42px;
    height: 42px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 11px;
  }

  .cardHeaderIcon svg {
    width: 19px;
    height: 19px;
  }

  .cardHeaderIcon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .cardHeaderIcon.purple {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .cardHeaderIcon.green {
    background: #ecfdf5;
    color: #059669;
  }

  .cardHeader h2 {
    margin: 0;

    color: #1e293b;

    font-size: 16px;
    line-height: 1.3;

    font-weight: 700;
  }

  .cardHeader p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 11px;
    line-height: 1.4;
  }

  .cardHeaderMain {
    flex: 1;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 15px;
  }

  /* =======================================================
     SYSTEM NOTICE
  ======================================================= */

  .systemNotice {
    margin: 18px 22px 0;

    display: flex;
    gap: 11px;

    padding: 12px 14px;

    border: 1px solid #fed7aa;
    border-radius: 11px;

    background: #fffaf3;
  }

  .noticeIcon {
    width: 30px;
    height: 30px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    background: #ffedd5;
    color: #ea580c;
  }

  .noticeIcon svg {
    width: 15px;
    height: 15px;
  }

  .systemNotice strong {
    color: #9a3412;

    font-size: 12px;
    font-weight: 700;
  }

  .systemNotice p {
    margin: 3px 0 0;

    color: #9a6b45;

    font-size: 11px;
    line-height: 1.5;
  }

  /* =======================================================
     FORM
  ======================================================= */

  .formGrid {
    padding: 22px;

    display: grid;

    grid-template-columns:
      repeat(2, minmax(0, 1fr));

    gap: 20px;
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
    gap: 3px;

    margin-bottom: 7px;

    color: #334155;

    font-size: 11px;
    font-weight: 700;
  }

  .field label span {
    color: #ef4444;
  }

  .field label small {
    margin-left: 4px;

    color: #94a3b8;

    font-size: 9px;
    font-weight: 500;
  }

  .input,
  .textarea {
    width: 100%;

    border: 1px solid #dfe5ec;
    border-radius: 9px;

    background: #ffffff;

    color: #1e293b;

    font-family: inherit;
    font-size: 13px;

    outline: none;

    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease;
  }

  .input {
    height: 43px;

    padding: 0 12px;
  }

  .textarea {
    padding: 11px 12px;

    resize: vertical;

    line-height: 1.5;
  }

  .input::placeholder,
  .textarea::placeholder {
    color: #b2bac6;
  }

  .input:focus,
  .textarea:focus {
    border-color: #7b2fbe;

    box-shadow:
      0 0 0 3px rgba(123, 47, 190, 0.08);
  }

  .input.error {
    border-color: #ef4444;
  }

  .inputWithHint {
    position: relative;
  }

  .inputWithHint .input {
    padding-right: 55px;
  }

  .inputWithHint > span {
    position: absolute;

    top: 50%;
    right: 12px;

    transform: translateY(-50%);

    color: #94a3b8;

    font-size: 9px;
    font-weight: 600;
  }

  .fieldError {
    margin: 5px 0 0;

    color: #ef4444;

    font-size: 10px;
    font-weight: 500;
  }

  /* =======================================================
     SELECTION PANEL
  ======================================================= */

  .selectionPanel {
    padding: 18px 22px 22px;
  }

  .selectionPanelTop {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 15px;
  }

  .selectionSummary {
    display: flex;
    align-items: center;
    gap: 7px;

    color: #64748b;

    font-size: 11px;
    font-weight: 600;
  }

  .summaryDot {
    width: 7px;
    height: 7px;

    border-radius: 50%;
  }

  .purpleDot {
    background: #7c3aed;
  }

  .outlineButton {
    display: flex;
    align-items: center;
    gap: 6px;

    padding: 8px 11px;

    border: 1px solid #dfe5ec;
    border-radius: 8px;

    background: #ffffff;
    color: #475569;

    cursor: pointer;

    font-size: 10px;
    font-weight: 650;

    transition:
      color 0.18s ease,
      border-color 0.18s ease,
      background 0.18s ease;
  }

  .outlineButton:hover {
    color: #7c3aed;

    border-color: #ddd6fe;
    background: #faf5ff;
  }

  .outlineButton svg {
    width: 14px;
    height: 14px;
  }

  .emptySelection {
    min-height: 100px;

    margin-top: 14px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    gap: 5px;

    border: 1px dashed #d9dee7;
    border-radius: 11px;

    background: #fafbfc;

    color: #94a3b8;

    font-size: 11px;
  }

  .emptySelection svg {
    width: 20px;
    height: 20px;
  }

  .emptySelection button {
    all: unset;

    margin-top: 2px;

    color: #7c3aed;

    cursor: pointer;

    font-size: 10px;
    font-weight: 650;
  }

  .chipList {
    margin-top: 15px;

    display: flex;
    flex-wrap: wrap;

    gap: 7px;
  }

  .selectionChip {
    display: flex;
    align-items: center;
    gap: 7px;

    padding: 7px 8px 7px 10px;

    border: 1px solid;

    border-radius: 8px;

    font-size: 10px;
    font-weight: 600;
  }

  .purpleChip {
    border-color: #ddd6fe;

    background: #faf5ff;

    color: #6d28d9;
  }

  .selectionChip button {
    all: unset;

    width: 17px;
    height: 17px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 5px;

    cursor: pointer;

    transition:
      background 0.15s ease;
  }

  .selectionChip button:hover {
    background: rgba(124, 58, 237, 0.1);
  }

  .selectionChip button svg {
    width: 11px;
    height: 11px;
  }

  /* =======================================================
     BADGES
  ======================================================= */

  .countBadge {
    padding: 6px 9px;

    border-radius: 7px;

    font-size: 9px;
    font-weight: 700;

    white-space: nowrap;
  }

  .purpleBadge {
    background: #f5f3ff;
    color: #7c3aed;
  }

  /* =======================================================
     PERMISSIONS
  ======================================================= */

  .permissionContainer {
    padding: 18px 22px 22px;
  }

  .permissionStats {
    display: flex;
    gap: 20px;
  }

  .permissionStats > div {
    display: flex;
    flex-direction: column;

    text-align: right;
  }

  .permissionStats strong {
    color: #1e293b;

    font-size: 17px;
    line-height: 1;

    font-weight: 750;
  }

  .permissionStats span {
    margin-top: 4px;

    color: #94a3b8;

    font-size: 8px;
    font-weight: 600;
  }

  .permissionTopBar {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 15px;

    margin-bottom: 14px;
  }

  .permissionTopBar > div {
    display: flex;
    flex-direction: column;
  }

  .permissionTopBar strong {
    color: #334155;

    font-size: 11px;
    font-weight: 700;
  }

  .permissionTopBar span {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 9px;
  }

  .permissionModuleGrid {
    display: grid;

    grid-template-columns:
      repeat(2, minmax(0, 1fr));

    gap: 9px;
  }

  .permissionModule {
    all: unset;

    min-width: 0;

    position: relative;

    display: flex;
    align-items: center;

    gap: 10px;

    padding: 12px;

    border: 1px solid #e6eaf0;
    border-radius: 11px;

    background: #ffffff;

    cursor: pointer;

    transition:
      border-color 0.18s ease,
      background 0.18s ease,
      transform 0.18s ease;
  }

  .permissionModule:hover:not(:disabled) {
    border-color: var(--module-border);
    background: var(--module-soft);

    transform: translateY(-1px);
  }

  .permissionModule:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .permissionModuleIcon {
    width: 38px;
    height: 38px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;

    background: var(--module-soft);

    font-size: 19px;
  }

  .permissionModuleInfo {
    min-width: 0;

    flex: 1;

    display: flex;
    flex-direction: column;

    text-align: left;
  }

  .permissionModuleInfo strong {
    overflow: hidden;

    color: #334155;

    font-size: 11px;
    font-weight: 700;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .permissionModuleInfo span {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 9px;
  }

  .permissionModuleArrow {
    color: #94a3b8;
  }

  .permissionModuleArrow svg {
    width: 14px;
    height: 14px;
  }

  .permissionEmpty {
    min-height: 240px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    text-align: center;
  }

  .largeEmptyIcon {
    width: 55px;
    height: 55px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 14px;

    background: #f1f5f9;
    color: #94a3b8;
  }

  .largeEmptyIcon svg {
    width: 23px;
    height: 23px;
  }

  .permissionEmpty h3 {
    margin: 15px 0 0;

    color: #334155;

    font-size: 14px;
    font-weight: 700;
  }

  .permissionEmpty p {
    max-width: 400px;

    margin: 6px 0 15px;

    color: #94a3b8;

    font-size: 10px;
    line-height: 1.6;
  }

  .primarySmallButton {
    display: flex;
    align-items: center;
    gap: 6px;

    padding: 9px 12px;

    border: 0;
    border-radius: 8px;

    background: #7b2fbe;
    color: #ffffff;

    cursor: pointer;

    font-size: 10px;
    font-weight: 650;
  }

  .primarySmallButton svg {
    width: 13px;
    height: 13px;
  }

  /* =======================================================
     SAVE BAR
  ======================================================= */

  .saveBar {
    position: fixed;

    right: 0;
    bottom: 0;
    left: 0;

    z-index: 30;

    border-top: 1px solid #e3e8ef;

    background: rgba(255,255,255,0.94);

    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);

    box-shadow:
      0 -5px 20px rgba(15,23,42,0.05);
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

  .saveInfo {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .saveStatusDot {
    width: 8px;
    height: 8px;

    border-radius: 50%;

    background: #22c55e;

    box-shadow:
      0 0 0 4px #dcfce7;
  }

  .saveInfo > div:last-child {
    display: flex;
    flex-direction: column;
  }

  .saveInfo strong {
    color: #334155;

    font-size: 10px;
    font-weight: 700;
  }

  .saveInfo span {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 9px;
  }

  .saveActions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cancelButton,
  .saveButton {
    height: 38px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 7px;

    padding: 0 14px;

    border-radius: 8px;

    cursor: pointer;

    font-family: inherit;

    font-size: 10px;
    font-weight: 650;
  }

  .cancelButton {
    border: 1px solid #e0e5ec;

    background: #ffffff;
    color: #64748b;
  }

  .saveButton {
    border: 0;

    background:
      linear-gradient(
        135deg,
        #2563eb,
        #7b2fbe
      );

    color: #ffffff;

    box-shadow:
      0 5px 12px rgba(82, 58, 180, 0.2);
  }

  .saveButton:hover:not(:disabled) {
    box-shadow:
      0 7px 16px rgba(82, 58, 180, 0.28);
  }

  .cancelButton:disabled,
  .saveButton:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .saveButton svg {
    width: 14px;
    height: 14px;
  }

  .buttonSpinner {
    width: 13px;
    height: 13px;

    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #ffffff;

    border-radius: 50%;

    animation: spin 0.7s linear infinite;
  }

  /* =======================================================
     MODALS
  ======================================================= */

  .modalOverlay {
    position: fixed;

    inset: 0;

    z-index: 100;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 25px;

    background: rgba(15, 23, 42, 0.48);

    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);

    animation: fadeIn 0.15s ease;
  }

  .modal {
    width: min(560px, 100%);

    max-height: min(720px, calc(100vh - 50px));

    display: flex;
    flex-direction: column;

    border: 1px solid #e5eaf1;
    border-radius: 17px;

    background: #ffffff;

    box-shadow:
      0 25px 70px rgba(15, 23, 42, 0.2);

    overflow: hidden;

    animation: modalIn 0.18s ease;
  }

  .permissionModal {
    width: min(700px, 100%);
  }

  .modalHeader {
    flex-shrink: 0;

    display: flex;
    align-items: flex-start;
    justify-content: space-between;

    gap: 15px;

    padding: 20px 22px;

    border-bottom: 1px solid #edf0f4;
  }

  .modalHeader h3 {
    margin: 0;

    color: #1e293b;

    font-size: 16px;
    font-weight: 750;
  }

  .modalHeader p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 10px;
  }

  .modalClose {
    all: unset;

    width: 32px;
    height: 32px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    color: #94a3b8;

    cursor: pointer;

    transition:
      background 0.15s ease,
      color 0.15s ease;
  }

  .modalClose:hover {
    background: #f1f5f9;
    color: #334155;
  }

  .modalClose svg {
    width: 18px;
    height: 18px;
  }

  .modalBackTitle {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .modalBackTitle button {
    all: unset;

    width: 27px;
    height: 27px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 7px;

    color: #64748b;

    cursor: pointer;
  }

  .modalBackTitle button:hover {
    background: #f1f5f9;
  }

  .modalBackTitle button svg {
    width: 15px;
    height: 15px;
  }

  .modalToolbar,
  .permissionToolbar {
    flex-shrink: 0;

    display: flex;
    align-items: center;

    gap: 9px;

    padding: 12px 16px;

    border-bottom: 1px solid #edf0f4;

    background: #fafbfc;
  }

  .searchBox {
    height: 37px;

    flex: 1;

    display: flex;
    align-items: center;

    gap: 8px;

    padding: 0 10px;

    border: 1px solid #e0e5ec;
    border-radius: 8px;

    background: #ffffff;

    color: #94a3b8;
  }

  .searchBox svg {
    width: 15px;
    height: 15px;
  }

  .searchBox input {
    width: 100%;

    border: 0;
    outline: 0;

    background: transparent;

    color: #334155;

    font-family: inherit;
    font-size: 11px;
  }

  .searchBox input::placeholder {
    color: #b0b8c4;
  }

  .selectAllButton {
    all: unset;

    height: 37px;

    display: flex;
    align-items: center;

    padding: 0 10px;

    color: #2563eb;

    cursor: pointer;

    font-size: 10px;
    font-weight: 650;

    white-space: nowrap;
  }

  .selectAllButton:hover {
    color: #1d4ed8;
  }

  .modalBody {
    flex: 1;

    min-height: 0;

    overflow-y: auto;

    padding: 8px;
  }

  .modalLoading {
    min-height: 180px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    gap: 10px;

    color: #94a3b8;

    font-size: 11px;
  }

  .spinner {
    width: 38px;
    height: 38px;

    border: 3px solid #e8edf3;
    border-top-color: #2563eb;

    border-radius: 50%;

    animation: spin 0.8s linear infinite;
  }

  .spinner.small {
    width: 25px;
    height: 25px;

    border-width: 2px;
  }

  .modalEmpty {
    min-height: 180px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    gap: 8px;

    color: #94a3b8;

    font-size: 11px;
  }

  .modalEmpty svg {
    width: 25px;
    height: 25px;
  }

  /* =======================================================
     DEPARTMENT ROWS
  ======================================================= */

  .departmentList {
    display: flex;
    flex-direction: column;
  }

  .departmentRow {
    all: unset;

    min-height: 57px;

    display: flex;
    align-items: center;

    gap: 10px;

    padding: 8px 11px;

    border-radius: 9px;

    cursor: pointer;

    transition:
      background 0.15s ease;
  }

  .departmentRow:hover {
    background: #f8fafc;
  }

  .departmentRow.selected {
    background: #faf5ff;
  }

  .customCheckbox {
    width: 18px;
    height: 18px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border: 1.5px solid #cbd5e1;
    border-radius: 5px;

    background: #ffffff;

    color: #ffffff;
  }

  .customCheckbox.checked {
    border-color: #7b2fbe;

    background: #7b2fbe;
  }

  .customCheckbox svg {
    width: 12px;
    height: 12px;
  }

  .departmentRowInfo {
    min-width: 0;

    flex: 1;

    display: flex;
    flex-direction: column;

    text-align: left;
  }

  .departmentRowInfo strong {
    color: #334155;

    font-size: 11px;
    font-weight: 650;
  }

  .departmentRowInfo span {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 9px;
  }

  .rowCheck {
    width: 14px;
    height: 14px;

    color: #7b2fbe;
  }

  /* =======================================================
     PERMISSION DEPARTMENT LIST
  ======================================================= */

  .permissionDepartmentBody {
    padding: 12px;
  }

  .permissionDepartmentList {
    display: flex;
    flex-direction: column;

    gap: 6px;
  }

  .permissionDepartmentRow {
    all: unset;

    display: flex;
    align-items: center;

    gap: 11px;

    padding: 12px;

    border: 1px solid #e7ebf1;
    border-radius: 11px;

    background: #ffffff;

    cursor: pointer;

    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      transform 0.15s ease;
  }

  .permissionDepartmentRow:hover:not(:disabled) {
    border-color: var(--module-color);

    background: var(--module-soft);

    transform: translateY(-1px);
  }

  .permissionDepartmentRow:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .permissionDepartmentIcon {
    width: 39px;
    height: 39px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;

    background: var(--module-soft);

    font-size: 20px;
  }

  .permissionDepartmentInfo {
    flex: 1;

    display: flex;
    flex-direction: column;
  }

  .permissionDepartmentInfo strong {
    color: #334155;

    font-size: 11px;
    font-weight: 700;
  }

  .permissionDepartmentInfo span {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 9px;
  }

  .permissionCount {
    min-width: 29px;
    height: 25px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 7px;

    background: var(--module-soft);

    color: var(--module-color);

    font-size: 10px;
    font-weight: 750;
  }

  .permissionDepartmentRow > svg {
    width: 15px;
    height: 15px;

    color: #94a3b8;
  }

  /* =======================================================
     PERMISSION LIST
  ======================================================= */

  .permissionBody {
    padding: 12px;
  }

  .permissionList {
    display: grid;

    grid-template-columns:
      repeat(2, minmax(0, 1fr));

    gap: 7px;
  }

  .permissionRow {
    all: unset;

    min-width: 0;

    display: flex;
    align-items: flex-start;

    gap: 9px;

    padding: 11px;

    border: 1px solid #e5e9ef;
    border-radius: 9px;

    background: #ffffff;

    cursor: pointer;

    transition:
      background 0.15s ease,
      border-color 0.15s ease;
  }

  .permissionRow:hover {
    background: #f8fafc;
  }

  .permissionRow.selected {
    border-color: #bfdbfe;

    background: #eff6ff;
  }

  .permissionRowInfo {
    min-width: 0;

    display: flex;
    flex-direction: column;

    text-align: left;
  }

  .permissionRowInfo strong {
    color: #334155;

    font-size: 10px;
    line-height: 1.4;

    font-weight: 650;
  }

  .permissionRowInfo span {
    margin-top: 4px;

    color: #94a3b8;

    font-size: 9px;
    line-height: 1.4;
  }

  /* =======================================================
     MODAL FOOTER
  ======================================================= */

  .modalFooter {
    flex-shrink: 0;

    min-height: 62px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 15px;

    padding: 11px 16px;

    border-top: 1px solid #edf0f4;

    background: #fafbfc;
  }

  .modalFooter > span {
    color: #94a3b8;

    font-size: 10px;
    font-weight: 600;
  }

  .modalFooter > div {
    display: flex;
    align-items: center;

    gap: 7px;
  }

  .modalCancelButton,
  .modalPrimaryButton {
    height: 36px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 6px;

    padding: 0 12px;

    border-radius: 8px;

    cursor: pointer;

    font-family: inherit;

    font-size: 10px;
    font-weight: 650;
  }

  .modalCancelButton {
    border: 1px solid #dfe5ec;

    background: #ffffff;

    color: #64748b;
  }

  .modalPrimaryButton {
    border: 0;

    background: #2563eb;

    color: #ffffff;

    box-shadow:
      0 4px 10px rgba(37,99,235,0.18);
  }

  .modalPrimaryButton:hover {
    background: #1d4ed8;
  }

  .modalPrimaryButton svg,
  .modalCancelButton svg {
    width: 14px;
    height: 14px;
  }

  /* =======================================================
     RESPONSIVE
  ======================================================= */

  @media (max-width: 800px) {
    .headerInner,
    .pageContent,
    .saveBarInner {
      width: calc(100% - 28px);
    }

    .pageContent {
      padding-top: 20px;
    }

    .formGrid {
      grid-template-columns: 1fr;
    }

    .field.full {
      grid-column: auto;
    }

    .permissionModuleGrid {
      grid-template-columns: 1fr;
    }

    .permissionList {
      grid-template-columns: 1fr;
    }

    .systemBadge {
      display: none;
    }
  }

  @media (max-width: 600px) {
    .headerInner {
      min-height: 88px;
    }

    .headerIcon {
      width: 46px;
      height: 46px;
    }

    .headerText h1 {
      font-size: 22px;
    }

    .breadcrumb {
      display: none;
    }

    .cardHeader,
    .formGrid,
    .selectionPanel,
    .permissionContainer {
      padding-left: 16px;
      padding-right: 16px;
    }

    .cardHeaderMain {
      align-items: flex-start;
    }

    .permissionStats {
      display: none;
    }

    .selectionPanelTop,
    .permissionTopBar {
      align-items: flex-start;
      flex-direction: column;
    }

    .outlineButton {
      width: 100%;
      justify-content: center;
    }

    .saveBarInner {
      min-height: 74px;
    }

    .saveInfo {
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
      padding: 0;
      align-items: flex-end;
    }

    .modal {
      width: 100%;

      max-height: 90vh;

      border-radius: 17px 17px 0 0;
    }

    .permissionModal {
      width: 100%;
    }

    .modalToolbar,
    .permissionToolbar {
      flex-wrap: wrap;
    }

    .searchBox {
      width: 100%;
      flex-basis: 100%;
    }

    .selectAllButton {
      margin-left: auto;
    }

    .modalFooter {
      padding-bottom:
        max(11px, env(safe-area-inset-bottom));
    }
  }

  @media (max-width: 400px) {
    .headerText p {
      display: none;
    }

    .cardHeader {
      padding-top: 16px;
      padding-bottom: 16px;
    }

    .cardHeaderIcon {
      width: 37px;
      height: 37px;
    }

    .cardHeader h2 {
      font-size: 14px;
    }

    .permissionDepartmentRow {
      padding: 10px;
    }
  }

  /* =======================================================
     ANIMATIONS
  ======================================================= */

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes modalIn {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.99);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .loadingPage {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loadingCard {
    width: min(380px, calc(100% - 40px));

    padding: 38px 30px;

    display: flex;
    flex-direction: column;
    align-items: center;

    border: 1px solid #e5eaf1;
    border-radius: 17px;

    background: #ffffff;

    box-shadow:
      0 12px 35px rgba(15,23,42,0.06);

    text-align: center;
  }

  .loadingCard h2 {
    margin: 18px 0 0;

    color: #1e293b;

    font-size: 18px;
    font-weight: 700;
  }

  .loadingCard p {
    margin: 6px 0 0;

    color: #94a3b8;

    font-size: 11px;
  }
`;