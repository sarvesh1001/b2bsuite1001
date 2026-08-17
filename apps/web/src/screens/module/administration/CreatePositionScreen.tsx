import React, { useState, useEffect } from 'react';
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
  FiInfo,
  FiLayers,
  FiLoader,
  FiSettings,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi';

import {
  createPosition,
  getRootDepartments,
  listWorkCenters,
} from '@b2b/api-client';

import { useUserAuthStore } from '../../../store/userAuthStore';
import { Switch } from '../../../components/Switch';
import { SelectModal } from '../../../components/SelectModal';

// =========================================================
// SCHEMA
// =========================================================

const schema = z.object({
  title: z.string().min(1, 'Position title is required'),
  department_id: z.string().min(1, 'Department is required'),
  work_center_code: z.string().nullable().optional(),
  is_open: z.boolean(),
  is_schedulable: z.boolean(),
  attendance_required: z.boolean(),
  overtime_allowed: z.boolean(),
});

type FormData = z.infer<typeof schema>;

type Department = {
  department_id: string;
  department_name: string;
};

type WorkCenter = {
  work_center_code: string;
  name: string;
};

// =========================================================
// COMPONENT
// =========================================================

export default function CreatePositionScreen() {
  const router = useRouter();

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);

  const [modalVisible, setModalVisible] = useState(false);

  const [modalType, setModalType] = useState<
    'department' | 'workCenter'
  >('department');

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),

    defaultValues: {
      title: '',
      department_id: '',
      work_center_code: null,

      is_open: true,
      is_schedulable: true,
      attendance_required: true,
      overtime_allowed: false,
    },
  });

  const selectedDepartment = watch('department_id');
  const selectedWorkCenter = watch('work_center_code');

  // =======================================================
  // LOAD OPTIONS
  // =======================================================

  useEffect(() => {
    const fetchOptions = async () => {
      if (!accessToken || !companyId || !deviceId) {
        setLoadingOptions(false);
        return;
      }

      setLoadingOptions(true);

      try {
        const [deptRes, wcRes] = await Promise.all([
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

        setDepartments(deptRes.data || []);
        setWorkCenters(wcRes.data || []);
      } catch (error) {
        console.error(
          'Failed to load position options',
          error
        );

        alert(
          'Failed to load departments or work centers.'
        );
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [accessToken, companyId, deviceId]);

  // =======================================================
  // SUBMIT
  // =======================================================

  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId || !deviceId) {
      alert('Missing authentication information.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...data,
        company_id: companyId,
        work_center_code:
          data.work_center_code ?? undefined,
      };

      await createPosition(
        companyId,
        deviceId,
        payload,
        accessToken
      );

      alert('Position created successfully.');

      router.back();
    } catch (error: any) {
      console.error(
        'Failed to create position:',
        error
      );

      alert(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to create position.'
      );
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // PICKERS
  // =======================================================

  const openPicker = (
    type: 'department' | 'workCenter'
  ) => {
    setModalType(type);
    setModalVisible(true);
  };

  const selectItem = (value: string) => {
    if (modalType === 'department') {
      setValue('department_id', value, {
        shouldValidate: true,
      });
    } else {
      setValue('work_center_code', value);
    }

    setModalVisible(false);
  };

  const clearWorkCenter = () => {
    setValue('work_center_code', null);
  };

  const getDepartmentLabel = (id: string) => {
    const department = departments.find(
      (item) => item.department_id === id
    );

    return (
      department?.department_name ||
      'Select department'
    );
  };

  const getWorkCenterLabel = (
    code: string | null | undefined
  ) => {
    if (!code) {
      return 'Select work center';
    }

    const workCenter = workCenters.find(
      (item) => item.work_center_code === code
    );

    return workCenter?.name || 'Select work center';
  };

  // =======================================================
  // LOADING
  // =======================================================

  if (loadingOptions) {
    return (
      <>
        <div className="positionPage loadingPage">
          <div className="loadingCard">
            <div className="loadingSpinner" />

            <h2>Preparing position form</h2>

            <p>
              Loading departments and work centers...
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
      <div className="positionPage">

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
              <FiBriefcase />
            </div>

            <div className="headerText">
              <div className="breadcrumb">
                <span>Administration</span>
                <FiChevronDown />
                <span>Positions</span>
              </div>

              <h1>Create Position</h1>

              <p>
                Define a new position within your organization
              </p>
            </div>

          </div>

          <div className="headerAccent" />

        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="pageContent">

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="formLayout"
          >

            {/* =================================================
                MAIN FORM
            ================================================= */}

            <div className="mainColumn">

              {/* -----------------------------------------------
                  BASIC INFORMATION
              ------------------------------------------------ */}

              <section className="formSection">

                <div className="sectionHeader">

                  <div className="sectionIcon blue">
                    <FiBriefcase />
                  </div>

                  <div>
                    <h2>Basic Information</h2>

                    <p>
                      Set the name and organizational placement
                      of this position.
                    </p>
                  </div>

                </div>

                <div className="sectionBody">

                  {/* Position title */}

                  <Controller
                    control={control}
                    name="title"
                    render={({
                      field: {
                        onChange,
                        onBlur,
                        value,
                      },
                    }) => (
                      <div className="field">

                        <label htmlFor="position-title">
                          Position Title
                          <span className="required">
                            *
                          </span>
                        </label>

                        <div
                          className={
                            errors.title
                              ? 'inputWrapper error'
                              : 'inputWrapper'
                          }
                        >
                          <FiBriefcase />

                          <input
                            id="position-title"
                            type="text"
                            value={value}
                            onChange={(e) =>
                              onChange(
                                e.target.value
                              )
                            }
                            onBlur={onBlur}
                            placeholder="e.g. Senior Software Engineer"
                            autoComplete="off"
                          />
                        </div>

                        {errors.title && (
                          <div className="fieldError">
                            <FiInfo />

                            <span>
                              {errors.title.message}
                            </span>
                          </div>
                        )}

                        {!errors.title && (
                          <p className="fieldHint">
                            Use a clear title that employees
                            and managers will recognize.
                          </p>
                        )}

                      </div>
                    )}
                  />

                  {/* Department */}

                  <div className="field">

                    <label>
                      Department
                      <span className="required">
                        *
                      </span>
                    </label>

                    <button
                      type="button"
                      className={
                        errors.department_id
                          ? 'selectField error'
                          : selectedDepartment
                            ? 'selectField selected'
                            : 'selectField'
                      }
                      onClick={() =>
                        openPicker('department')
                      }
                    >
                      <div className="selectLeft">

                        <div className="selectIcon">
                          <FiUsers />
                        </div>

                        <div className="selectText">

                          <span className="selectValue">
                            {selectedDepartment
                              ? getDepartmentLabel(
                                  selectedDepartment
                                )
                              : 'Select department'}
                          </span>

                          <span className="selectHint">
                            Required
                          </span>

                        </div>

                      </div>

                      <FiChevronDown className="selectArrow" />

                    </button>

                    {errors.department_id && (
                      <div className="fieldError">
                        <FiInfo />

                        <span>
                          {errors.department_id.message}
                        </span>
                      </div>
                    )}

                  </div>

                  {/* Work Center */}

                  <div className="field">

                    <div className="labelRow">
                      <label>
                        Work Center
                      </label>

                      <span className="optionalLabel">
                        Optional
                      </span>
                    </div>

                    <div className="selectWithClear">

                      <button
                        type="button"
                        className={
                          selectedWorkCenter
                            ? 'selectField selected'
                            : 'selectField'
                        }
                        onClick={() =>
                          openPicker('workCenter')
                        }
                      >
                        <div className="selectLeft">

                          <div className="selectIcon green">
                            <FiLayers />
                          </div>

                          <div className="selectText">

                            <span className="selectValue">
                              {getWorkCenterLabel(
                                selectedWorkCenter
                              )}
                            </span>

                            <span className="selectHint">
                              Assign a work center
                            </span>

                          </div>

                        </div>

                        <FiChevronDown className="selectArrow" />

                      </button>

                      {selectedWorkCenter && (
                        <button
                          type="button"
                          className="clearSelect"
                          onClick={(event) => {
                            event.stopPropagation();
                            clearWorkCenter();
                          }}
                          aria-label="Clear work center"
                        >
                          <FiX />
                        </button>
                      )}

                    </div>

                  </div>

                </div>

              </section>

              {/* -----------------------------------------------
                  POSITION SETTINGS
              ------------------------------------------------ */}

              <section className="formSection">

                <div className="sectionHeader">

                  <div className="sectionIcon purple">
                    <FiSettings />
                  </div>

                  <div>
                    <h2>Position Settings</h2>

                    <p>
                      Configure how this position behaves
                      within the organization.
                    </p>
                  </div>

                </div>

                <div className="settingsList">

                  {/* Open position */}

                  <Controller
                    control={control}
                    name="is_open"
                    render={({
                      field: {
                        onChange,
                        value,
                      },
                    }) => (
                      <SettingRow
                        icon={<FiUsers />}
                        title="Open Position"
                        description="Allow employees to be assigned to this position."
                        value={value}
                        onChange={onChange}
                        color="#2563EB"
                      />
                    )}
                  />

                  {/* Schedulable */}

                  <Controller
                    control={control}
                    name="is_schedulable"
                    render={({
                      field: {
                        onChange,
                        value,
                      },
                    }) => (
                      <SettingRow
                        icon={<FiClock />}
                        title="Schedulable"
                        description="Allow this position to be included in work schedules."
                        value={value}
                        onChange={onChange}
                        color="#7C3AED"
                      />
                    )}
                  />

                  {/* Attendance */}

                  <Controller
                    control={control}
                    name="attendance_required"
                    render={({
                      field: {
                        onChange,
                        value,
                      },
                    }) => (
                      <SettingRow
                        icon={<FiCheck />}
                        title="Attendance Required"
                        description="Employees assigned to this position must record attendance."
                        value={value}
                        onChange={onChange}
                        color="#10B981"
                      />
                    )}
                  />

                  {/* Overtime */}

                  <Controller
                    control={control}
                    name="overtime_allowed"
                    render={({
                      field: {
                        onChange,
                        value,
                      },
                    }) => (
                      <SettingRow
                        icon={<FiZap />}
                        title="Overtime Allowed"
                        description="Allow overtime to be recorded for this position."
                        value={value}
                        onChange={onChange}
                        color="#F59E0B"
                      />
                    )}
                  />

                </div>

              </section>

            </div>

            {/* =================================================
                SIDE SUMMARY
            ================================================= */}

            <aside className="sideColumn">

              {/* Summary */}

              <div className="summaryCard">

                <div className="summaryHeader">

                  <div className="summaryIcon">
                    <FiBriefcase />
                  </div>

                  <div>
                    <h3>Position Summary</h3>
                    <p>Review before creating</p>
                  </div>

                </div>

                <div className="summaryDivider" />

                <SummaryItem
                  label="Position"
                  value={
                    watch('title') ||
                    'Not specified'
                  }
                />

                <SummaryItem
                  label="Department"
                  value={
                    selectedDepartment
                      ? getDepartmentLabel(
                          selectedDepartment
                        )
                      : 'Not selected'
                  }
                />

                <SummaryItem
                  label="Work Center"
                  value={
                    selectedWorkCenter
                      ? getWorkCenterLabel(
                          selectedWorkCenter
                        )
                      : 'Not assigned'
                  }
                />

                <div className="summaryDivider" />

                <div className="statusRow">

                  <span className="statusLabel">
                    Status
                  </span>

                  <span
                    className={
                      watch('is_open')
                        ? 'status active'
                        : 'status inactive'
                    }
                  >
                    <span className="statusDot" />

                    {watch('is_open')
                      ? 'Open'
                      : 'Closed'}
                  </span>

                </div>

              </div>

              {/* Information */}

              <div className="infoCard">

                <div className="infoCardIcon">
                  <FiInfo />
                </div>

                <div>

                  <h3>About Positions</h3>

                  <p>
                    Positions define specific roles within
                    your organization's departments. You can
                    configure scheduling, attendance and
                    overtime behavior for each position.
                  </p>

                </div>

              </div>

            </aside>

          </form>

        </main>

        {/* =================================================
            FOOTER ACTION BAR
        ================================================= */}

        <div className="actionBar">

          <div className="actionBarInner">

            <div className="actionHint">
              <FiInfo />

              <span>
                Fields marked with
                <strong>*</strong> are required
              </span>
            </div>

            <div className="actionButtons">

              <button
                type="button"
                className="cancelButton"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="createButton"
                disabled={loading}
                onClick={handleSubmit(onSubmit)}
              >
                {loading ? (
                  <>
                    <FiLoader className="buttonSpinner" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FiCheck />
                    Create Position
                  </>
                )}
              </button>

            </div>

          </div>

        </div>

      </div>

      {/* =================================================
          SELECT MODAL
      ================================================= */}

      <SelectModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={
          modalType === 'department'
            ? 'Select Department'
            : 'Select Work Center'
        }
      >

        {modalType === 'department' ? (
          <div className="modalList">

            {departments.length === 0 ? (
              <div className="modalEmpty">
                <FiUsers />

                <span>
                  No departments available
                </span>
              </div>
            ) : (
              departments.map((department) => {
                const selected =
                  selectedDepartment ===
                  department.department_id;

                return (
                  <button
                    type="button"
                    key={department.department_id}
                    className={
                      selected
                        ? 'modalItem selected'
                        : 'modalItem'
                    }
                    onClick={() =>
                      selectItem(
                        department.department_id
                      )
                    }
                  >
                    <div className="modalItemLeft">

                      <div className="modalItemIcon">
                        <FiUsers />
                      </div>

                      <span>
                        {department.department_name}
                      </span>

                    </div>

                    {selected && (
                      <div className="modalCheck">
                        <FiCheck />
                      </div>
                    )}
                  </button>
                );
              })
            )}

          </div>
        ) : (
          <div className="modalList">

            {workCenters.length === 0 ? (
              <div className="modalEmpty">
                <FiLayers />

                <span>
                  No work centers available
                </span>
              </div>
            ) : (
              workCenters.map((workCenter) => {
                const selected =
                  selectedWorkCenter ===
                  workCenter.work_center_code;

                return (
                  <button
                    type="button"
                    key={workCenter.work_center_code}
                    className={
                      selected
                        ? 'modalItem selected'
                        : 'modalItem'
                    }
                    onClick={() =>
                      selectItem(
                        workCenter.work_center_code
                      )
                    }
                  >
                    <div className="modalItemLeft">

                      <div className="modalItemIcon green">
                        <FiLayers />
                      </div>

                      <div className="modalItemText">

                        <span>
                          {workCenter.name}
                        </span>

                        <small>
                          {workCenter.work_center_code}
                        </small>

                      </div>

                    </div>

                    {selected && (
                      <div className="modalCheck">
                        <FiCheck />
                      </div>
                    )}

                  </button>
                );
              })
            )}

          </div>
        )}

      </SelectModal>

      <style jsx>{styles}</style>
    </>
  );
}

// =========================================================
// SETTING ROW
// =========================================================

function SettingRow({
  icon,
  title,
  description,
  value,
  onChange,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  color: string;
}) {
  return (
    <div className="settingRow">

      <div className="settingLeft">

        <div
          className="settingIcon"
          style={{
            color,
            backgroundColor: `${color}12`,
          }}
        >
          {icon}
        </div>

        <div className="settingText">

          <span className="settingTitle">
            {title}
          </span>

          <span className="settingDescription">
            {description}
          </span>

        </div>

      </div>

      <Switch
        value={value}
        onChange={onChange}
      />

    </div>
  );
}

// =========================================================
// SUMMARY ITEM
// =========================================================

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="summaryItem">

      <span className="summaryLabel">
        {label}
      </span>

      <span
        className={
          value === 'Not specified' ||
          value === 'Not selected' ||
          value === 'Not assigned'
            ? 'summaryValue muted'
            : 'summaryValue'
        }
      >
        {value}
      </span>

    </div>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = `
  * {
    box-sizing: border-box;
  }

  .positionPage {
    min-height: 100vh;

    background:
      radial-gradient(
        circle at 0% 0%,
        rgba(123, 47, 190, 0.045),
        transparent 30%
      ),
      radial-gradient(
        circle at 100% 10%,
        rgba(0, 180, 219, 0.035),
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

    padding-bottom: 105px;
  }

  /* =======================================================
     HEADER
  ======================================================= */

  .pageHeader {
    position: relative;

    background: rgba(255, 255, 255, 0.96);

    border-bottom: 1px solid #e7ebf1;

    box-shadow:
      0 2px 12px rgba(15, 23, 42, 0.035);

    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  .headerInner {
    width: min(1200px, calc(100% - 48px));

    min-height: 112px;

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

    background:
      linear-gradient(
        90deg,
        #00b4db,
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
      background 0.18s ease,
      color 0.18s ease,
      transform 0.18s ease;
  }

  .backButton svg {
    width: 19px;
    height: 19px;
  }

  .backButton:hover {
    color: #7b2fbe;
    background: #f5effb;
    transform: translateX(-2px);
  }

  .headerIcon {
    width: 54px;
    height: 54px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 14px;

    background: #f1eafe;
    color: #7b2fbe;

    border: 1px solid #e5d8f5;
  }

  .headerIcon svg {
    width: 25px;
    height: 25px;
  }

  .headerText {
    min-width: 0;
  }

  .breadcrumb {
    display: flex;
    align-items: center;

    gap: 5px;

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
    line-height: 1.2;

    font-weight: 750;

    letter-spacing: -0.5px;
  }

  .headerText p {
    margin: 4px 0 0;

    color: #64748b;

    font-size: 12px;
    font-weight: 500;
  }

  /* =======================================================
     CONTENT
  ======================================================= */

  .pageContent {
    width: min(1200px, calc(100% - 48px));

    margin: 0 auto;

    padding: 32px 0 35px;
  }

  .formLayout {
    display: grid;

    grid-template-columns:
      minmax(0, 1fr)
      330px;

    gap: 22px;

    align-items: start;
  }

  .mainColumn {
    min-width: 0;

    display: flex;
    flex-direction: column;

    gap: 20px;
  }

  /* =======================================================
     FORM SECTION
  ======================================================= */

  .formSection {
    border: 1px solid #e4e9f0;
    border-radius: 16px;

    background: #ffffff;

    overflow: hidden;

    box-shadow:
      0 2px 6px rgba(15, 23, 42, 0.025);
  }

  .sectionHeader {
    display: flex;
    align-items: flex-start;

    gap: 13px;

    padding: 20px 22px;

    border-bottom: 1px solid #edf0f4;
  }

  .sectionIcon {
    width: 39px;
    height: 39px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;
  }

  .sectionIcon svg {
    width: 18px;
    height: 18px;
  }

  .sectionIcon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .sectionIcon.purple {
    background: #f5effb;
    color: #7b2fbe;
  }

  .sectionHeader h2 {
    margin: 0;

    color: #1e293b;

    font-size: 16px;
    line-height: 1.3;

    font-weight: 700;
  }

  .sectionHeader p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 11px;
    line-height: 1.45;

    font-weight: 500;
  }

  .sectionBody {
    padding: 22px;
  }

  /* =======================================================
     FIELDS
  ======================================================= */

  .field {
    margin-bottom: 22px;
  }

  .field:last-child {
    margin-bottom: 0;
  }

  .field label,
  .labelRow label {
    display: block;

    margin-bottom: 7px;

    color: #334155;

    font-size: 12px;
    font-weight: 650;
  }

  .required {
    margin-left: 3px;
    color: #ef4444;
  }

  .optionalLabel {
    color: #94a3b8;

    font-size: 10px;
    font-weight: 600;
  }

  .labelRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .labelRow label {
    margin-bottom: 7px;
  }

  /* =======================================================
     TEXT INPUT
  ======================================================= */

  .inputWrapper {
    height: 48px;

    display: flex;
    align-items: center;

    gap: 10px;

    padding: 0 13px;

    border: 1px solid #dfe5ed;
    border-radius: 10px;

    background: #ffffff;

    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease;
  }

  .inputWrapper > svg {
    width: 17px;
    height: 17px;

    flex-shrink: 0;

    color: #94a3b8;
  }

  .inputWrapper:focus-within {
    border-color: #8b5cf6;

    box-shadow:
      0 0 0 3px rgba(123, 47, 190, 0.08);
  }

  .inputWrapper.error {
    border-color: #ef4444;
  }

  .inputWrapper input {
    width: 100%;
    height: 100%;

    border: none;
    outline: none;

    background: transparent;

    color: #1e293b;

    font-size: 13px;
    font-weight: 500;
  }

  .inputWrapper input::placeholder {
    color: #b1bac8;
  }

  .fieldHint {
    margin: 6px 0 0;

    color: #94a3b8;

    font-size: 10px;
    line-height: 1.45;
  }

  .fieldError {
    margin-top: 6px;

    display: flex;
    align-items: center;

    gap: 5px;

    color: #ef4444;

    font-size: 10px;
    font-weight: 550;
  }

  .fieldError svg {
    width: 12px;
    height: 12px;
  }

  /* =======================================================
     SELECT
  ======================================================= */

  .selectField {
    width: 100%;
    min-height: 58px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    padding: 9px 12px;

    border: 1px solid #dfe5ed;
    border-radius: 10px;

    background: #ffffff;

    color: #1e293b;

    cursor: pointer;

    text-align: left;

    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease,
      background 0.18s ease;
  }

  .selectField:hover {
    border-color: #cbd5e1;
    background: #fcfdff;
  }

  .selectField.selected {
    border-color: #d9c6ef;
    background: #fdfbff;
  }

  .selectField.error {
    border-color: #ef4444;
  }

  .selectLeft {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 11px;
  }

  .selectIcon {
    width: 37px;
    height: 37px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;

    background: #eff6ff;
    color: #2563eb;
  }

  .selectIcon.green {
    background: #ecfdf5;
    color: #10b981;
  }

  .selectIcon svg {
    width: 16px;
    height: 16px;
  }

  .selectText {
    min-width: 0;

    display: flex;
    flex-direction: column;
  }

  .selectValue {
    overflow: hidden;

    color: #334155;

    font-size: 12px;
    line-height: 1.3;

    font-weight: 600;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .selectHint {
    margin-top: 3px;

    color: #a0aaba;

    font-size: 9px;
    font-weight: 500;
  }

  .selectArrow {
    width: 17px;
    height: 17px;

    flex-shrink: 0;

    color: #94a3b8;
  }

  .selectWithClear {
    position: relative;
  }

  .selectWithClear .selectField {
    padding-right: 45px;
  }

  .clearSelect {
    all: unset;

    position: absolute;

    top: 50%;
    right: 11px;

    width: 25px;
    height: 25px;

    transform: translateY(-50%);

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 7px;

    background: #f1f5f9;
    color: #64748b;

    cursor: pointer;
  }

  .clearSelect:hover {
    background: #fee2e2;
    color: #ef4444;
  }

  .clearSelect svg {
    width: 13px;
    height: 13px;
  }

  /* =======================================================
     SETTINGS
  ======================================================= */

  .settingsList {
    padding: 0 22px;
  }

  .settingRow {
    min-height: 83px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;

    border-bottom: 1px solid #edf0f4;
  }

  .settingRow:last-child {
    border-bottom: none;
  }

  .settingLeft {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 12px;
  }

  .settingIcon {
    width: 38px;
    height: 38px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;
  }

  .settingIcon svg {
    width: 17px;
    height: 17px;
  }

  .settingText {
    min-width: 0;

    display: flex;
    flex-direction: column;
  }

  .settingTitle {
    color: #334155;

    font-size: 12px;
    font-weight: 650;
  }

  .settingDescription {
    max-width: 470px;

    margin-top: 4px;

    color: #94a3b8;

    font-size: 10px;
    line-height: 1.45;

    font-weight: 500;
  }

  /* =======================================================
     SIDE COLUMN
  ======================================================= */

  .sideColumn {
    position: sticky;
    top: 130px;

    display: flex;
    flex-direction: column;

    gap: 16px;
  }

  .summaryCard {
    padding: 20px;

    border: 1px solid #e4e9f0;
    border-radius: 16px;

    background: #ffffff;

    box-shadow:
      0 2px 6px rgba(15, 23, 42, 0.025);
  }

  .summaryHeader {
    display: flex;
    align-items: center;

    gap: 11px;
  }

  .summaryIcon {
    width: 38px;
    height: 38px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;

    background: #f1eafe;
    color: #7b2fbe;
  }

  .summaryIcon svg {
    width: 18px;
    height: 18px;
  }

  .summaryHeader h3 {
    margin: 0;

    color: #1e293b;

    font-size: 14px;
    font-weight: 700;
  }

  .summaryHeader p {
    margin: 3px 0 0;

    color: #94a3b8;

    font-size: 9px;
    font-weight: 500;
  }

  .summaryDivider {
    height: 1px;

    margin: 17px 0;

    background: #edf0f4;
  }

  .summaryItem {
    display: flex;
    flex-direction: column;

    gap: 5px;

    margin-bottom: 14px;
  }

  .summaryItem:last-of-type {
    margin-bottom: 0;
  }

  .summaryLabel {
    color: #94a3b8;

    font-size: 9px;
    font-weight: 600;

    text-transform: uppercase;

    letter-spacing: 0.35px;
  }

  .summaryValue {
    overflow: hidden;

    color: #334155;

    font-size: 11px;
    line-height: 1.35;

    font-weight: 650;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .summaryValue.muted {
    color: #b1bac8;
    font-weight: 500;
  }

  .statusRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .statusLabel {
    color: #94a3b8;

    font-size: 10px;
    font-weight: 600;
  }

  .status {
    display: flex;
    align-items: center;

    gap: 5px;

    padding: 5px 8px;

    border-radius: 7px;

    font-size: 9px;
    font-weight: 700;
  }

  .status.active {
    background: #ecfdf5;
    color: #059669;
  }

  .status.inactive {
    background: #f1f5f9;
    color: #64748b;
  }

  .statusDot {
    width: 5px;
    height: 5px;

    border-radius: 50%;

    background: currentColor;
  }

  /* =======================================================
     INFO CARD
  ======================================================= */

  .infoCard {
    display: flex;
    align-items: flex-start;

    gap: 10px;

    padding: 15px;

    border: 1px solid #dbeafe;
    border-radius: 13px;

    background: #f8fbff;
  }

  .infoCardIcon {
    width: 28px;
    height: 28px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    background: #dbeafe;
    color: #2563eb;
  }

  .infoCardIcon svg {
    width: 14px;
    height: 14px;
  }

  .infoCard h3 {
    margin: 0;

    color: #1e3a8a;

    font-size: 11px;
    font-weight: 700;
  }

  .infoCard p {
    margin: 4px 0 0;

    color: #64748b;

    font-size: 9px;
    line-height: 1.55;
  }

  /* =======================================================
     ACTION BAR
  ======================================================= */

  .actionBar {
    position: fixed;

    right: 0;
    bottom: 0;
    left: 0;

    z-index: 40;

    border-top: 1px solid #e4e9f0;

    background: rgba(255, 255, 255, 0.96);

    box-shadow:
      0 -5px 18px rgba(15, 23, 42, 0.045);

    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .actionBarInner {
    width: min(1200px, calc(100% - 48px));

    min-height: 72px;

    margin: 0 auto;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;
  }

  .actionHint {
    display: flex;
    align-items: center;

    gap: 6px;

    color: #94a3b8;

    font-size: 10px;
    font-weight: 500;
  }

  .actionHint svg {
    width: 13px;
    height: 13px;
  }

  .actionHint strong {
    margin: 0 3px;

    color: #ef4444;
  }

  .actionButtons {
    display: flex;
    align-items: center;

    gap: 9px;
  }

  .cancelButton,
  .createButton {
    height: 40px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 7px;

    padding: 0 17px;

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

  .cancelButton:hover:not(:disabled) {
    background: #f8fafc;
    color: #334155;
  }

  .createButton {
    border: none;

    background:
      linear-gradient(
        135deg,
        #7b2fbe,
        #6530a8
      );

    color: #ffffff;

    box-shadow:
      0 5px 13px rgba(123, 47, 190, 0.22);
  }

  .createButton:hover:not(:disabled) {
    transform: translateY(-1px);

    box-shadow:
      0 8px 18px rgba(123, 47, 190, 0.28);
  }

  .cancelButton:disabled,
  .createButton:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .createButton svg,
  .cancelButton svg {
    width: 14px;
    height: 14px;
  }

  .buttonSpinner {
    animation: spin 0.8s linear infinite;
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

  .loadingSpinner {
    width: 40px;
    height: 40px;

    border: 3px solid #e8eaf0;
    border-top-color: #7b2fbe;

    border-radius: 50%;

    animation: spin 0.8s linear infinite;
  }

  .loadingCard h2 {
    margin: 20px 0 0;

    color: #1e293b;

    font-size: 18px;
    font-weight: 700;
  }

  .loadingCard p {
    margin: 7px 0 0;

    color: #94a3b8;

    font-size: 12px;
  }

  /* =======================================================
     MODAL CONTENT
  ======================================================= */

  .modalList {
    display: flex;
    flex-direction: column;
  }

  .modalItem {
    width: 100%;

    min-height: 58px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 12px;

    padding: 8px 10px;

    border: none;
    border-bottom: 1px solid #edf0f4;

    background: #ffffff;

    color: #334155;

    cursor: pointer;

    text-align: left;

    transition:
      background 0.16s ease;
  }

  .modalItem:hover {
    background: #f8fafc;
  }

  .modalItem.selected {
    background: #faf7fe;
  }

  .modalItemLeft {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 10px;
  }

  .modalItemIcon {
    width: 34px;
    height: 34px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;

    background: #eff6ff;
    color: #2563eb;
  }

  .modalItemIcon.green {
    background: #ecfdf5;
    color: #10b981;
  }

  .modalItemIcon svg {
    width: 16px;
    height: 16px;
  }

  .modalItemLeft > span {
    overflow: hidden;

    color: #334155;

    font-size: 12px;
    font-weight: 600;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .modalItemText {
    min-width: 0;

    display: flex;
    flex-direction: column;
  }

  .modalItemText span {
    overflow: hidden;

    color: #334155;

    font-size: 12px;
    font-weight: 600;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .modalItemText small {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 9px;
    font-weight: 500;
  }

  .modalCheck {
    width: 27px;
    height: 27px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    background: #f1eafe;
    color: #7b2fbe;
  }

  .modalCheck svg {
    width: 14px;
    height: 14px;
  }

  .modalEmpty {
    min-height: 180px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    gap: 9px;

    color: #94a3b8;

    font-size: 11px;
    font-weight: 550;
  }

  .modalEmpty svg {
    width: 25px;
    height: 25px;
  }

  /* =======================================================
     RESPONSIVE
  ======================================================= */

  @media (max-width: 1000px) {
    .formLayout {
      grid-template-columns: 1fr;
    }

    .sideColumn {
      position: static;

      display: grid;

      grid-template-columns:
        repeat(
          2,
          minmax(0, 1fr)
        );
    }
  }

  @media (max-width: 650px) {
    .headerInner,
    .pageContent,
    .actionBarInner {
      width: calc(100% - 28px);
    }

    .headerInner {
      min-height: 95px;
    }

    .headerIcon {
      width: 46px;
      height: 46px;
    }

    .headerText h1 {
      font-size: 22px;
    }

    .headerText p {
      font-size: 10px;
    }

    .breadcrumb {
      display: none;
    }

    .pageContent {
      padding-top: 20px;
    }

    .sectionHeader,
    .sectionBody {
      padding: 17px;
    }

    .settingsList {
      padding: 0 17px;
    }

    .settingRow {
      min-height: 78px;
    }

    .settingDescription {
      max-width: 230px;
    }

    .sideColumn {
      grid-template-columns: 1fr;
    }

    .actionBarInner {
      min-height: 67px;
    }

    .actionHint {
      display: none;
    }

    .actionButtons {
      width: 100%;
    }

    .cancelButton,
    .createButton {
      flex: 1;
    }
  }

  @media (max-width: 430px) {
    .backButton {
      width: 36px;
      height: 36px;
    }

    .headerIcon {
      width: 42px;
      height: 42px;
    }

    .headerIcon svg {
      width: 20px;
      height: 20px;
    }

    .headerText h1 {
      font-size: 20px;
    }

    .settingLeft {
      gap: 8px;
    }

    .settingIcon {
      width: 34px;
      height: 34px;
    }

    .settingDescription {
      max-width: 180px;
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