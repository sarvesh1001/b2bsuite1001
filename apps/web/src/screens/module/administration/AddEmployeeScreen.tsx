import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  FiArrowLeft,
  FiArrowRight,
  FiBriefcase,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiEdit3,
  FiHash,
  FiPhone,
  FiSearch,
  FiShield,
  FiUser,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi';

import {
  addEmployee,
  addManager,
  listRoles,
  listPositions,
  getEmployeeSuggestions,
} from '@b2b/api-client';

import { useUserAuthStore } from '../../../store/userAuthStore';
import {
  Role,
  Position,
  CompanyEmployee,
} from '@b2b/shared-types';

import { UserAvatar } from '../../../components/UserAvatar';

// =========================================================
// FORM SCHEMA
// =========================================================

const schema = z.object({
  phone: z
    .string()
    .min(10, 'Phone must be at least 10 digits'),

  username: z.string().optional(),

  full_name: z.string().optional(),

  employee_id: z.string().optional(),

  role_id: z
    .string()
    .min(1, 'Role is required'),

  reports_to: z.string().optional(),

  position_id: z.string().optional(),

  is_manager: z.boolean(),
});

type FormData = z.infer<typeof schema>;

// =========================================================
// FIELD
// =========================================================

interface FieldProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  icon?: React.ReactNode;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({
  label,
  required,
  optional,
  icon,
  error,
  hint,
  children,
}) => {
  return (
    <div className="field">
      <div className="fieldLabelRow">
        <label className="fieldLabel">
          {icon && (
            <span className="fieldLabelIcon">
              {icon}
            </span>
          )}

          {label}

          {required && (
            <span className="requiredMark">*</span>
          )}

          {optional && (
            <span className="optionalText">
              Optional
            </span>
          )}
        </label>
      </div>

      {children}

      {error ? (
        <p className="fieldError">{error}</p>
      ) : hint ? (
        <p className="fieldHint">{hint}</p>
      ) : null}
    </div>
  );
};

// =========================================================
// TEXT INPUT
// =========================================================

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  type?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  optional?: boolean;
  hint?: string;
}

const TextInput: React.FC<TextInputProps> = ({
  label,
  value,
  onChange,
  onBlur,
  error,
  type = 'text',
  placeholder,
  icon,
  optional,
  hint,
}) => {
  return (
    <Field
      label={label}
      optional={optional}
      error={error}
      hint={hint}
      icon={icon}
    >
      <div
        className={`inputWrapper ${
          error ? 'inputError' : ''
        }`}
      >
        <input
          type={type}
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>
    </Field>
  );
};

// =========================================================
// SWITCH
// =========================================================

const Switch: React.FC<{
  value: boolean;
  onChange: (value: boolean) => void;
}> = ({ value, onChange }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      className={`switch ${value ? 'switchOn' : ''}`}
      onClick={() => onChange(!value)}
    >
      <span className="switchKnob" />
    </button>
  );
};

// =========================================================
// SELECT FIELD
// =========================================================

interface SelectFieldProps {
  label: string;
  value?: string;
  placeholder: string;
  displayText?: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  placeholder,
  displayText,
  required,
  optional,
  error,
  icon,
  onClick,
}) => {
  return (
    <Field
      label={label}
      required={required}
      optional={optional}
      error={error}
      icon={icon}
    >
      <button
        type="button"
        className={`selectField ${
          error ? 'inputError' : ''
        }`}
        onClick={onClick}
      >
        <span
          className={
            value
              ? 'selectValue'
              : 'selectPlaceholder'
          }
        >
          {displayText || placeholder}
        </span>

        <span className="selectArrow">
          <FiChevronDown />
        </span>
      </button>
    </Field>
  );
};

// =========================================================
// MODAL
// =========================================================

interface SelectModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const SelectModal: React.FC<SelectModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  icon,
}) => {
  if (!visible) return null;

  return (
    <div
      className="modalOverlay"
      onClick={onClose}
    >
      <div
        className="selectModal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <div className="modalHeader">
          <div className="modalTitleArea">
            <div className="modalIcon">
              {icon || <FiBriefcase />}
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
// REPORTS TO MODAL
// =========================================================

interface ReportsToModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (user: CompanyEmployee) => void;
  accessToken: string;
  companyId: string;
  deviceId: string;
}

const ReportsToModal: React.FC<
  ReportsToModalProps
> = ({
  visible,
  onClose,
  onSelect,
  accessToken,
  companyId,
  deviceId,
}) => {
  const [search, setSearch] =
    useState('');

  const [suggestions, setSuggestions] =
    useState<CompanyEmployee[]>([]);

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    if (!visible) {
      setSearch('');
      setSuggestions([]);
    }
  }, [visible]);

  const handleSearch = async (
    text: string
  ) => {
    setSearch(text);

    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);

    try {
      const res =
        await getEmployeeSuggestions(
          companyId,
          deviceId,
          text.trim(),
          20,
          accessToken
        );

      setSuggestions(res.data || []);
    } catch (error) {
      console.error(
        'Failed to search employees',
        error
      );

      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="modalOverlay"
      onClick={onClose}
    >
      <div
        className="selectModal reportsModal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <div className="modalHeader">
          <div className="modalTitleArea">
            <div className="modalIcon purpleIcon">
              <FiUsers />
            </div>

            <div>
              <h3>
                Select Manager / Supervisor
              </h3>

              <p>
                Search for an employee to
                assign as the reporting manager
              </p>
            </div>
          </div>

          <button
            type="button"
            className="modalClose"
            onClick={onClose}
          >
            <FiX />
          </button>
        </div>

        <div className="modalSearch">
          <FiSearch />

          <input
            type="text"
            value={search}
            onChange={(e) =>
              handleSearch(e.target.value)
            }
            placeholder="Search by name, username or employee ID"
            autoFocus
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                handleSearch('')
              }
            >
              <FiX />
            </button>
          )}
        </div>

        <div className="employeeResults">
          {loading ? (
            <div className="modalLoading">
              <div className="smallSpinner" />
              <span>
                Searching employees...
              </span>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="noResults">
              <div className="noResultsIcon">
                <FiSearch />
              </div>

              <strong>
                {search.length >= 2
                  ? 'No employees found'
                  : 'Search for an employee'}
              </strong>

              <span>
                {search.length >= 2
                  ? 'Try a different name or employee ID.'
                  : 'Enter at least 2 characters to begin searching.'}
              </span>
            </div>
          ) : (
            suggestions.map((employee) => (
              <button
                type="button"
                key={employee.user_id}
                className="employeeResult"
                onClick={() => {
                  onSelect(employee);
                  onClose();
                }}
              >
                <UserAvatar
                  userId={employee.user_id}
                  username={employee.username}
                  fullName={employee.full_name}
                  size={44}
                />

                <div className="employeeResultInfo">
                  <strong>
                    {employee.full_name ||
                      employee.username ||
                      employee.user_id}
                  </strong>

                  {employee.username &&
                    employee.full_name && (
                      <span>
                        @{employee.username}
                      </span>
                    )}

                  <div className="employeeMeta">
                    {employee.employee_id && (
                      <span>
                        ID: {employee.employee_id}
                      </span>
                    )}

                    {employee.role_name && (
                      <span>
                        {employee.role_name}
                      </span>
                    )}
                  </div>
                </div>

                <FiChevronRight className="employeeArrow" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// =========================================================
// MAIN SCREEN
// =========================================================

export default function AddEmployeeScreen() {
  const router = useRouter();

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  const [loading, setLoading] =
    useState(false);

  const [loadingOptions, setLoadingOptions] =
    useState(true);

  const [roles, setRoles] =
    useState<Role[]>([]);

  const [positions, setPositions] =
    useState<Position[]>([]);

  const [roleModalVisible, setRoleModalVisible] =
    useState(false);

  const [
    positionModalVisible,
    setPositionModalVisible,
  ] = useState(false);

  const [
    reportsToModalVisible,
    setReportsToModalVisible,
  ] = useState(false);

  const [
    selectedReportsToName,
    setSelectedReportsToName,
  ] = useState('');

  // =======================================================
  // FORM
  // =======================================================

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),

    defaultValues: {
      phone: '',
      username: '',
      full_name: '',
      employee_id: '',
      role_id: '',
      position_id: '',
      reports_to: '',
      is_manager: false,
    },
  });

  const selectedRoleId =
    watch('role_id');

  const selectedPositionId =
    watch('position_id');

  const isManager =
    watch('is_manager');

  const reportsToId =
    watch('reports_to');

  // =======================================================
  // LOAD OPTIONS
  // =======================================================

  useEffect(() => {
    const fetchOptions = async () => {
      if (
        !accessToken ||
        !companyId ||
        !deviceId
      ) {
        setLoadingOptions(false);
        return;
      }

      try {
        setLoadingOptions(true);

        const [
          rolesRes,
          positionsRes,
        ] = await Promise.all([
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
              limit: 100,
              offset: 0,
            },
            accessToken
          ),
        ]);

        setRoles(
          rolesRes.data?.roles || []
        );

        setPositions(
          positionsRes.data?.positions ||
            []
        );
      } catch (error) {
        console.error(
          'Failed to load options',
          error
        );

        alert(
          'Failed to load roles and positions.'
        );
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [
    accessToken,
    companyId,
    deviceId,
  ]);

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
      alert(
        'Missing authentication information.'
      );
      return;
    }

    const cleanPhone =
      data.phone
        .trim()
        .replace(/\s/g, '');

    setLoading(true);

    try {
      const payload = {
        phone: cleanPhone,
        username:
          data.username?.trim() || undefined,
        full_name:
          data.full_name?.trim() || undefined,
        employee_id:
          data.employee_id?.trim() ||
          undefined,
        role_id: data.role_id,
        reports_to:
          data.reports_to || undefined,
        position_id:
          data.position_id || undefined,
      };

      if (data.is_manager) {
        await addManager(
          companyId,
          deviceId,
          payload,
          accessToken
        );
      } else {
        await addEmployee(
          companyId,
          deviceId,
          payload,
          accessToken
        );
      }

      alert(
        `${data.is_manager ? 'Manager' : 'Employee'} added successfully`
      );

      router.back();
    } catch (error: any) {
      console.error(
        'Failed to add employee',
        error
      );

      alert(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to add employee'
      );
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // HELPERS
  // =======================================================

  const getRoleDisplay = (
    id: string
  ) =>
    roles.find(
      (role) => role.role_id === id
    )?.role_name || '';

  const getPositionDisplay = (
    id: string
  ) =>
    positions.find(
      (position) =>
        position.position_id === id
    )?.title || '';

  // =======================================================
  // LOADING
  // =======================================================

  if (loadingOptions) {
    return (
      <>
        <div className="page loadingPage">
          <div className="loadingCard">
            <div className="largeSpinner" />

            <h2>
              Preparing employee form
            </h2>

            <p>
              Loading roles and positions...
            </p>
          </div>
        </div>

        <style jsx>{styles}</style>
      </>
    );
  }

  // =======================================================
  // SCREEN
  // =======================================================

  return (
    <>
      <div className="page">

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

            <div className="headerTitleArea">

              <div className="breadcrumb">
                <span>Administration</span>
                <FiChevronRight />
                <span>Employees</span>
                <FiChevronRight />
                <strong>
                  Add Employee
                </strong>
              </div>

              <h1>
                Add {isManager
                  ? 'Manager'
                  : 'Employee'}
              </h1>

              <p>
                Create a new employee profile
                and assign their role.
              </p>

            </div>

          </div>

          <div className="headerAccent" />
        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="content">

          <form
            onSubmit={handleSubmit(
              onSubmit
            )}
          >

            {/* =================================================
                MANAGER MODE
            ================================================= */}

            <div
              className={`managerBanner ${
                isManager
                  ? 'managerBannerActive'
                  : ''
              }`}
            >
              <div className="managerBannerLeft">

                <div className="managerBannerIcon">
                  <FiShield />
                </div>

                <div>
                  <strong>
                    Manager account
                  </strong>

                  <p>
                    Enable this if the employee
                    will manage or supervise
                    other employees.
                  </p>
                </div>

              </div>

              <Controller
                control={control}
                name="is_manager"
                render={({
                  field: {
                    onChange,
                    value,
                  },
                }) => (
                  <Switch
                    value={value}
                    onChange={onChange}
                  />
                )}
              />
            </div>

            {/* =================================================
                ACCOUNT INFORMATION
            ================================================= */}

            <section className="formSection">

              <div className="sectionTitle">

                <div className="sectionTitleIcon blueSection">
                  <FiUser />
                </div>

                <div>
                  <h2>
                    Personal Information
                  </h2>

                  <p>
                    Basic information used to
                    identify the employee.
                  </p>
                </div>

              </div>

              <div className="formGrid">

                <Controller
                  control={control}
                  name="phone"
                  render={({
                    field: {
                      onChange,
                      onBlur,
                      value,
                    },
                  }) => (
                    <TextInput
                      label="Phone"
                      value={value}
                      onChange={onChange}
                      onBlur={onBlur}
                      type="tel"
                      placeholder="+91 98765 43210"
                      icon={<FiPhone />}
                      error={
                        errors.phone?.message
                      }
                      hint="Used for account identification and login."
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="full_name"
                  render={({
                    field: {
                      onChange,
                      onBlur,
                      value,
                    },
                  }) => (
                    <TextInput
                      label="Full Name"
                      value={value || ''}
                      onChange={onChange}
                      onBlur={onBlur}
                      placeholder="e.g. Rahul Sharma"
                      icon={<FiUser />}
                      optional
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="username"
                  render={({
                    field: {
                      onChange,
                      onBlur,
                      value,
                    },
                  }) => (
                    <TextInput
                      label="Username"
                      value={value || ''}
                      onChange={onChange}
                      onBlur={onBlur}
                      placeholder="e.g. rahul.sharma"
                      icon={<FiEdit3 />}
                      optional
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="employee_id"
                  render={({
                    field: {
                      onChange,
                      onBlur,
                      value,
                    },
                  }) => (
                    <TextInput
                      label="Employee ID"
                      value={value || ''}
                      onChange={onChange}
                      onBlur={onBlur}
                      placeholder="e.g. EMP-1024"
                      icon={<FiHash />}
                      optional
                      hint="Your company's internal employee identifier."
                    />
                  )}
                />

              </div>

            </section>

            {/* =================================================
                EMPLOYMENT DETAILS
            ================================================= */}

            <section className="formSection">

              <div className="sectionTitle">

                <div className="sectionTitleIcon purpleSection">
                  <FiBriefcase />
                </div>

                <div>
                  <h2>
                    Employment Details
                  </h2>

                  <p>
                    Define the employee's role
                    and organizational position.
                  </p>
                </div>

              </div>

              <div className="formGrid">

                <SelectField
                  label="Role"
                  value={selectedRoleId}
                  placeholder="Select a role"
                  displayText={
                    selectedRoleId
                      ? getRoleDisplay(
                          selectedRoleId
                        )
                      : undefined
                  }
                  required
                  error={
                    errors.role_id?.message
                  }
                  icon={<FiShield />}
                  onClick={() =>
                    setRoleModalVisible(
                      true
                    )
                  }
                />

                <SelectField
                  label="Position"
                  value={
                    selectedPositionId
                  }
                  placeholder="Select a position"
                  displayText={
                    selectedPositionId
                      ? getPositionDisplay(
                          selectedPositionId
                        )
                      : undefined
                  }
                  optional
                  icon={<FiBriefcase />}
                  onClick={() =>
                    setPositionModalVisible(
                      true
                    )
                  }
                />

              </div>

            </section>

            {/* =================================================
                REPORTING
            ================================================= */}

            <section className="formSection">

              <div className="sectionTitle">

                <div className="sectionTitleIcon greenSection">
                  <FiUsers />
                </div>

                <div>
                  <h2>
                    Reporting Structure
                  </h2>

                  <p>
                    Define who this employee
                    reports to.
                  </p>
                </div>

              </div>

              <SelectField
                label="Reports To"
                value={reportsToId}
                placeholder="Search for manager or supervisor"
                displayText={
                  reportsToId
                    ? selectedReportsToName ||
                      'Selected employee'
                    : undefined
                }
                optional
                icon={<FiUsers />}
                onClick={() =>
                  setReportsToModalVisible(
                    true
                  )
                }
              />

              {reportsToId && (
                <div className="selectedManager">
                  <div className="selectedManagerCheck">
                    <FiCheck />
                  </div>

                  <div>
                    <strong>
                      Reporting manager selected
                    </strong>

                    <span>
                      {selectedReportsToName}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setValue(
                        'reports_to',
                        ''
                      );
                      setSelectedReportsToName(
                        ''
                      );
                    }}
                  >
                    Change
                  </button>
                </div>
              )}

            </section>

            {/* =================================================
                FORM ACTIONS
            ================================================= */}

            <div className="formActions">

              <div className="actionInfo">
                <FiZap />

                <span>
                  {isManager
                    ? 'A manager account will be created.'
                    : 'A standard employee account will be created.'}
                </span>
              </div>

              <div className="actionButtons">

                <button
                  type="button"
                  className="cancelButton"
                  onClick={() =>
                    router.back()
                  }
                  disabled={loading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submitButton"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="buttonSpinner" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Add{' '}
                      {isManager
                        ? 'Manager'
                        : 'Employee'}
                      <FiArrowRight />
                    </>
                  )}
                </button>

              </div>

            </div>

          </form>

        </main>
      </div>

      {/* =====================================================
          ROLE MODAL
      ===================================================== */}

      <SelectModal
        visible={roleModalVisible}
        onClose={() =>
          setRoleModalVisible(false)
        }
        title="Select Role"
        subtitle="Choose the employee's access role."
        icon={<FiShield />}
      >
        {roles.length === 0 ? (
          <div className="emptyModal">
            No roles available.
          </div>
        ) : (
          roles.map((role) => {
            const selected =
              selectedRoleId ===
              role.role_id;

            return (
              <button
                type="button"
                key={role.role_id}
                className={`optionRow ${
                  selected
                    ? 'optionSelected'
                    : ''
                }`}
                onClick={() => {
                  setValue(
                    'role_id',
                    role.role_id,
                    {
                      shouldValidate: true,
                    }
                  );

                  setRoleModalVisible(
                    false
                  );
                }}
              >
                <div
                  className={`optionIcon ${
                    selected
                      ? 'optionIconSelected'
                      : ''
                  }`}
                >
                  <FiShield />
                </div>

                <div className="optionInfo">
                  <strong>
                    {role.role_name}
                  </strong>

                  <span>
                    Access level{' '}
                    {role.role_level}
                  </span>
                </div>

                <div
                  className={`optionCheck ${
                    selected
                      ? 'optionCheckSelected'
                      : ''
                  }`}
                >
                  {selected && <FiCheck />}
                </div>
              </button>
            );
          })
        )}
      </SelectModal>

      {/* =====================================================
          POSITION MODAL
      ===================================================== */}

      <SelectModal
        visible={positionModalVisible}
        onClose={() =>
          setPositionModalVisible(
            false
          )
        }
        title="Select Position"
        subtitle="Choose the employee's organizational position."
        icon={<FiBriefcase />}
      >
        {positions.length === 0 ? (
          <div className="emptyModal">
            No positions available.
          </div>
        ) : (
          positions.map((position) => {
            const selected =
              selectedPositionId ===
              position.position_id;

            return (
              <button
                type="button"
                key={
                  position.position_id
                }
                className={`optionRow ${
                  selected
                    ? 'optionSelected'
                    : ''
                }`}
                onClick={() => {
                  setValue(
                    'position_id',
                    position.position_id
                  );

                  setPositionModalVisible(
                    false
                  );
                }}
              >
                <div
                  className={`optionIcon ${
                    selected
                      ? 'optionIconSelected'
                      : ''
                  }`}
                >
                  <FiBriefcase />
                </div>

                <div className="optionInfo">
                  <strong>
                    {position.title}
                  </strong>

                  <span>
                    Organizational position
                  </span>
                </div>

                <div
                  className={`optionCheck ${
                    selected
                      ? 'optionCheckSelected'
                      : ''
                  }`}
                >
                  {selected && <FiCheck />}
                </div>
              </button>
            );
          })
        )}
      </SelectModal>

      {/* =====================================================
          REPORTS TO MODAL
      ===================================================== */}

      {accessToken &&
        companyId &&
        deviceId && (
          <ReportsToModal
            visible={
              reportsToModalVisible
            }
            onClose={() =>
              setReportsToModalVisible(
                false
              )
            }
            onSelect={(employee) => {
              setValue(
                'reports_to',
                employee.user_id
              );

              setSelectedReportsToName(
                employee.full_name ||
                  employee.username ||
                  employee.user_id
              );
            }}
            accessToken={accessToken}
            companyId={companyId}
            deviceId={deviceId}
          />
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

  .page {
    min-height: 100vh;

    background:
      radial-gradient(
        circle at 0% 0%,
        rgba(37, 99, 235, 0.045),
        transparent 28%
      ),
      radial-gradient(
        circle at 100% 0%,
        rgba(123, 47, 190, 0.04),
        transparent 25%
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

    padding-bottom: 60px;
  }

  /* =======================================================
     HEADER
  ======================================================= */

  .pageHeader {
    position: relative;

    background: rgba(255, 255, 255, 0.96);

    border-bottom: 1px solid #e6eaf0;

    box-shadow:
      0 2px 10px rgba(15, 23, 42, 0.035);

    backdrop-filter: blur(14px);
  }

  .headerInner {
    width: min(1100px, calc(100% - 48px));

    min-height: 112px;

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

    border: 1px solid #e1e6ee;
    border-radius: 10px;

    background: #ffffff;
    color: #64748b;

    cursor: pointer;

    transition:
      transform .18s ease,
      color .18s ease,
      background .18s ease,
      border-color .18s ease;
  }

  .backButton:hover {
    color: #2563eb;

    border-color: #bfdbfe;
    background: #eff6ff;

    transform: translateX(-2px);
  }

  .backButton svg {
    width: 19px;
    height: 19px;
  }

  .headerIcon {
    width: 55px;
    height: 55px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 15px;

    background: #eff6ff;
    color: #2563eb;

    border: 1px solid #dbeafe;
  }

  .headerIcon svg {
    width: 25px;
    height: 25px;
  }

  .headerTitleArea {
    min-width: 0;
  }

  .breadcrumb {
    display: flex;
    align-items: center;

    gap: 5px;

    margin-bottom: 5px;

    color: #94a3b8;

    font-size: 10px;
    font-weight: 600;
  }

  .breadcrumb svg {
    width: 12px;
    height: 12px;
  }

  .breadcrumb strong {
    color: #64748b;
  }

  .headerTitleArea h1 {
    margin: 0;

    color: #172033;

    font-size: 26px;
    line-height: 1.2;

    font-weight: 750;

    letter-spacing: -.5px;
  }

  .headerTitleArea p {
    margin: 5px 0 0;

    color: #94a3b8;

    font-size: 12px;
    font-weight: 500;
  }

  /* =======================================================
     CONTENT
  ======================================================= */

  .content {
    width: min(900px, calc(100% - 48px));

    margin: 0 auto;

    padding-top: 28px;
  }

  /* =======================================================
     MANAGER BANNER
  ======================================================= */

  .managerBanner {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;

    padding: 16px 18px;

    border: 1px solid #e5eaf1;
    border-radius: 14px;

    background: #ffffff;

    box-shadow:
      0 2px 6px rgba(15,23,42,.025);

    transition:
      border-color .2s ease,
      background .2s ease;
  }

  .managerBannerActive {
    border-color: #ddd6fe;

    background:
      linear-gradient(
        135deg,
        #ffffff,
        #faf7ff
      );
  }

  .managerBannerLeft {
    display: flex;
    align-items: center;

    gap: 12px;
  }

  .managerBannerIcon {
    width: 42px;
    height: 42px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 11px;

    background: #f1eafe;
    color: #7b2fbe;
  }

  .managerBannerIcon svg {
    width: 19px;
    height: 19px;
  }

  .managerBannerLeft strong {
    display: block;

    color: #1e293b;

    font-size: 13px;
    font-weight: 700;
  }

  .managerBannerLeft p {
    margin: 3px 0 0;

    color: #94a3b8;

    font-size: 11px;
    line-height: 1.45;
  }

  /* =======================================================
     SWITCH
  ======================================================= */

  .switch {
    all: unset;

    width: 44px;
    height: 25px;

    flex-shrink: 0;

    padding: 2px;

    display: flex;
    align-items: center;

    border-radius: 999px;

    background: #cbd5e1;

    cursor: pointer;

    transition:
      background .2s ease;
  }

  .switchKnob {
    width: 21px;
    height: 21px;

    border-radius: 50%;

    background: #ffffff;

    box-shadow:
      0 1px 3px rgba(0,0,0,.18);

    transition:
      transform .2s ease;
  }

  .switchOn {
    background: #7b2fbe;
  }

  .switchOn .switchKnob {
    transform: translateX(19px);
  }

  /* =======================================================
     FORM SECTION
  ======================================================= */

  .formSection {
    margin-top: 18px;

    padding: 23px;

    border: 1px solid #e5eaf1;
    border-radius: 16px;

    background: #ffffff;

    box-shadow:
      0 2px 7px rgba(15,23,42,.025);
  }

  .sectionTitle {
    display: flex;
    align-items: center;

    gap: 11px;

    padding-bottom: 18px;

    border-bottom: 1px solid #eef1f5;
  }

  .sectionTitleIcon {
    width: 38px;
    height: 38px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;
  }

  .sectionTitleIcon svg {
    width: 17px;
    height: 17px;
  }

  .blueSection {
    background: #eff6ff;
    color: #2563eb;
  }

  .purpleSection {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .greenSection {
    background: #ecfdf5;
    color: #059669;
  }

  .sectionTitle h2 {
    margin: 0;

    color: #1e293b;

    font-size: 15px;
    line-height: 1.3;

    font-weight: 700;
  }

  .sectionTitle p {
    margin: 3px 0 0;

    color: #94a3b8;

    font-size: 11px;
    line-height: 1.4;
  }

  .formGrid {
    display: grid;

    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );

    gap: 18px;

    padding-top: 20px;
  }

  /* =======================================================
     FIELD
  ======================================================= */

  .field {
    min-width: 0;
  }

  .fieldLabelRow {
    margin-bottom: 7px;
  }

  .fieldLabel {
    display: flex;
    align-items: center;

    gap: 5px;

    color: #475569;

    font-size: 11px;
    font-weight: 650;
  }

  .fieldLabelIcon {
    display: flex;
    align-items: center;

    color: #94a3b8;
  }

  .fieldLabelIcon svg {
    width: 13px;
    height: 13px;
  }

  .requiredMark {
    color: #ef4444;
  }

  .optionalText {
    margin-left: 3px;

    color: #a1aabd;

    font-size: 9px;
    font-weight: 500;
  }

  /* =======================================================
     INPUT
  ======================================================= */

  .inputWrapper {
    height: 43px;

    border: 1px solid #dfe5ed;
    border-radius: 9px;

    background: #ffffff;

    transition:
      border-color .18s ease,
      box-shadow .18s ease;
  }

  .inputWrapper:focus-within {
    border-color: #93c5fd;

    box-shadow:
      0 0 0 3px rgba(37,99,235,.08);
  }

  .inputWrapper.inputError {
    border-color: #fca5a5;
  }

  .inputWrapper input {
    width: 100%;
    height: 100%;

    padding: 0 12px;

    border: 0;
    outline: 0;

    background: transparent;

    color: #1e293b;

    font-size: 12px;
    font-weight: 500;
  }

  .inputWrapper input::placeholder {
    color: #b3bdca;
  }

  /* =======================================================
     SELECT
  ======================================================= */

  .selectField {
    width: 100%;
    height: 43px;

    padding: 0 12px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    border: 1px solid #dfe5ed;
    border-radius: 9px;

    background: #ffffff;

    cursor: pointer;

    text-align: left;

    transition:
      border-color .18s ease,
      box-shadow .18s ease;
  }

  .selectField:hover {
    border-color: #cbd5e1;
  }

  .selectField:focus {
    outline: none;

    border-color: #93c5fd;

    box-shadow:
      0 0 0 3px rgba(37,99,235,.08);
  }

  .selectField.inputError {
    border-color: #fca5a5;
  }

  .selectValue {
    color: #1e293b;

    font-size: 12px;
    font-weight: 500;
  }

  .selectPlaceholder {
    color: #b3bdca;

    font-size: 12px;
    font-weight: 500;
  }

  .selectArrow {
    display: flex;

    color: #94a3b8;
  }

  .selectArrow svg {
    width: 16px;
    height: 16px;
  }

  /* =======================================================
     HINT / ERROR
  ======================================================= */

  .fieldHint {
    margin: 5px 0 0;

    color: #a0aabd;

    font-size: 9px;
    line-height: 1.4;
  }

  .fieldError {
    margin: 5px 0 0;

    color: #ef4444;

    font-size: 10px;
    font-weight: 500;
  }

  /* =======================================================
     SELECTED MANAGER
  ======================================================= */

  .selectedManager {
    margin-top: 13px;

    padding: 11px 13px;

    display: flex;
    align-items: center;

    gap: 10px;

    border: 1px solid #d1fae5;
    border-radius: 10px;

    background: #f0fdf4;
  }

  .selectedManagerCheck {
    width: 27px;
    height: 27px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    background: #10b981;
    color: white;
  }

  .selectedManagerCheck svg {
    width: 14px;
    height: 14px;
  }

  .selectedManager > div:nth-child(2) {
    min-width: 0;

    flex: 1;

    display: flex;
    flex-direction: column;
  }

  .selectedManager strong {
    color: #166534;

    font-size: 11px;
  }

  .selectedManager span {
    margin-top: 2px;

    color: #4b7d5c;

    font-size: 10px;
  }

  .selectedManager button {
    all: unset;

    color: #059669;

    font-size: 10px;
    font-weight: 700;

    cursor: pointer;
  }

  /* =======================================================
     FORM ACTIONS
  ======================================================= */

  .formActions {
    margin-top: 20px;

    padding: 16px 18px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;

    border: 1px solid #e5eaf1;
    border-radius: 14px;

    background: #ffffff;

    box-shadow:
      0 3px 10px rgba(15,23,42,.035);
  }

  .actionInfo {
    display: flex;
    align-items: center;

    gap: 7px;

    color: #94a3b8;

    font-size: 10px;
    font-weight: 500;
  }

  .actionInfo svg {
    width: 14px;
    height: 14px;

    color: #7b2fbe;
  }

  .actionButtons {
    display: flex;
    align-items: center;

    gap: 9px;
  }

  .cancelButton,
  .submitButton {
    height: 39px;

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
      transform .18s ease,
      box-shadow .18s ease,
      background .18s ease;
  }

  .cancelButton {
    border: 1px solid #dfe5ed;

    background: #ffffff;

    color: #64748b;
  }

  .cancelButton:hover:not(:disabled) {
    background: #f8fafc;
  }

  .submitButton {
    border: 0;

    background:
      linear-gradient(
        135deg,
        #2563eb,
        #7b2fbe
      );

    color: #ffffff;

    box-shadow:
      0 5px 13px rgba(80,70,190,.2);
  }

  .submitButton:hover:not(:disabled) {
    transform: translateY(-1px);

    box-shadow:
      0 8px 18px rgba(80,70,190,.25);
  }

  .submitButton:disabled,
  .cancelButton:disabled {
    opacity: .6;

    cursor: not-allowed;
  }

  .submitButton svg {
    width: 14px;
    height: 14px;
  }

  .buttonSpinner {
    width: 14px;
    height: 14px;

    border: 2px solid rgba(255,255,255,.35);
    border-top-color: #ffffff;

    border-radius: 50%;

    animation: spin .7s linear infinite;
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

    padding: 20px;

    background: rgba(15,23,42,.48);

    backdrop-filter: blur(4px);
  }

  .selectModal {
    width: min(500px, 100%);

    max-height: min(680px, calc(100vh - 40px));

    display: flex;
    flex-direction: column;

    overflow: hidden;

    border: 1px solid rgba(255,255,255,.7);
    border-radius: 17px;

    background: #ffffff;

    box-shadow:
      0 25px 60px rgba(15,23,42,.22);
  }

  .reportsModal {
    width: min(580px, 100%);
  }

  .modalHeader {
    padding: 17px 18px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    border-bottom: 1px solid #eef1f5;
  }

  .modalTitleArea {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 11px;
  }

  .modalIcon {
    width: 39px;
    height: 39px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;

    background: #eff6ff;
    color: #2563eb;
  }

  .purpleIcon {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .modalIcon svg {
    width: 18px;
    height: 18px;
  }

  .modalTitleArea h3 {
    margin: 0;

    color: #1e293b;

    font-size: 14px;
    font-weight: 700;
  }

  .modalTitleArea p {
    margin: 3px 0 0;

    color: #94a3b8;

    font-size: 10px;
    line-height: 1.4;
  }

  .modalClose {
    all: unset;

    width: 32px;
    height: 32px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    color: #94a3b8;

    cursor: pointer;
  }

  .modalClose:hover {
    background: #f1f5f9;
    color: #475569;
  }

  .modalClose svg {
    width: 17px;
    height: 17px;
  }

  .modalBody {
    padding: 8px;

    overflow-y: auto;
  }

  /* =======================================================
     OPTIONS
  ======================================================= */

  .optionRow {
    width: 100%;

    padding: 11px 10px;

    display: flex;
    align-items: center;

    gap: 11px;

    border: 1px solid transparent;
    border-radius: 10px;

    background: transparent;

    cursor: pointer;

    text-align: left;

    transition:
      background .15s ease,
      border-color .15s ease;
  }

  .optionRow:hover {
    background: #f8fafc;
  }

  .optionSelected {
    border-color: #dbeafe;

    background: #eff6ff;
  }

  .optionIcon {
    width: 37px;
    height: 37px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;

    background: #f1f5f9;
    color: #64748b;
  }

  .optionIconSelected {
    background: #dbeafe;
    color: #2563eb;
  }

  .optionIcon svg {
    width: 16px;
    height: 16px;
  }

  .optionInfo {
    min-width: 0;

    flex: 1;

    display: flex;
    flex-direction: column;
  }

  .optionInfo strong {
    overflow: hidden;

    color: #334155;

    font-size: 12px;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .optionInfo span {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 9px;
  }

  .optionCheck {
    width: 25px;
    height: 25px;

    display: flex;
    align-items: center;
    justify-content: center;

    border: 1px solid #e2e8f0;
    border-radius: 50%;

    color: transparent;
  }

  .optionCheckSelected {
    border-color: #2563eb;

    background: #2563eb;

    color: #ffffff;
  }

  .optionCheck svg {
    width: 13px;
    height: 13px;
  }

  .emptyModal {
    padding: 35px;

    text-align: center;

    color: #94a3b8;

    font-size: 12px;
  }

  /* =======================================================
     REPORTS SEARCH
  ======================================================= */

  .modalSearch {
    height: 43px;

    margin: 14px 16px 8px;

    padding: 0 12px;

    display: flex;
    align-items: center;

    gap: 8px;

    border: 1px solid #dfe5ed;
    border-radius: 9px;

    background: #f8fafc;
  }

  .modalSearch > svg {
    width: 16px;
    height: 16px;

    flex-shrink: 0;

    color: #94a3b8;
  }

  .modalSearch input {
    min-width: 0;

    flex: 1;

    border: 0;
    outline: 0;

    background: transparent;

    color: #334155;

    font-size: 11px;
  }

  .modalSearch input::placeholder {
    color: #a8b2c0;
  }

  .modalSearch button {
    all: unset;

    display: flex;

    color: #94a3b8;

    cursor: pointer;
  }

  .modalSearch button svg {
    width: 15px;
    height: 15px;
  }

  .employeeResults {
    min-height: 200px;

    padding: 4px 10px 10px;

    overflow-y: auto;
  }

  .employeeResult {
    width: 100%;

    padding: 10px;

    display: flex;
    align-items: center;

    gap: 11px;

    border: 1px solid transparent;
    border-radius: 10px;

    background: transparent;

    cursor: pointer;

    text-align: left;

    transition:
      background .15s ease,
      border-color .15s ease;
  }

  .employeeResult:hover {
    border-color: #e2e8f0;
    background: #f8fafc;
  }

  .employeeResultInfo {
    min-width: 0;

    flex: 1;

    display: flex;
    flex-direction: column;
  }

  .employeeResultInfo strong {
    overflow: hidden;

    color: #334155;

    font-size: 12px;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .employeeResultInfo > span {
    margin-top: 2px;

    color: #94a3b8;

    font-size: 9px;
  }

  .employeeMeta {
    margin-top: 5px;

    display: flex;
    gap: 6px;

    flex-wrap: wrap;
  }

  .employeeMeta span {
    padding: 3px 6px;

    border-radius: 5px;

    background: #f1f5f9;

    color: #64748b;

    font-size: 8px;
    font-weight: 600;
  }

  .employeeArrow {
    width: 15px;
    height: 15px;

    flex-shrink: 0;

    color: #cbd5e1;
  }

  .modalLoading {
    min-height: 220px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    gap: 10px;

    color: #94a3b8;

    font-size: 10px;
  }

  .smallSpinner {
    width: 26px;
    height: 26px;

    border: 2px solid #e2e8f0;
    border-top-color: #7b2fbe;

    border-radius: 50%;

    animation: spin .7s linear infinite;
  }

  .noResults {
    min-height: 220px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    text-align: center;
  }

  .noResultsIcon {
    width: 45px;
    height: 45px;

    margin-bottom: 10px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 12px;

    background: #f1f5f9;
    color: #94a3b8;
  }

  .noResultsIcon svg {
    width: 19px;
    height: 19px;
  }

  .noResults strong {
    color: #475569;

    font-size: 11px;
  }

  .noResults > span {
    max-width: 270px;

    margin-top: 4px;

    color: #a1aabd;

    font-size: 9px;
    line-height: 1.5;
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

    padding: 40px 30px;

    display: flex;
    flex-direction: column;
    align-items: center;

    border: 1px solid #e5eaf1;
    border-radius: 17px;

    background: #ffffff;

    box-shadow:
      0 15px 40px rgba(15,23,42,.06);

    text-align: center;
  }

  .largeSpinner {
    width: 38px;
    height: 38px;

    border: 3px solid #e2e8f0;
    border-top-color: #7b2fbe;

    border-radius: 50%;

    animation: spin .7s linear infinite;
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

  @media (max-width: 760px) {
    .headerInner,
    .content {
      width: calc(100% - 28px);
    }

    .headerInner {
      min-height: 94px;
    }

    .breadcrumb {
      display: none;
    }

    .headerIcon {
      width: 48px;
      height: 48px;
    }

    .headerTitleArea h1 {
      font-size: 22px;
    }

    .headerTitleArea p {
      font-size: 10px;
    }

    .content {
      padding-top: 18px;
    }

    .formGrid {
      grid-template-columns: 1fr;
    }

    .formSection {
      padding: 18px;
    }

    .formActions {
      flex-direction: column;
      align-items: stretch;
    }

    .actionInfo {
      justify-content: center;
    }

    .actionButtons {
      width: 100%;
    }

    .cancelButton,
    .submitButton {
      flex: 1;
    }
  }

  @media (max-width: 520px) {
    .headerInner {
      gap: 10px;
    }

    .backButton {
      width: 36px;
      height: 36px;
    }

    .headerIcon {
      width: 43px;
      height: 43px;

      border-radius: 11px;
    }

    .headerIcon svg {
      width: 20px;
      height: 20px;
    }

    .headerTitleArea h1 {
      font-size: 19px;
    }

    .headerTitleArea p {
      display: none;
    }

    .managerBanner {
      align-items: flex-start;
    }

    .managerBannerLeft p {
      max-width: 220px;
    }

    .formSection {
      margin-top: 13px;

      padding: 15px;

      border-radius: 13px;
    }

    .sectionTitle {
      padding-bottom: 14px;
    }

    .modalOverlay {
      align-items: flex-end;

      padding: 0;
    }

    .selectModal {
      width: 100%;

      max-height: 82vh;

      border-radius:
        18px 18px 0 0;
    }

    .reportsModal {
      width: 100%;
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