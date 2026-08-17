import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import {
  getEmployeeDetails,
  updateEmployee,
  getCompanyEmployees,
  listRoles,
  listPositions,
  findEmployeeByUsername,
} from '@b2b/api-client';

import { useUserAuthStore } from '../../../store/userAuthStore';
import { Role, Position, CompanyEmployee } from '@b2b/shared-types';
import { UserAvatar } from '../../../components/UserAvatar';

import {
  FiArrowLeft,
  FiArrowRight,
  FiBriefcase,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiSearch,
  FiUser,
  FiUsers,
  FiX,
  FiAlertCircle,
  FiSave,
  FiShield,
  FiMapPin,
  FiRefreshCw,
} from 'react-icons/fi';

// =========================================================
// SWITCH
// =========================================================

const Switch: React.FC<{
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ value, onChange }) => {
  return (
    <button
      type="button"
      className={`switch ${value ? 'switchActive' : ''}`}
      onClick={() => onChange(!value)}
      aria-label={value ? 'Deactivate employee' : 'Activate employee'}
    >
      <span className="switchThumb" />
    </button>
  );
};

// =========================================================
// SEARCH INPUT
// =========================================================

const SearchInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onSearch?: () => void;
}> = ({
  value,
  onChange,
  placeholder = 'Search...',
  onSearch,
}) => {
  return (
    <div className="searchBox">
      <FiSearch className="searchIcon" />

      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSearch?.();
          }
        }}
      />

      {value && (
        <button
          type="button"
          className="clearSearch"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <FiX />
        </button>
      )}
    </div>
  );
};

// =========================================================
// SELECT MODAL
// =========================================================

const SelectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modalOverlay"
      onClick={onClose}
    >
      <div
        className="selectModal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div className="modalTitleGroup">
            <div className="modalIcon">
              {icon || <FiSearch />}
            </div>

            <div>
              <h3>{title}</h3>

              {subtitle && (
                <p>{subtitle}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            className="modalClose"
            onClick={onClose}
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>

        <div className="modalBody">
          {children}
        </div>
      </div>
    </div>
  );
};

// =========================================================
// FIELD
// =========================================================

const FieldLabel: React.FC<{
  label: string;
  required?: boolean;
}> = ({ label, required }) => {
  return (
    <label className="fieldLabel">
      {label}

      {required && (
        <span className="required">*</span>
      )}
    </label>
  );
};

// =========================================================
// MAIN SCREEN
// =========================================================

export default function EditEmployeeScreen() {
  const router = useRouter();
  const { userId } = router.query;

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

  const [employeeId, setEmployeeId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [reportsTo, setReportsTo] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  const [roles, setRoles] = useState<Role[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [managers, setManagers] = useState<CompanyEmployee[]>([]);

  // Modals
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [positionModalOpen, setPositionModalOpen] = useState(false);
  const [reportsToModalOpen, setReportsToModalOpen] = useState(false);

  // Search
  const [roleSearch, setRoleSearch] = useState('');
  const [positionSearch, setPositionSearch] = useState('');
  const [reportsToSearch, setReportsToSearch] = useState('');

  const [reportsToResults, setReportsToResults] =
    useState<CompanyEmployee[]>([]);

  const [reportsToLoading, setReportsToLoading] =
    useState(false);

  // Validation
  const [errors, setErrors] = useState<{
    [key: string]: string;
  }>({});

  // Feedback
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // =======================================================
  // LOAD DATA
  // =======================================================

  useEffect(() => {
    if (
      !userId ||
      !accessToken ||
      !companyId ||
      !deviceId
    ) {
      if (userId) {
        setSaveError(
          'Missing authentication information.'
        );
      }

      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setSaveError('');

      try {
        const [
          employeeRaw,
          rolesRes,
          positionsRes,
          managersRes,
        ] = await Promise.all([
          getEmployeeDetails(
            companyId,
            userId as string,
            deviceId,
            accessToken
          ),

          listRoles(
            companyId,
            deviceId,
            {
              page: 1,
              limit: 100,
            },
            accessToken
          ),

          listPositions(
            companyId,
            deviceId,
            {
              offset: 0,
              limit: 100,
            },
            accessToken
          ),

          getCompanyEmployees(
            companyId,
            deviceId,
            accessToken
          ),
        ]);

        const employee = employeeRaw as any;

        if (!employee) {
          throw new Error(
            'Employee could not be found.'
          );
        }

        setEmployeeId(
          employee.employee_id || ''
        );

        setRoleId(
          employee.role_id || ''
        );

        setPositionId(
          employee.position_id || ''
        );

        setReportsTo(
          employee.reports_to ?? null
        );

        setIsActive(
          employee.is_active ?? true
        );

        setRoles(
          rolesRes.data?.roles || []
        );

        setPositions(
          positionsRes.data?.positions || []
        );

        const allEmployees =
          managersRes.data?.employees || [];

        setManagers(allEmployees);
        setReportsToResults(allEmployees);
      } catch (error: any) {
        console.error(
          'Failed to load employee:',
          error
        );

        setSaveError(
          error?.message ||
            'Failed to load employee information.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    userId,
    accessToken,
    companyId,
    deviceId,
  ]);

  // =======================================================
  // REPORTS TO SEARCH
  // =======================================================

  const handleReportsToSearch = async () => {
    const search = reportsToSearch.trim();

    if (!search) {
      setReportsToResults(managers);
      return;
    }

    setReportsToLoading(true);

    try {
      const res =
        await findEmployeeByUsername(
          companyId!,
          deviceId!,
          search,
          accessToken!
        );

      const employee =
        (res.data as any)?.employee ||
        null;

      setReportsToResults(
        employee ? [employee] : []
      );
    } catch (error) {
      console.error(
        'Manager search failed:',
        error
      );

      setReportsToResults([]);
    } finally {
      setReportsToLoading(false);
    }
  };

  const clearReportsToSearch = () => {
    setReportsToSearch('');
    setReportsToResults(managers);
  };

  // =======================================================
  // VALIDATION
  // =======================================================

  const validate = (): boolean => {
    const newErrors: {
      [key: string]: string;
    } = {};

    if (!employeeId.trim()) {
      newErrors.employeeId =
        'Employee ID is required';
    }

    if (!roleId) {
      newErrors.roleId =
        'Please select a role';
    }

    if (!positionId) {
      newErrors.positionId =
        'Please select a position';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // =======================================================
  // UPDATE
  // =======================================================

  const handleUpdate = async () => {
    setSaveError('');
    setSaveSuccess(false);

    if (!validate()) {
      return;
    }

    if (
      !accessToken ||
      !companyId ||
      !deviceId
    ) {
      setSaveError(
        'Missing authentication information. Please log in again.'
      );

      return;
    }

    setSaving(true);

    try {
      const payload = {
        employee_id: employeeId.trim(),
        role_id: roleId,
        position_id: positionId,
        reports_to: reportsTo || null,
        is_active: isActive,
      };

      await updateEmployee(
        companyId,
        userId as string,
        deviceId,
        accessToken,
        payload
      );

      setSaveSuccess(true);

      setTimeout(() => {
        router.back();
      }, 900);
    } catch (error: any) {
      console.error(
        'Employee update failed:',
        error
      );

      setSaveError(
        error?.message ||
          'Unable to update employee.'
      );
    } finally {
      setSaving(false);
    }
  };

  // =======================================================
  // HELPERS
  // =======================================================

  const selectedRole = roles.find(
    (role) => role.role_id === roleId
  );

  const selectedPosition =
    positions.find(
      (position) =>
        position.position_id === positionId
    );

  const selectedManager =
    managers.find(
      (manager) =>
        manager.user_id === reportsTo
    );

  const filteredRoles = roles.filter(
    (role) =>
      role.role_name
        .toLowerCase()
        .includes(
          roleSearch.toLowerCase()
        )
  );

  const filteredPositions =
    positions.filter(
      (position) =>
        position.title
          .toLowerCase()
          .includes(
            positionSearch.toLowerCase()
          )
    );

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <>
        <div className="employeePage loadingPage">
          <div className="loadingCard">
            <div className="loadingSpinner" />

            <h2>Loading employee</h2>

            <p>
              Fetching employee information...
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
      <div className="employeePage">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="pageHeader">
          <div className="headerInner">

            <button
              type="button"
              className="backButton"
              onClick={() => router.back()}
              aria-label="Go back"
            >
              <FiArrowLeft />
            </button>

            <div className="headerIcon">
              <FiUser />
            </div>

            <div className="headerTitle">
              <div className="breadcrumb">
                <span>Administration</span>
                <FiChevronRight />
                <span>Employees</span>
                <FiChevronRight />
                <span>Edit</span>
              </div>

              <h1>Edit Employee</h1>

              <p>
                Update employee information,
                role and reporting structure
              </p>
            </div>
          </div>
        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="pageContent">

          {/* =================================================
              EMPLOYEE PROFILE SUMMARY
          ================================================= */}

          <section className="employeeSummary">

            <div className="employeeSummaryLeft">

              <div className="largeAvatar">
                <FiUser />
              </div>

              <div className="employeeIdentity">
                <span className="identityLabel">
                  EMPLOYEE
                </span>

                <h2>
                  {employeeId || 'Employee'}
                </h2>

                <p>
                  Employee ID
                  <span className="identityDot">
                    •
                  </span>
                  {isActive
                    ? 'Active'
                    : 'Inactive'}
                </p>
              </div>

            </div>

            <div
              className={`statusBadge ${
                isActive
                  ? 'statusActive'
                  : 'statusInactive'
              }`}
            >
              <span className="statusDot" />

              {isActive
                ? 'Active'
                : 'Inactive'}
            </div>

          </section>

          {/* =================================================
              ERROR
          ================================================= */}

          {saveError && (
            <div className="feedback errorFeedback">
              <div className="feedbackIcon">
                <FiAlertCircle />
              </div>

              <div>
                <strong>
                  Unable to save changes
                </strong>

                <p>{saveError}</p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSaveError('')
                }
              >
                <FiX />
              </button>
            </div>
          )}

          {/* =================================================
              SUCCESS
          ================================================= */}

          {saveSuccess && (
            <div className="feedback successFeedback">
              <div className="feedbackIcon">
                <FiCheck />
              </div>

              <div>
                <strong>
                  Employee updated
                </strong>

                <p>
                  Changes saved successfully.
                </p>
              </div>
            </div>
          )}

          {/* =================================================
              FORM
          ================================================= */}

          <div className="formGrid">

            {/* =================================================
                ORGANIZATION
            ================================================= */}

            <section className="formSection">

              <div className="sectionHeader">
                <div className="sectionHeaderIcon">
                  <FiBriefcase />
                </div>

                <div>
                  <h2>Organization</h2>

                  <p>
                    Define the employee's
                    position in the organization
                  </p>
                </div>
              </div>

              <div className="fields">

                {/* Employee ID */}

                <div className="field">
                  <FieldLabel
                    label="Employee ID"
                    required
                  />

                  <div className="inputWrapper disabledInput">
                    <FiUser />

                    <input
                      value={employeeId}
                      disabled
                    />

                    <span className="lockedLabel">
                      Locked
                    </span>
                  </div>

                  {errors.employeeId && (
                    <p className="fieldError">
                      {errors.employeeId}
                    </p>
                  )}
                </div>

                {/* Role */}

                <div className="field">
                  <FieldLabel
                    label="Role"
                    required
                  />

                  <button
                    type="button"
                    className={`selectField ${
                      errors.roleId
                        ? 'fieldInvalid'
                        : ''
                    }`}
                    onClick={() =>
                      setRoleModalOpen(true)
                    }
                  >
                    <div className="selectFieldLeft">
                      <div className="fieldIcon blueIcon">
                        <FiShield />
                      </div>

                      <div>
                        <span
                          className={
                            roleId
                              ? 'selectedValue'
                              : 'placeholderValue'
                          }
                        >
                          {selectedRole
                            ?.role_name ||
                            'Select a role'}
                        </span>

                        {selectedRole && (
                          <small>
                            Assigned role
                          </small>
                        )}
                      </div>
                    </div>

                    <FiChevronDown />
                  </button>

                  {errors.roleId && (
                    <p className="fieldError">
                      {errors.roleId}
                    </p>
                  )}
                </div>

                {/* Position */}

                <div className="field">
                  <FieldLabel
                    label="Position"
                    required
                  />

                  <button
                    type="button"
                    className={`selectField ${
                      errors.positionId
                        ? 'fieldInvalid'
                        : ''
                    }`}
                    onClick={() =>
                      setPositionModalOpen(true)
                    }
                  >
                    <div className="selectFieldLeft">
                      <div className="fieldIcon purpleIcon">
                        <FiBriefcase />
                      </div>

                      <div>
                        <span
                          className={
                            positionId
                              ? 'selectedValue'
                              : 'placeholderValue'
                          }
                        >
                          {selectedPosition
                            ?.title ||
                            'Select a position'}
                        </span>

                        {selectedPosition && (
                          <small>
                            Assigned position
                          </small>
                        )}
                      </div>
                    </div>

                    <FiChevronDown />
                  </button>

                  {errors.positionId && (
                    <p className="fieldError">
                      {errors.positionId}
                    </p>
                  )}
                </div>

              </div>
            </section>

            {/* =================================================
                REPORTING
            ================================================= */}

            <section className="formSection">

              <div className="sectionHeader">
                <div className="sectionHeaderIcon greenSectionIcon">
                  <FiUsers />
                </div>

                <div>
                  <h2>Reporting</h2>

                  <p>
                    Configure reporting and
                    employee status
                  </p>
                </div>
              </div>

              <div className="fields">

                {/* Reports To */}

                <div className="field">
                  <FieldLabel label="Reports To" />

                  <button
                    type="button"
                    className="selectField"
                    onClick={() =>
                      setReportsToModalOpen(true)
                    }
                  >
                    <div className="selectFieldLeft">

                      {selectedManager ? (
                        <UserAvatar
                          userId={
                            selectedManager.user_id
                          }
                          username={
                            selectedManager.username
                          }
                          fullName={
                            selectedManager.full_name
                          }
                          size={38}
                        />
                      ) : (
                        <div className="fieldIcon greenIcon">
                          <FiUsers />
                        </div>
                      )}

                      <div>
                        <span
                          className={
                            selectedManager
                              ? 'selectedValue'
                              : 'placeholderValue'
                          }
                        >
                          {selectedManager
                            ? selectedManager.full_name ||
                              selectedManager.username ||
                              selectedManager.user_id
                            : 'No manager assigned'}
                        </span>

                        {selectedManager?.username && (
                          <small>
                            @{selectedManager.username}
                          </small>
                        )}
                      </div>

                    </div>

                    <FiChevronDown />
                  </button>
                </div>

                {/* Status */}

                <div className="statusField">

                  <div className="statusFieldInfo">

                    <div className="statusFieldIcon">
                      <FiCheck />
                    </div>

                    <div>
                      <strong>
                        Employee Status
                      </strong>

                      <span>
                        Control whether this
                        employee is active
                      </span>
                    </div>

                  </div>

                  <div className="statusControl">

                    <span
                      className={
                        isActive
                          ? 'activeText'
                          : 'inactiveText'
                      }
                    >
                      {isActive
                        ? 'Active'
                        : 'Inactive'}
                    </span>

                    <Switch
                      value={isActive}
                      onChange={setIsActive}
                    />

                  </div>

                </div>

                {/* Info card */}

                <div className="infoCard">

                  <div className="infoCardIcon">
                    <FiMapPin />
                  </div>

                  <div>
                    <strong>
                      Reporting structure
                    </strong>

                    <p>
                      The selected manager will
                      appear as this employee's
                      direct reporting manager.
                    </p>
                  </div>

                </div>

              </div>
            </section>

          </div>

        </main>

        {/* =================================================
            SAVE BAR
        ================================================= */}

        <div className="saveBar">

          <div className="saveBarInner">

            <div className="saveInfo">
              <span className="saveIndicator" />

              <div>
                <strong>
                  Employee details
                </strong>

                <span>
                  Review your changes before
                  saving
                </span>
              </div>
            </div>

            <div className="saveActions">

              <button
                type="button"
                className="cancelButton"
                onClick={() => router.back()}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="saveButton"
                onClick={handleUpdate}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="buttonSpinner" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave />
                    Save Changes
                    <FiArrowRight />
                  </>
                )}
              </button>

            </div>

          </div>
        </div>

        {/* =================================================
            ROLE MODAL
        ================================================= */}

        <SelectModal
          isOpen={roleModalOpen}
          onClose={() => {
            setRoleModalOpen(false);
            setRoleSearch('');
          }}
          title="Select Role"
          subtitle={`${roles.length} roles available`}
          icon={<FiShield />}
        >
          <SearchInput
            value={roleSearch}
            onChange={setRoleSearch}
            placeholder="Search roles..."
          />

          <div className="modalList">

            {filteredRoles.length === 0 ? (
              <div className="modalEmpty">
                <FiShield />

                <strong>
                  No roles found
                </strong>

                <span>
                  Try a different search.
                </span>
              </div>
            ) : (
              filteredRoles.map((role) => {
                const selected =
                  roleId === role.role_id;

                return (
                  <button
                    type="button"
                    key={role.role_id}
                    className={`optionItem ${
                      selected
                        ? 'optionSelected'
                        : ''
                    }`}
                    onClick={() => {
                      setRoleId(
                        role.role_id
                      );

                      setErrors((prev) => ({
                        ...prev,
                        roleId: '',
                      }));

                      setRoleModalOpen(false);
                      setRoleSearch('');
                    }}
                  >
                    <div className="optionIcon blueOption">
                      <FiShield />
                    </div>

                    <div className="optionContent">
                      <strong>
                        {role.role_name}
                      </strong>

                      <span>
                        Role
                      </span>
                    </div>

                    {selected && (
                      <div className="selectedCheck">
                        <FiCheck />
                      </div>
                    )}
                  </button>
                );
              })
            )}

          </div>
        </SelectModal>

        {/* =================================================
            POSITION MODAL
        ================================================= */}

        <SelectModal
          isOpen={positionModalOpen}
          onClose={() => {
            setPositionModalOpen(false);
            setPositionSearch('');
          }}
          title="Select Position"
          subtitle={`${positions.length} positions available`}
          icon={<FiBriefcase />}
        >
          <SearchInput
            value={positionSearch}
            onChange={setPositionSearch}
            placeholder="Search positions..."
          />

          <div className="modalList">

            {filteredPositions.length === 0 ? (
              <div className="modalEmpty">
                <FiBriefcase />

                <strong>
                  No positions found
                </strong>

                <span>
                  Try a different search.
                </span>
              </div>
            ) : (
              filteredPositions.map(
                (position) => {
                  const selected =
                    positionId ===
                    position.position_id;

                  return (
                    <button
                      type="button"
                      key={
                        position.position_id
                      }
                      className={`optionItem ${
                        selected
                          ? 'optionSelected'
                          : ''
                      }`}
                      onClick={() => {
                        setPositionId(
                          position.position_id
                        );

                        setErrors((prev) => ({
                          ...prev,
                          positionId: '',
                        }));

                        setPositionModalOpen(false);
                        setPositionSearch('');
                      }}
                    >
                      <div className="optionIcon purpleOption">
                        <FiBriefcase />
                      </div>

                      <div className="optionContent">
                        <strong>
                          {position.title}
                        </strong>

                        <span>
                          Position
                        </span>
                      </div>

                      {selected && (
                        <div className="selectedCheck">
                          <FiCheck />
                        </div>
                      )}
                    </button>
                  );
                }
              )
            )}

          </div>
        </SelectModal>

        {/* =================================================
            REPORTS TO MODAL
        ================================================= */}

        <SelectModal
          isOpen={reportsToModalOpen}
          onClose={() => {
            setReportsToModalOpen(false);
            clearReportsToSearch();
          }}
          title="Select Manager"
          subtitle="Choose the employee this person reports to"
          icon={<FiUsers />}
        >
          <div className="managerSearchRow">

            <SearchInput
              value={reportsToSearch}
              onChange={setReportsToSearch}
              placeholder="Search by username..."
              onSearch={handleReportsToSearch}
            />

            <button
              type="button"
              className="modalSearchButton"
              onClick={
                handleReportsToSearch
              }
            >
              <FiSearch />
              Search
            </button>

          </div>

          {reportsTo && (
            <button
              type="button"
              className="clearManagerButton"
              onClick={() => {
                setReportsTo(null);
                setReportsToModalOpen(false);
                clearReportsToSearch();
              }}
            >
              <FiX />
              Remove current manager
            </button>
          )}

          <div className="modalList">

            {reportsToLoading ? (
              <div className="modalLoading">
                <div className="smallSpinner" />
                <span>
                  Searching employees...
                </span>
              </div>
            ) : reportsToResults.length === 0 ? (
              <div className="modalEmpty">
                <FiUsers />

                <strong>
                  {reportsToSearch
                    ? 'No employee found'
                    : 'No employees available'}
                </strong>

                <span>
                  {reportsToSearch
                    ? 'Try another username.'
                    : 'There are no available employees.'}
                </span>
              </div>
            ) : (
              reportsToResults.map(
                (employee) => {
                  const selected =
                    reportsTo ===
                    employee.user_id;

                  return (
                    <button
                      type="button"
                      key={
                        employee.user_id
                      }
                      className={`managerOption ${
                        selected
                          ? 'optionSelected'
                          : ''
                      }`}
                      onClick={() => {
                        setReportsTo(
                          employee.user_id
                        );

                        setReportsToModalOpen(
                          false
                        );

                        clearReportsToSearch();
                      }}
                    >

                      <UserAvatar
                        userId={
                          employee.user_id
                        }
                        username={
                          employee.username
                        }
                        fullName={
                          employee.full_name
                        }
                        size={44}
                      />

                      <div className="managerInfo">
                        <strong>
                          {employee.full_name ||
                            employee.username ||
                            employee.user_id}
                        </strong>

                        {employee.username && (
                          <span>
                            @{employee.username}
                          </span>
                        )}

                        <small>
                          Employee ID:{' '}
                          {employee.employee_id ||
                            'N/A'}
                        </small>
                      </div>

                      {selected && (
                        <div className="selectedCheck">
                          <FiCheck />
                        </div>
                      )}

                    </button>
                  );
                }
              )
            )}

          </div>
        </SelectModal>

      </div>

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

  .employeePage {
    min-height: 100vh;

    background:
      radial-gradient(
        circle at 0% 0%,
        rgba(37, 99, 235, 0.045),
        transparent 28%
      ),
      radial-gradient(
        circle at 100% 10%,
        rgba(123, 47, 190, 0.04),
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

  /* =======================================================
     HEADER
  ======================================================= */

  .pageHeader {
    background: rgba(255,255,255,0.95);

    border-bottom: 1px solid #e6eaf0;

    box-shadow:
      0 2px 10px rgba(15,23,42,0.035);
  }

  .headerInner {
    width: min(1180px, calc(100% - 48px));

    min-height: 92px;

    margin: 0 auto;

    display: flex;
    align-items: center;

    gap: 15px;
  }

  .backButton {
    all: unset;

    width: 40px;
    height: 40px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border: 1px solid #e1e6ee;
    border-radius: 10px;

    background: #fff;
    color: #64748b;

    cursor: pointer;

    transition:
      color 0.18s ease,
      background 0.18s ease,
      border-color 0.18s ease,
      transform 0.18s ease;
  }

  .backButton:hover {
    color: #2563eb;
    background: #eff6ff;
    border-color: #bfdbfe;

    transform: translateX(-2px);
  }

  .backButton svg {
    width: 18px;
    height: 18px;
  }

  .headerIcon {
    width: 50px;
    height: 50px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 13px;

    background: #eff6ff;
    color: #2563eb;
  }

  .headerIcon svg {
    width: 23px;
    height: 23px;
  }

  .headerTitle {
    min-width: 0;
  }

  .breadcrumb {
    display: flex;
    align-items: center;

    gap: 5px;

    margin-bottom: 4px;

    color: #94a3b8;

    font-size: 10px;
    font-weight: 650;
  }

  .breadcrumb svg {
    width: 12px;
    height: 12px;
  }

  .headerTitle h1 {
    margin: 0;

    color: #172033;

    font-size: 24px;
    line-height: 1.2;

    font-weight: 750;

    letter-spacing: -0.4px;
  }

  .headerTitle p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 11px;
    font-weight: 500;
  }

  /* =======================================================
     CONTENT
  ======================================================= */

  .pageContent {
    width: min(1180px, calc(100% - 48px));

    margin: 0 auto;

    padding: 30px 0 50px;
  }

  /* =======================================================
     EMPLOYEE SUMMARY
  ======================================================= */

  .employeeSummary {
    min-height: 100px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;

    padding: 18px 22px;

    border: 1px solid #e5eaf1;
    border-radius: 16px;

    background: #ffffff;

    box-shadow:
      0 3px 10px rgba(15,23,42,0.025);
  }

  .employeeSummaryLeft {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .largeAvatar {
    width: 58px;
    height: 58px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 15px;

    background:
      linear-gradient(
        135deg,
        #eff6ff,
        #f1eafe
      );

    color: #64748b;
  }

  .largeAvatar svg {
    width: 25px;
    height: 25px;
  }

  .employeeIdentity {
    display: flex;
    flex-direction: column;
  }

  .identityLabel {
    color: #94a3b8;

    font-size: 9px;
    line-height: 1;

    font-weight: 750;

    letter-spacing: 1px;
  }

  .employeeIdentity h2 {
    margin: 5px 0 0;

    color: #1e293b;

    font-size: 18px;
    line-height: 1.2;

    font-weight: 700;
  }

  .employeeIdentity p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 11px;
    font-weight: 500;
  }

  .identityDot {
    padding: 0 7px;
    color: #cbd5e1;
  }

  .statusBadge {
    padding: 7px 11px;

    display: flex;
    align-items: center;
    gap: 6px;

    border-radius: 8px;

    font-size: 10px;
    font-weight: 700;
  }

  .statusActive {
    background: #ecfdf5;
    color: #059669;
  }

  .statusInactive {
    background: #fef2f2;
    color: #dc2626;
  }

  .statusDot {
    width: 6px;
    height: 6px;

    border-radius: 50%;

    background: currentColor;
  }

  /* =======================================================
     FEEDBACK
  ======================================================= */

  .feedback {
    margin-top: 16px;

    padding: 13px 15px;

    display: flex;
    align-items: center;

    gap: 11px;

    border-radius: 12px;
  }

  .feedbackIcon {
    width: 34px;
    height: 34px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;
  }

  .feedbackIcon svg {
    width: 17px;
    height: 17px;
  }

  .feedback strong {
    display: block;

    font-size: 12px;
    font-weight: 700;
  }

  .feedback p {
    margin: 3px 0 0;

    font-size: 11px;
    line-height: 1.4;
  }

  .feedback button {
    all: unset;

    margin-left: auto;

    width: 30px;
    height: 30px;

    display: flex;
    align-items: center;
    justify-content: center;

    cursor: pointer;
  }

  .feedback button svg {
    width: 16px;
    height: 16px;
  }

  .errorFeedback {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
  }

  .errorFeedback .feedbackIcon {
    background: #fee2e2;
    color: #dc2626;
  }

  .successFeedback {
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    color: #065f46;
  }

  .successFeedback .feedbackIcon {
    background: #d1fae5;
    color: #059669;
  }

  /* =======================================================
     FORM GRID
  ======================================================= */

  .formGrid {
    margin-top: 18px;

    display: grid;

    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );

    gap: 18px;

    align-items: start;
  }

  .formSection {
    min-width: 0;

    padding: 22px;

    border: 1px solid #e5eaf1;
    border-radius: 16px;

    background: #ffffff;

    box-shadow:
      0 3px 10px rgba(15,23,42,0.025);
  }

  /* =======================================================
     SECTION HEADER
  ======================================================= */

  .sectionHeader {
    display: flex;
    align-items: flex-start;

    gap: 11px;

    padding-bottom: 18px;

    border-bottom: 1px solid #eef1f5;
  }

  .sectionHeaderIcon {
    width: 38px;
    height: 38px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;

    background: #eff6ff;
    color: #2563eb;
  }

  .sectionHeaderIcon svg {
    width: 18px;
    height: 18px;
  }

  .greenSectionIcon {
    background: #ecfdf5;
    color: #059669;
  }

  .sectionHeader h2 {
    margin: 0;

    color: #1e293b;

    font-size: 15px;
    line-height: 1.3;

    font-weight: 700;
  }

  .sectionHeader p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 10px;
    line-height: 1.4;

    font-weight: 500;
  }

  /* =======================================================
     FIELDS
  ======================================================= */

  .fields {
    padding-top: 20px;

    display: flex;
    flex-direction: column;

    gap: 18px;
  }

  .field {
    min-width: 0;
  }

  .fieldLabel {
    display: block;

    margin-bottom: 7px;

    color: #475569;

    font-size: 11px;
    line-height: 1.3;

    font-weight: 650;
  }

  .required {
    margin-left: 3px;
    color: #ef4444;
  }

  .inputWrapper {
    height: 52px;

    display: flex;
    align-items: center;

    gap: 10px;

    padding: 0 13px;

    border: 1px solid #e1e6ee;
    border-radius: 10px;

    background: #f8fafc;

    color: #94a3b8;
  }

  .inputWrapper > svg {
    width: 17px;
    height: 17px;
  }

  .inputWrapper input {
    min-width: 0;
    flex: 1;

    border: 0;
    outline: 0;

    background: transparent;

    color: #64748b;

    font-size: 13px;
    font-weight: 550;
  }

  .lockedLabel {
    padding: 4px 7px;

    border-radius: 6px;

    background: #e2e8f0;

    color: #64748b;

    font-size: 9px;
    font-weight: 650;
  }

  /* =======================================================
     SELECT FIELD
  ======================================================= */

  .selectField {
    all: unset;

    width: 100%;
    min-height: 52px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 12px;

    padding: 6px 11px;

    border: 1px solid #e1e6ee;
    border-radius: 10px;

    background: #ffffff;

    cursor: pointer;

    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease,
      background 0.18s ease;
  }

  .selectField:hover {
    border-color: #cbd5e1;
    background: #fcfdff;
  }

  .selectField:focus-visible {
    border-color: #2563eb;

    box-shadow:
      0 0 0 3px rgba(37,99,235,0.09);
  }

  .fieldInvalid {
    border-color: #ef4444;
  }

  .selectField > svg {
    flex-shrink: 0;

    width: 17px;
    height: 17px;

    color: #94a3b8;
  }

  .selectFieldLeft {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 10px;
  }

  .fieldIcon {
    width: 36px;
    height: 36px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;
  }

  .fieldIcon svg {
    width: 16px;
    height: 16px;
  }

  .blueIcon {
    background: #eff6ff;
    color: #2563eb;
  }

  .purpleIcon {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .greenIcon {
    background: #ecfdf5;
    color: #059669;
  }

  .selectFieldLeft > div:last-child {
    min-width: 0;

    display: flex;
    flex-direction: column;

    text-align: left;
  }

  .selectedValue,
  .placeholderValue {
    overflow: hidden;

    font-size: 12px;
    line-height: 1.3;

    font-weight: 600;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .selectedValue {
    color: #1e293b;
  }

  .placeholderValue {
    color: #94a3b8;
  }

  .selectField small {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 9px;
    font-weight: 500;
  }

  .fieldError {
    margin: 5px 0 0;

    color: #dc2626;

    font-size: 10px;
    font-weight: 550;
  }

  /* =======================================================
     STATUS
  ======================================================= */

  .statusField {
    min-height: 72px;

    padding: 13px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 15px;

    border: 1px solid #e5eaf1;
    border-radius: 11px;

    background: #f8fafc;
  }

  .statusFieldInfo {
    display: flex;
    align-items: center;

    gap: 10px;
  }

  .statusFieldIcon {
    width: 38px;
    height: 38px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;

    background: #ecfdf5;
    color: #059669;
  }

  .statusFieldIcon svg {
    width: 17px;
    height: 17px;
  }

  .statusFieldInfo > div:last-child {
    display: flex;
    flex-direction: column;
  }

  .statusFieldInfo strong {
    color: #334155;

    font-size: 11px;
    font-weight: 650;
  }

  .statusFieldInfo span {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 9px;
    line-height: 1.35;
  }

  .statusControl {
    display: flex;
    align-items: center;

    gap: 8px;
  }

  .activeText,
  .inactiveText {
    font-size: 10px;
    font-weight: 700;
  }

  .activeText {
    color: #059669;
  }

  .inactiveText {
    color: #94a3b8;
  }

  /* =======================================================
     SWITCH
  ======================================================= */

  .switch {
    all: unset;

    position: relative;

    width: 42px;
    height: 23px;

    flex-shrink: 0;

    border-radius: 999px;

    background: #cbd5e1;

    cursor: pointer;

    transition:
      background 0.2s ease;
  }

  .switchActive {
    background: #10b981;
  }

  .switchThumb {
    position: absolute;

    top: 3px;
    left: 3px;

    width: 17px;
    height: 17px;

    border-radius: 50%;

    background: #ffffff;

    box-shadow:
      0 1px 3px rgba(0,0,0,0.18);

    transition:
      transform 0.2s ease;
  }

  .switchActive .switchThumb {
    transform: translateX(19px);
  }

  /* =======================================================
     INFO CARD
  ======================================================= */

  .infoCard {
    padding: 13px;

    display: flex;
    align-items: flex-start;

    gap: 10px;

    border: 1px solid #dbeafe;
    border-radius: 11px;

    background: #f8fbff;
  }

  .infoCardIcon {
    width: 32px;
    height: 32px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    background: #eff6ff;
    color: #2563eb;
  }

  .infoCardIcon svg {
    width: 15px;
    height: 15px;
  }

  .infoCard strong {
    display: block;

    color: #334155;

    font-size: 10px;
    font-weight: 700;
  }

  .infoCard p {
    margin: 3px 0 0;

    color: #64748b;

    font-size: 9px;
    line-height: 1.45;
  }

  /* =======================================================
     SAVE BAR
  ======================================================= */

  .saveBar {
    position: fixed;

    right: 0;
    bottom: 0;
    left: 0;

    z-index: 40;

    padding: 11px 0;

    border-top: 1px solid #e5eaf1;

    background: rgba(255,255,255,0.96);

    box-shadow:
      0 -5px 20px rgba(15,23,42,0.045);

    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .saveBarInner {
    width: min(1180px, calc(100% - 48px));

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

  .saveIndicator {
    width: 7px;
    height: 7px;

    border-radius: 50%;

    background: #f59e0b;

    box-shadow:
      0 0 0 4px rgba(245,158,11,0.1);
  }

  .saveInfo div {
    display: flex;
    flex-direction: column;
  }

  .saveInfo strong {
    color: #334155;

    font-size: 10px;
    font-weight: 700;
  }

  .saveInfo span {
    margin-top: 2px;

    color: #94a3b8;

    font-size: 9px;
  }

  .saveActions {
    display: flex;
    align-items: center;

    gap: 9px;
  }

  .cancelButton,
  .saveButton {
    height: 38px;

    padding: 0 15px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 7px;

    border-radius: 9px;

    cursor: pointer;

    font-size: 11px;
    font-weight: 650;

    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      opacity 0.18s ease;
  }

  .cancelButton {
    border: 1px solid #e2e8f0;

    background: #ffffff;

    color: #64748b;
  }

  .saveButton {
    border: 0;

    background:
      linear-gradient(
        135deg,
        #2563eb,
        #1d4ed8
      );

    color: #ffffff;

    box-shadow:
      0 5px 14px rgba(37,99,235,0.2);
  }

  .cancelButton:hover:not(:disabled),
  .saveButton:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .saveButton svg {
    width: 14px;
    height: 14px;
  }

  .saveButton svg:last-child {
    opacity: 0.7;
  }

  .cancelButton:disabled,
  .saveButton:disabled {
    cursor: not-allowed;
    opacity: 0.55;
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
     MODAL
  ======================================================= */

  .modalOverlay {
    position: fixed;

    inset: 0;

    z-index: 100;

    padding: 25px;

    display: flex;
    align-items: center;
    justify-content: center;

    background: rgba(15,23,42,0.42);

    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
  }

  .selectModal {
    width: min(520px, 100%);

    max-height: min(680px, calc(100vh - 50px));

    display: flex;
    flex-direction: column;

    overflow: hidden;

    border: 1px solid rgba(255,255,255,0.6);
    border-radius: 17px;

    background: #ffffff;

    box-shadow:
      0 25px 70px rgba(15,23,42,0.2);
  }

  .modalHeader {
    padding: 17px 18px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    border-bottom: 1px solid #edf0f4;
  }

  .modalTitleGroup {
    display: flex;
    align-items: center;

    gap: 10px;
  }

  .modalIcon {
    width: 38px;
    height: 38px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;

    background: #eff6ff;
    color: #2563eb;
  }

  .modalIcon svg {
    width: 17px;
    height: 17px;
  }

  .modalTitleGroup h3 {
    margin: 0;

    color: #1e293b;

    font-size: 15px;
    font-weight: 700;
  }

  .modalTitleGroup p {
    margin: 3px 0 0;

    color: #94a3b8;

    font-size: 9px;
    font-weight: 500;
  }

  .modalClose {
    all: unset;

    width: 33px;
    height: 33px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    color: #94a3b8;

    cursor: pointer;

    transition:
      color 0.18s ease,
      background 0.18s ease;
  }

  .modalClose:hover {
    color: #ef4444;
    background: #fef2f2;
  }

  .modalClose svg {
    width: 17px;
    height: 17px;
  }

  .modalBody {
    min-height: 0;

    overflow-y: auto;

    padding: 14px;
  }

  /* =======================================================
     SEARCH
  ======================================================= */

  .searchBox {
    height: 43px;

    display: flex;
    align-items: center;

    gap: 8px;

    padding: 0 11px;

    border: 1px solid #e1e6ee;
    border-radius: 9px;

    background: #f8fafc;

    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease;
  }

  .searchBox:focus-within {
    border-color: #93c5fd;

    background: #ffffff;

    box-shadow:
      0 0 0 3px rgba(37,99,235,0.07);
  }

  .searchIcon {
    width: 16px;
    height: 16px;

    flex-shrink: 0;

    color: #94a3b8;
  }

  .searchBox input {
    min-width: 0;
    flex: 1;

    border: 0;
    outline: 0;

    background: transparent;

    color: #334155;

    font-size: 11px;
  }

  .searchBox input::placeholder {
    color: #a1acba;
  }

  .clearSearch {
    all: unset;

    width: 25px;
    height: 25px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 6px;

    color: #94a3b8;

    cursor: pointer;
  }

  .clearSearch:hover {
    background: #e2e8f0;
    color: #475569;
  }

  .clearSearch svg {
    width: 14px;
    height: 14px;
  }

  /* =======================================================
     MODAL LIST
  ======================================================= */

  .modalList {
    margin-top: 10px;

    display: flex;
    flex-direction: column;

    gap: 3px;
  }

  .optionItem,
  .managerOption {
    all: unset;

    width: 100%;

    min-height: 59px;

    display: flex;
    align-items: center;

    gap: 10px;

    padding: 8px 10px;

    border: 1px solid transparent;
    border-radius: 10px;

    cursor: pointer;

    transition:
      background 0.15s ease,
      border-color 0.15s ease;
  }

  .optionItem:hover,
  .managerOption:hover {
    background: #f8fafc;
  }

  .optionSelected {
    border-color: #dbeafe !important;
    background: #eff6ff !important;
  }

  .optionIcon {
    width: 37px;
    height: 37px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;
  }

  .optionIcon svg {
    width: 16px;
    height: 16px;
  }

  .blueOption {
    background: #eff6ff;
    color: #2563eb;
  }

  .purpleOption {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .optionContent {
    min-width: 0;
    flex: 1;

    display: flex;
    flex-direction: column;
  }

  .optionContent strong {
    overflow: hidden;

    color: #334155;

    font-size: 11px;
    font-weight: 650;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .optionContent span {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 9px;
  }

  .selectedCheck {
    width: 25px;
    height: 25px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 50%;

    background: #2563eb;
    color: #ffffff;
  }

  .selectedCheck svg {
    width: 13px;
    height: 13px;
  }

  /* =======================================================
     MANAGER SEARCH
  ======================================================= */

  .managerSearchRow {
    display: flex;
    align-items: center;

    gap: 7px;
  }

  .managerSearchRow .searchBox {
    flex: 1;
  }

  .modalSearchButton {
    height: 43px;

    padding: 0 12px;

    display: flex;
    align-items: center;

    gap: 6px;

    border: 0;
    border-radius: 9px;

    background: #2563eb;
    color: #ffffff;

    cursor: pointer;

    font-size: 10px;
    font-weight: 650;
  }

  .modalSearchButton svg {
    width: 14px;
    height: 14px;
  }

  .clearManagerButton {
    margin-top: 9px;

    padding: 6px 8px;

    display: flex;
    align-items: center;

    gap: 5px;

    border: 0;
    border-radius: 7px;

    background: #fef2f2;
    color: #dc2626;

    cursor: pointer;

    font-size: 9px;
    font-weight: 650;
  }

  .clearManagerButton svg {
    width: 12px;
    height: 12px;
  }

  /* =======================================================
     MANAGER OPTION
  ======================================================= */

  .managerOption {
    padding: 9px 10px;
  }

  .managerInfo {
    min-width: 0;
    flex: 1;

    display: flex;
    flex-direction: column;
  }

  .managerInfo strong {
    overflow: hidden;

    color: #334155;

    font-size: 11px;
    font-weight: 650;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .managerInfo span {
    margin-top: 2px;

    color: #64748b;

    font-size: 9px;
  }

  .managerInfo small {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 8px;
  }

  /* =======================================================
     EMPTY / LOADING MODAL
  ======================================================= */

  .modalEmpty {
    min-height: 180px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    text-align: center;
  }

  .modalEmpty > svg {
    width: 27px;
    height: 27px;

    margin-bottom: 11px;

    color: #cbd5e1;
  }

  .modalEmpty strong {
    color: #475569;

    font-size: 12px;
    font-weight: 650;
  }

  .modalEmpty span {
    margin-top: 4px;

    color: #94a3b8;

    font-size: 9px;
  }

  .modalLoading {
    min-height: 180px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    gap: 10px;

    color: #94a3b8;

    font-size: 10px;
  }

  .smallSpinner {
    width: 25px;
    height: 25px;

    border: 2px solid #e2e8f0;
    border-top-color: #2563eb;

    border-radius: 50%;

    animation: spin 0.7s linear infinite;
  }

  /* =======================================================
     LOADING
  ======================================================= */

  .loadingPage {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loadingCard {
    width: min(360px, calc(100% - 40px));

    padding: 36px 28px;

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

  .loadingSpinner {
    width: 39px;
    height: 39px;

    border: 3px solid #e8edf3;
    border-top-color: #2563eb;

    border-radius: 50%;

    animation: spin 0.8s linear infinite;
  }

  .loadingCard h2 {
    margin: 18px 0 0;

    color: #1e293b;

    font-size: 17px;
    font-weight: 700;
  }

  .loadingCard p {
    margin: 6px 0 0;

    color: #94a3b8;

    font-size: 11px;
  }

  /* =======================================================
     RESPONSIVE
  ======================================================= */

  @media (max-width: 850px) {
    .formGrid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 600px) {
    .headerInner,
    .pageContent,
    .saveBarInner {
      width: calc(100% - 28px);
    }

    .pageContent {
      padding-top: 20px;
    }

    .headerInner {
      min-height: 78px;
    }

    .headerIcon {
      width: 43px;
      height: 43px;
    }

    .headerTitle h1 {
      font-size: 20px;
    }

    .headerTitle p {
      display: none;
    }

    .breadcrumb {
      display: none;
    }

    .employeeSummary {
      padding: 15px;
    }

    .largeAvatar {
      width: 48px;
      height: 48px;
    }

    .employeeIdentity h2 {
      font-size: 15px;
    }

    .statusBadge {
      padding: 6px 8px;
    }

    .formSection {
      padding: 17px;
    }

    .saveBarInner {
      align-items: center;
    }

    .saveInfo {
      display: none;
    }

    .saveActions {
      width: 100%;
    }

    .cancelButton {
      flex: 1;
    }

    .saveButton {
      flex: 2;
    }

    .modalOverlay {
      padding: 12px;
    }

    .selectModal {
      max-height: calc(100vh - 24px);
      border-radius: 15px;
    }
  }

  @media (max-width: 420px) {
    .employeeSummary {
      align-items: flex-start;
    }

    .statusBadge {
      font-size: 9px;
    }

    .statusField {
      align-items: flex-start;
      flex-direction: column;
    }

    .statusControl {
      width: 100%;
      justify-content: space-between;
    }

    .managerSearchRow {
      align-items: stretch;
      flex-direction: column;
    }

    .modalSearchButton {
      justify-content: center;
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }
`;