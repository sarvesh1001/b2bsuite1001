import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  FiArrowLeft,
  FiBriefcase,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiHome,
  FiLoader,
  FiMapPin,
  FiSave,
  FiSettings,
  FiUsers,
  FiX,
  FiAlertCircle,
} from 'react-icons/fi';

import {
  getPosition,
  updatePosition,
  getRootDepartments,
  listWorkCenters,
} from '@b2b/api-client';

import { useUserAuthStore } from '../../../store/userAuthStore';

// =========================================================
// TYPES
// =========================================================

type DepartmentItem = {
  department_id: string;
  department_name: string;
};

type WorkCenterItem = {
  work_center_code: string;
  name: string;
};

// =========================================================
// VALIDATION
// =========================================================

const schema = z.object({
  title: z
    .string()
    .min(1, 'Position title is required')
    .max(150, 'Position title is too long'),

  department_id: z.string().optional(),

  work_center_code: z
    .string()
    .nullable()
    .optional(),

  is_open: z.boolean().optional(),

  is_schedulable: z.boolean().optional(),

  attendance_required: z.boolean().optional(),

  overtime_allowed: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

// =========================================================
// TOGGLE
// =========================================================

const Switch: React.FC<{
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled = false }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={`switch ${value ? 'switchActive' : ''} ${
        disabled ? 'switchDisabled' : ''
      }`}
    >
      <span
        className={`switchKnob ${
          value ? 'switchKnobActive' : ''
        }`}
      />
    </button>
  );
};

// =========================================================
// SELECT MODAL
// =========================================================

interface SelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  items: Array<{
    id: string;
    name: string;
  }>;
  selectedId?: string;
  onSelect: (id: string) => void;
  accentColor?: string;
}

const SelectModal: React.FC<SelectModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  items,
  selectedId,
  onSelect,
  accentColor = '#2563EB',
}) => {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredItems = items.filter((item) =>
    item.name
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div
      className="modalOverlay"
      onClick={onClose}
    >
      <div
        className="selectModal"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Modal header */}
        <div className="modalHeader">
          <div>
            <h3>{title}</h3>

            {subtitle && (
              <p>{subtitle}</p>
            )}
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

        {/* Search */}
        {items.length > 5 && (
          <div className="modalSearch">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder={`Search ${title.toLowerCase()}...`}
              autoFocus
            />
          </div>
        )}

        {/* Options */}
        <div className="modalOptions">
          {filteredItems.map((item) => {
            const selected =
              selectedId === item.id;

            return (
              <button
                type="button"
                key={item.id}
                className={`selectOption ${
                  selected
                    ? 'selectOptionSelected'
                    : ''
                }`}
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
              >
                <div
                  className="optionIcon"
                  style={{
                    color: accentColor,
                    backgroundColor: `${accentColor}12`,
                  }}
                >
                  {selected ? (
                    <FiCheck />
                  ) : (
                    <FiBriefcase />
                  )}
                </div>

                <span>{item.name}</span>

                {selected && (
                  <FiCheck
                    className="selectedCheck"
                    style={{
                      color: accentColor,
                    }}
                  />
                )}
              </button>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="noOptions">
              <FiSearchIcon />

              <strong>
                No results found
              </strong>

              <span>
                Try a different search term.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Small local search icon wrapper so the main imports stay clean.
const FiSearchIcon = () => (
  <svg
    width="25"
    height="25"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </svg>
);

// =========================================================
// SETTING ROW
// =========================================================

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  title,
  description,
  value,
  onChange,
}) => {
  return (
    <div
      className={`settingRow ${
        value ? 'settingRowActive' : ''
      }`}
    >
      <div
        className={`settingIcon ${
          value ? 'settingIconActive' : ''
        }`}
      >
        {icon}
      </div>

      <div className="settingContent">
        <span className="settingTitle">
          {title}
        </span>

        <span className="settingDescription">
          {description}
        </span>
      </div>

      <Switch
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

// =========================================================
// MAIN COMPONENT
// =========================================================

export default function EditPositionScreen() {
  const router = useRouter();

  const { positionId } = router.query;

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [departments, setDepartments] =
    useState<DepartmentItem[]>([]);

  const [workCenters, setWorkCenters] =
    useState<WorkCenterItem[]>([]);

  const [deptModalOpen, setDeptModalOpen] =
    useState(false);

  const [wcModalOpen, setWcModalOpen] =
    useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),

    defaultValues: {
      title: '',
      department_id: '',
      work_center_code: null,
      is_open: false,
      is_schedulable: false,
      attendance_required: false,
      overtime_allowed: false,
    },
  });

  const selectedDepartment =
    watch('department_id');

  const selectedWorkCenter =
    watch('work_center_code');

  // =======================================================
  // LOAD DATA
  // =======================================================

  useEffect(() => {
    if (!router.isReady) return;

    if (
      !positionId ||
      typeof positionId !== 'string'
    ) {
      setLoadError(
        'Position ID is missing.'
      );
      setLoading(false);
      return;
    }

    if (
      !accessToken ||
      !companyId ||
      !deviceId
    ) {
      setLoadError(
        'Missing authentication information. Please log in again.'
      );
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const [
          positionRes,
          deptRes,
          wcRes,
        ] = await Promise.all([
          getPosition(
            companyId,
            deviceId,
            positionId,
            accessToken
          ),

          getRootDepartments(
            companyId,
            deviceId,
            accessToken
          ),

          listWorkCenters(
            companyId,
            deviceId,
            {
              page: 1,
              page_size: 100,
            },
            accessToken
          ),
        ]);

        const position =
          positionRes.data;

        if (!position) {
          throw new Error(
            'Position not found.'
          );
        }

        setDepartments(
          deptRes.data || []
        );

        setWorkCenters(
          wcRes.data || []
        );

        reset({
          title: position.title || '',
          department_id:
            position.department_id || '',
          work_center_code:
            position.work_center_code ||
            null,
          is_open:
            Boolean(position.is_open),
          is_schedulable:
            Boolean(position.is_schedulable),
          attendance_required:
            Boolean(
              position.attendance_required
            ),
          overtime_allowed:
            Boolean(
              position.overtime_allowed
            ),
        });
      } catch (error: any) {
        console.error(
          'Failed to load position:',
          error
        );

        setLoadError(
          error?.response?.data?.message ||
            error?.message ||
            'Failed to load position.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    router.isReady,
    positionId,
    accessToken,
    companyId,
    deviceId,
    reset,
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
      !deviceId ||
      typeof positionId !== 'string'
    ) {
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...data,
        work_center_code:
          data.work_center_code ||
          undefined,
      };

      await updatePosition(
        companyId,
        deviceId,
        positionId,
        payload,
        accessToken
      );

      router.back();
    } catch (error: any) {
      console.error(
        'Failed to update position:',
        error
      );

      alert(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to update position.'
      );
    } finally {
      setSaving(false);
    }
  };

  // =======================================================
  // LABEL HELPERS
  // =======================================================

  const getDepartmentLabel = (
    id?: string
  ) => {
    if (!id) {
      return 'Select department';
    }

    return (
      departments.find(
        (department) =>
          department.department_id === id
      )?.department_name ||
      'Select department'
    );
  };

  const getWorkCenterLabel = (
    code?: string | null
  ) => {
    if (!code) {
      return 'No work center selected';
    }

    return (
      workCenters.find(
        (workCenter) =>
          workCenter.work_center_code ===
          code
      )?.name ||
      code
    );
  };

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <>
        <div className="page loadingPage">
          <div className="loadingState">
            <div className="loadingSpinner" />

            <h2>
              Loading position
            </h2>

            <p>
              Fetching position details...
            </p>
          </div>
        </div>

        <style jsx>{styles}</style>
      </>
    );
  }

  // =======================================================
  // ERROR
  // =======================================================

  if (loadError) {
    return (
      <>
        <div className="page">
          <div className="errorState">
            <div className="errorStateIcon">
              <FiAlertCircle />
            </div>

            <h2>
              Unable to load position
            </h2>

            <p>{loadError}</p>

            <div className="errorActions">
              <button
                type="button"
                className="secondaryButton"
                onClick={() =>
                  router.back()
                }
              >
                <FiArrowLeft />
                Go Back
              </button>

              <button
                type="button"
                className="primaryButton"
                onClick={() =>
                  window.location.reload()
                }
              >
                Try Again
              </button>
            </div>
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
      <div className="page">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="topHeader">
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
              <FiBriefcase />
            </div>

            <div className="headerText">
              <div className="breadcrumb">
                <span>
                  Administration
                </span>

                <FiChevronDown />

                <span>
                  Positions
                </span>
              </div>

              <h1>
                Edit Position
              </h1>

              <p>
                Update position details,
                department and work settings
              </p>
            </div>

          </div>

          <div className="headerAccent" />
        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="content">

          {/* Page intro */}
          <div className="pageIntro">

            <div>
              <h2>
                Position Details
              </h2>

              <p>
                Manage the role configuration
                and operational settings for
                this position.
              </p>
            </div>

            {isDirty && (
              <div className="unsavedBadge">
                <span />
                Unsaved changes
              </div>
            )}

          </div>

          {/* =================================================
              FORM
          ================================================= */}

          <form
            onSubmit={handleSubmit(
              onSubmit
            )}
          >

            <div className="formGrid">

              {/* ===========================================
                  BASIC INFORMATION
              =========================================== */}

              <section className="formCard">

                <div className="cardHeader">

                  <div className="cardHeaderIcon blue">
                    <FiBriefcase />
                  </div>

                  <div>
                    <h3>
                      Basic Information
                    </h3>

                    <p>
                      Define the position and
                      organizational assignment.
                    </p>
                  </div>

                </div>

                <div className="cardBody">

                  {/* Position title */}
                  <Controller
                    control={control}
                    name="title"
                    render={({
                      field,
                    }) => (
                      <div className="field">
                        <label>
                          Position Title
                          <span className="required">
                            *
                          </span>
                        </label>

                        <input
                          {...field}
                          placeholder="e.g. Senior Accountant"
                          className={
                            errors.title
                              ? 'input inputError'
                              : 'input'
                          }
                        />

                        {errors.title && (
                          <span className="fieldError">
                            {
                              errors
                                .title
                                .message
                            }
                          </span>
                        )}
                      </div>
                    )}
                  />

                  {/* Department */}
                  <div className="field">

                    <label>
                      Department
                    </label>

                    <button
                      type="button"
                      className={`selectButton ${
                        selectedDepartment
                          ? 'selectButtonSelected'
                          : ''
                      }`}
                      onClick={() =>
                        setDeptModalOpen(
                          true
                        )
                      }
                    >

                      <div className="selectValue">

                        <div className="selectSmallIcon">
                          <FiUsers />
                        </div>

                        <span>
                          {selectedDepartment
                            ? getDepartmentLabel(
                                selectedDepartment
                              )
                            : 'Select department'}
                        </span>

                      </div>

                      <FiChevronDown />
                    </button>

                  </div>

                  {/* Work center */}
                  <div className="field">

                    <div className="labelRow">
                      <label>
                        Work Center
                      </label>

                      <span className="optional">
                        Optional
                      </span>
                    </div>

                    <button
                      type="button"
                      className={`selectButton ${
                        selectedWorkCenter
                          ? 'selectButtonSelected'
                          : ''
                      }`}
                      onClick={() =>
                        setWcModalOpen(
                          true
                        )
                      }
                    >

                      <div className="selectValue">

                        <div className="selectSmallIcon">
                          <FiMapPin />
                        </div>

                        <span>
                          {selectedWorkCenter
                            ? getWorkCenterLabel(
                                selectedWorkCenter
                              )
                            : 'Select work center'}
                        </span>

                      </div>

                      <FiChevronDown />
                    </button>

                    {selectedWorkCenter && (
                      <button
                        type="button"
                        className="clearSelection"
                        onClick={() =>
                          setValue(
                            'work_center_code',
                            null,
                            {
                              shouldDirty:
                                true,
                            }
                          )
                        }
                      >
                        <FiX />
                        Clear selection
                      </button>
                    )}

                  </div>

                </div>

              </section>

              {/* ===========================================
                  WORK SETTINGS
              =========================================== */}

              <section className="formCard">

                <div className="cardHeader">

                  <div className="cardHeaderIcon purple">
                    <FiSettings />
                  </div>

                  <div>
                    <h3>
                      Work Settings
                    </h3>

                    <p>
                      Configure how this position
                      operates.
                    </p>
                  </div>

                </div>

                <div className="settingsList">

                  <Controller
                    control={control}
                    name="is_open"
                    render={({
                      field: {
                        value,
                        onChange,
                      },
                    }) => (
                      <SettingRow
                        icon={
                          <FiUsers />
                        }
                        title="Open Position"
                        description="Allow this position to be assigned to employees."
                        value={
                          value ?? false
                        }
                        onChange={
                          onChange
                        }
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="is_schedulable"
                    render={({
                      field: {
                        value,
                        onChange,
                      },
                    }) => (
                      <SettingRow
                        icon={
                          <FiClock />
                        }
                        title="Schedulable"
                        description="Allow employees in this position to be scheduled."
                        value={
                          value ?? false
                        }
                        onChange={
                          onChange
                        }
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="attendance_required"
                    render={({
                      field: {
                        value,
                        onChange,
                      },
                    }) => (
                      <SettingRow
                        icon={
                          <FiCheck />
                        }
                        title="Attendance Required"
                        description="Require attendance tracking for this position."
                        value={
                          value ?? false
                        }
                        onChange={
                          onChange
                        }
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name="overtime_allowed"
                    render={({
                      field: {
                        value,
                        onChange,
                      },
                    }) => (
                      <SettingRow
                        icon={
                          <FiClock />
                        }
                        title="Overtime Allowed"
                        description="Allow employees to record approved overtime."
                        value={
                          value ?? false
                        }
                        onChange={
                          onChange
                        }
                      />
                    )}
                  />

                </div>

              </section>

            </div>

            {/* =================================================
                BOTTOM ACTION BAR
            ================================================= */}

            <div className="actionBar">

              <div className="actionInfo">

                <div className="actionStatus">
                  <span
                    className={
                      isDirty
                        ? 'statusDot dirty'
                        : 'statusDot'
                    }
                  />

                  {isDirty
                    ? 'Changes ready to save'
                    : 'No changes made'}
                </div>

              </div>

              <div className="actionButtons">

                <button
                  type="button"
                  className="cancelButton"
                  disabled={saving}
                  onClick={() =>
                    router.back()
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="saveButton"
                  disabled={saving}
                >

                  {saving ? (
                    <>
                      <FiLoader className="buttonSpinner" />
                      Saving changes...
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

          </form>

        </main>
      </div>

      {/* =====================================================
          DEPARTMENT MODAL
      ===================================================== */}

      <SelectModal
        isOpen={deptModalOpen}
        onClose={() =>
          setDeptModalOpen(false)
        }
        title="Select Department"
        subtitle="Choose the department responsible for this position."
        items={departments.map(
          (department) => ({
            id: department.department_id,
            name: department.department_name,
          })
        )}
        selectedId={
          selectedDepartment
        }
        onSelect={(id) =>
          setValue(
            'department_id',
            id,
            {
              shouldDirty: true,
              shouldValidate: true,
            }
          )
        }
        accentColor="#2563EB"
      />

      {/* =====================================================
          WORK CENTER MODAL
      ===================================================== */}

      <SelectModal
        isOpen={wcModalOpen}
        onClose={() =>
          setWcModalOpen(false)
        }
        title="Select Work Center"
        subtitle="Optionally assign this position to a work center."
        items={workCenters.map(
          (workCenter) => ({
            id:
              workCenter.work_center_code,
            name: workCenter.name,
          })
        )}
        selectedId={
          selectedWorkCenter ||
          undefined
        }
        onSelect={(code) =>
          setValue(
            'work_center_code',
            code,
            {
              shouldDirty: true,
              shouldValidate: true,
            }
          )
        }
        accentColor="#2563EB"
      />

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

    padding-bottom: 50px;
  }

  /* =======================================================
     HEADER
  ======================================================= */

  .topHeader {
    position: relative;

    background: rgba(255,255,255,0.96);

    border-bottom: 1px solid #e7ebf1;

    box-shadow:
      0 2px 12px rgba(15,23,42,0.035);

    backdrop-filter: blur(12px);
  }

  .headerInner {
    width: min(1180px, calc(100% - 48px));

    min-height: 118px;

    margin: 0 auto;

    display: flex;
    align-items: center;

    gap: 15px;
  }

  .headerAccent {
    position: absolute;

    left: 0;
    bottom: 0;

    width: 100%;
    height: 3px;

    background: #2563eb;
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
      color 0.18s ease,
      background 0.18s ease,
      border-color 0.18s ease,
      transform 0.18s ease;
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
    width: 58px;
    height: 58px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border: 1px solid #bfdbfe;
    border-radius: 15px;

    background: #eff6ff;

    color: #2563eb;
  }

  .headerIcon svg {
    width: 27px;
    height: 27px;
  }

  .headerText {
    min-width: 0;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;

    margin-bottom: 5px;

    color: #94a3b8;

    font-size: 11px;
    font-weight: 650;
  }

  .breadcrumb svg {
    width: 12px;
    height: 12px;
  }

  .headerText h1 {
    margin: 0;

    color: #172033;

    font-size: 27px;
    line-height: 1.2;

    font-weight: 750;

    letter-spacing: -0.55px;
  }

  .headerText p {
    margin: 5px 0 0;

    color: #64748b;

    font-size: 12px;
    font-weight: 500;
  }

  /* =======================================================
     CONTENT
  ======================================================= */

  .content {
    width: min(1180px, calc(100% - 48px));

    margin: 0 auto;

    padding-top: 34px;
  }

  .pageIntro {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;

    gap: 20px;

    margin-bottom: 20px;
  }

  .pageIntro h2 {
    margin: 0;

    color: #1e293b;

    font-size: 19px;
    font-weight: 700;

    letter-spacing: -0.2px;
  }

  .pageIntro p {
    margin: 5px 0 0;

    color: #94a3b8;

    font-size: 12px;
    line-height: 1.5;

    font-weight: 500;
  }

  .unsavedBadge {
    display: flex;
    align-items: center;
    gap: 7px;

    padding: 7px 10px;

    border: 1px solid #fed7aa;
    border-radius: 8px;

    background: #fff7ed;

    color: #c2410c;

    font-size: 11px;
    font-weight: 650;

    white-space: nowrap;
  }

  .unsavedBadge span {
    width: 6px;
    height: 6px;

    border-radius: 50%;

    background: #f97316;
  }

  /* =======================================================
     FORM GRID
  ======================================================= */

  .formGrid {
    display: grid;

    grid-template-columns:
      minmax(0, 1fr)
      minmax(0, 1fr);

    gap: 18px;

    align-items: start;
  }

  .formCard {
    overflow: hidden;

    border: 1px solid #e5eaf1;
    border-radius: 16px;

    background: #ffffff;

    box-shadow:
      0 2px 6px rgba(15,23,42,0.025);
  }

  .cardHeader {
    display: flex;
    align-items: center;

    gap: 12px;

    padding: 19px 20px;

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
    color: #2563eb;
    background: #eff6ff;
  }

  .cardHeaderIcon.purple {
    color: #7c3aed;
    background: #f5f3ff;
  }

  .cardHeader h3 {
    margin: 0;

    color: #1e293b;

    font-size: 14px;
    font-weight: 700;
  }

  .cardHeader p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 10px;
    line-height: 1.4;

    font-weight: 500;
  }

  /* =======================================================
     FORM BODY
  ======================================================= */

  .cardBody {
    padding: 21px;
  }

  .field {
    margin-bottom: 19px;
  }

  .field:last-child {
    margin-bottom: 0;
  }

  .field label {
    display: block;

    margin-bottom: 7px;

    color: #334155;

    font-size: 11px;
    font-weight: 650;
  }

  .required {
    margin-left: 3px;
    color: #ef4444;
  }

  .labelRow {
    display: flex;
    align-items: center;
    justify-content: space-between;

    margin-bottom: 7px;
  }

  .labelRow label {
    margin: 0;
  }

  .optional {
    color: #94a3b8;

    font-size: 9px;
    font-weight: 600;

    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .input {
    width: 100%;
    height: 45px;

    padding: 0 13px;

    border: 1px solid #dfe5ed;
    border-radius: 9px;

    outline: none;

    background: #ffffff;

    color: #172033;

    font-size: 13px;
    font-weight: 500;

    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease;
  }

  .input::placeholder {
    color: #b0bac8;
  }

  .input:focus {
    border-color: #60a5fa;

    box-shadow:
      0 0 0 3px rgba(37,99,235,0.09);
  }

  .inputError {
    border-color: #ef4444;
  }

  .inputError:focus {
    box-shadow:
      0 0 0 3px rgba(239,68,68,0.08);
  }

  .fieldError {
    display: block;

    margin-top: 6px;

    color: #dc2626;

    font-size: 10px;
    font-weight: 500;
  }

  /* =======================================================
     SELECT
  ======================================================= */

  .selectButton {
    width: 100%;
    min-height: 45px;

    padding: 0 12px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    border: 1px solid #dfe5ed;
    border-radius: 9px;

    background: #ffffff;

    color: #94a3b8;

    cursor: pointer;

    transition:
      border-color 0.18s ease,
      background 0.18s ease,
      box-shadow 0.18s ease;
  }

  .selectButton:hover {
    border-color: #cbd5e1;
    background: #fafbfc;
  }

  .selectButton:focus {
    outline: none;

    border-color: #60a5fa;

    box-shadow:
      0 0 0 3px rgba(37,99,235,0.09);
  }

  .selectButtonSelected {
    color: #1e293b;
  }

  .selectButton > svg {
    width: 16px;
    height: 16px;

    flex-shrink: 0;

    color: #94a3b8;
  }

  .selectValue {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 9px;
  }

  .selectValue > span {
    overflow: hidden;

    text-overflow: ellipsis;
    white-space: nowrap;

    font-size: 13px;
    font-weight: 500;
  }

  .selectSmallIcon {
    width: 27px;
    height: 27px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 7px;

    background: #f1f5f9;

    color: #64748b;
  }

  .selectSmallIcon svg {
    width: 14px;
    height: 14px;
  }

  .clearSelection {
    all: unset;

    margin-top: 7px;

    display: inline-flex;
    align-items: center;
    gap: 4px;

    color: #64748b;

    font-size: 10px;
    font-weight: 600;

    cursor: pointer;
  }

  .clearSelection:hover {
    color: #ef4444;
  }

  .clearSelection svg {
    width: 12px;
    height: 12px;
  }

  /* =======================================================
     SETTINGS
  ======================================================= */

  .settingsList {
    padding: 8px 12px 12px;
  }

  .settingRow {
    min-height: 76px;

    display: flex;
    align-items: center;

    gap: 12px;

    padding: 12px 8px;

    border-bottom: 1px solid #f0f2f5;

    transition:
      background 0.18s ease;
  }

  .settingRow:last-child {
    border-bottom: none;
  }

  .settingRow:hover {
    border-radius: 10px;
    background: #fafbfc;
  }

  .settingRowActive {
    background: rgba(37,99,235,0.025);
  }

  .settingIcon {
    width: 37px;
    height: 37px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;

    background: #f1f5f9;

    color: #64748b;

    transition:
      background 0.18s ease,
      color 0.18s ease;
  }

  .settingIconActive {
    background: #eff6ff;
    color: #2563eb;
  }

  .settingIcon svg {
    width: 17px;
    height: 17px;
  }

  .settingContent {
    min-width: 0;
    flex: 1;

    display: flex;
    flex-direction: column;
  }

  .settingTitle {
    color: #334155;

    font-size: 12px;
    font-weight: 650;
  }

  .settingDescription {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 9px;
    line-height: 1.4;

    font-weight: 500;
  }

  /* =======================================================
     SWITCH
  ======================================================= */

  .switch {
    position: relative;

    width: 42px;
    height: 24px;

    flex-shrink: 0;

    padding: 0;

    border: none;
    border-radius: 999px;

    background: #dbe1e8;

    cursor: pointer;

    transition:
      background 0.2s ease;
  }

  .switchActive {
    background: #2563eb;
  }

  .switchDisabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .switchKnob {
    position: absolute;

    top: 3px;
    left: 3px;

    width: 18px;
    height: 18px;

    border-radius: 50%;

    background: #ffffff;

    box-shadow:
      0 1px 3px rgba(15,23,42,0.18);

    transition:
      transform 0.2s ease;
  }

  .switchKnobActive {
    transform: translateX(18px);
  }

  /* =======================================================
     ACTION BAR
  ======================================================= */

  .actionBar {
    min-height: 72px;

    margin-top: 18px;
    padding: 13px 16px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;

    border: 1px solid #e5eaf1;
    border-radius: 14px;

    background: rgba(255,255,255,0.96);

    box-shadow:
      0 3px 12px rgba(15,23,42,0.035);
  }

  .actionStatus {
    display: flex;
    align-items: center;
    gap: 7px;

    color: #94a3b8;

    font-size: 10px;
    font-weight: 600;
  }

  .statusDot {
    width: 6px;
    height: 6px;

    border-radius: 50%;

    background: #cbd5e1;
  }

  .statusDot.dirty {
    background: #f97316;

    box-shadow:
      0 0 0 3px rgba(249,115,22,0.1);
  }

  .actionButtons {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .cancelButton,
  .saveButton,
  .primaryButton,
  .secondaryButton {
    min-height: 39px;

    padding: 0 16px;

    display: inline-flex;
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
      background 0.18s ease;
  }

  .cancelButton {
    border: 1px solid #dfe5ed;

    background: #ffffff;

    color: #64748b;
  }

  .cancelButton:hover {
    background: #f8fafc;
    color: #334155;
  }

  .saveButton,
  .primaryButton {
    border: none;

    background:
      linear-gradient(
        135deg,
        #2563eb,
        #1d4ed8
      );

    color: #ffffff;

    box-shadow:
      0 5px 12px rgba(37,99,235,0.18);
  }

  .saveButton:hover:not(:disabled),
  .primaryButton:hover {
    transform: translateY(-1px);

    box-shadow:
      0 7px 16px rgba(37,99,235,0.24);
  }

  .cancelButton:disabled,
  .saveButton:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .saveButton svg,
  .cancelButton svg,
  .primaryButton svg,
  .secondaryButton svg {
    width: 15px;
    height: 15px;
  }

  .buttonSpinner {
    animation: spin 0.8s linear infinite;
  }

  /* =======================================================
     MODAL
  ======================================================= */

  .modalOverlay {
    position: fixed;

    inset: 0;

    z-index: 100;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 20px;

    background: rgba(15,23,42,0.42);

    backdrop-filter: blur(3px);

    animation: fadeIn 0.16s ease;
  }

  .selectModal {
    width: min(470px, 100%);

    max-height: min(650px, calc(100vh - 40px));

    display: flex;
    flex-direction: column;

    overflow: hidden;

    border: 1px solid #e2e8f0;
    border-radius: 17px;

    background: #ffffff;

    box-shadow:
      0 25px 60px rgba(15,23,42,0.18);

    animation: modalIn 0.18s ease;
  }

  .modalHeader {
    display: flex;
    align-items: center;
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
    line-height: 1.4;
  }

  .modalClose {
    all: unset;

    width: 34px;
    height: 34px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    background: #f8fafc;

    color: #64748b;

    cursor: pointer;
  }

  .modalClose:hover {
    background: #fef2f2;
    color: #ef4444;
  }

  .modalClose svg {
    width: 17px;
    height: 17px;
  }

  .modalSearch {
    padding: 12px 15px;

    border-bottom: 1px solid #edf0f4;
  }

  .modalSearch input {
    width: 100%;
    height: 40px;

    padding: 0 12px;

    border: 1px solid #dfe5ed;
    border-radius: 8px;

    outline: none;

    color: #1e293b;

    font-size: 12px;
  }

  .modalSearch input:focus {
    border-color: #60a5fa;

    box-shadow:
      0 0 0 3px rgba(37,99,235,0.08);
  }

  .modalOptions {
    overflow-y: auto;

    padding: 7px;
  }

  .selectOption {
    width: 100%;

    min-height: 58px;

    padding: 8px 10px;

    display: flex;
    align-items: center;

    gap: 10px;

    border: none;
    border-radius: 10px;

    background: transparent;

    color: #334155;

    text-align: left;

    cursor: pointer;

    transition:
      background 0.16s ease;
  }

  .selectOption:hover {
    background: #f8fafc;
  }

  .selectOptionSelected {
    background: #eff6ff;
  }

  .selectOptionSelected:hover {
    background: #eff6ff;
  }

  .optionIcon {
    width: 36px;
    height: 36px;

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

  .selectOption > span {
    flex: 1;

    overflow: hidden;

    font-size: 12px;
    font-weight: 600;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .selectedCheck {
    width: 16px;
    height: 16px;

    flex-shrink: 0;
  }

  .noOptions {
    min-height: 180px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    gap: 5px;

    color: #94a3b8;

    text-align: center;
  }

  .noOptions strong {
    margin-top: 7px;

    color: #475569;

    font-size: 12px;
  }

  .noOptions span {
    font-size: 10px;
  }

  /* =======================================================
     LOADING
  ======================================================= */

  .loadingPage {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loadingState {
    width: min(350px, calc(100% - 40px));

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

  .loadingSpinner {
    width: 38px;
    height: 38px;

    border: 3px solid #e5e7eb;
    border-top-color: #2563eb;

    border-radius: 50%;

    animation: spin 0.8s linear infinite;
  }

  .loadingState h2 {
    margin: 19px 0 0;

    color: #1e293b;

    font-size: 17px;
    font-weight: 700;
  }

  .loadingState p {
    margin: 6px 0 0;

    color: #94a3b8;

    font-size: 11px;
  }

  /* =======================================================
     ERROR
  ======================================================= */

  .errorState {
    width: min(430px, calc(100% - 40px));

    margin: 100px auto;

    padding: 40px 30px;

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

  .errorStateIcon {
    width: 64px;
    height: 64px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 17px;

    background: #fef2f2;
    color: #ef4444;
  }

  .errorStateIcon svg {
    width: 29px;
    height: 29px;
  }

  .errorState h2 {
    margin: 19px 0 0;

    color: #1e293b;

    font-size: 20px;
    font-weight: 700;
  }

  .errorState p {
    margin: 8px 0 0;

    color: #64748b;

    font-size: 12px;
    line-height: 1.6;
  }

  .errorActions {
    display: flex;
    align-items: center;
    gap: 9px;

    margin-top: 23px;
  }

  .secondaryButton {
    border: 1px solid #dfe5ed;

    background: #ffffff;

    color: #64748b;
  }

  /* =======================================================
     RESPONSIVE
  ======================================================= */

  @media (max-width: 850px) {
    .formGrid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 650px) {
    .headerInner,
    .content {
      width: calc(100% - 28px);
    }

    .headerInner {
      min-height: 100px;
    }

    .headerIcon {
      width: 48px;
      height: 48px;

      border-radius: 12px;
    }

    .headerIcon svg {
      width: 22px;
      height: 22px;
    }

    .headerText h1 {
      font-size: 23px;
    }

    .headerText p {
      font-size: 10px;
    }

    .breadcrumb {
      display: none;
    }

    .content {
      padding-top: 25px;
    }

    .pageIntro {
      align-items: flex-start;

      flex-direction: column;

      margin-bottom: 16px;
    }

    .unsavedBadge {
      align-self: flex-start;
    }

    .cardHeader {
      padding: 16px;
    }

    .cardBody {
      padding: 17px;
    }

    .settingsList {
      padding: 6px 9px 9px;
    }

    .settingRow {
      padding: 11px 5px;
    }

    .settingDescription {
      max-width: 210px;
    }

    .actionBar {
      align-items: stretch;

      flex-direction: column;

      padding: 13px;
    }

    .actionStatus {
      justify-content: center;
    }

    .actionButtons {
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

    .selectModal {
      width: 100%;

      max-height: 78vh;

      border-radius: 18px 18px 0 0;

      animation: sheetIn 0.2s ease;
    }
  }

  @media (max-width: 430px) {
    .backButton {
      width: 36px;
      height: 36px;
    }

    .headerIcon {
      width: 44px;
      height: 44px;
    }

    .headerText h1 {
      font-size: 21px;
    }

    .headerText p {
      display: none;
    }

    .settingDescription {
      max-width: 170px;
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
      transform: translateY(10px) scale(0.985);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes sheetIn {
    from {
      transform: translateY(100%);
    }

    to {
      transform: translateY(0);
    }
  }
`;