import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  getRootDepartments,
  updateDepartment,
} from '@b2b/api-client';

import { useUserAuthStore } from '../../../store/userAuthStore';

import {
  FiArrowLeft,
  FiCheck,
  FiChevronRight,
  FiInfo,
  FiLoader,
  FiSave,
  FiSettings,
  FiX,
} from 'react-icons/fi';

// =========================================================
// FORM SCHEMA
// =========================================================

const schema = z.object({
  department_name: z
    .string()
    .min(1, 'Department name is required'),

  module_code: z
    .string()
    .optional()
    .nullable(),

  is_active: z
    .boolean()
    .optional(),
});

type FormData = z.infer<typeof schema>;

// =========================================================
// SWITCH
// =========================================================

const Switch: React.FC<{
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={`switch ${
        value ? 'switchActive' : 'switchInactive'
      } ${disabled ? 'switchDisabled' : ''}`}
    >
      <span
        className={`switchThumb ${
          value ? 'switchThumbActive' : ''
        }`}
      />
    </button>
  );
};

// =========================================================
// PAGE
// =========================================================

export default function EditDepartmentScreen() {
  const router = useRouter();

  const { departmentId } = router.query;

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(
    null
  );

  const [saveError, setSaveError] = useState<string | null>(
    null
  );

  // =======================================================
  // FORM
  // =======================================================

  const {
    control,
    handleSubmit,
    reset,
    formState: {
      errors,
      isDirty,
    },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      department_name: '',
      module_code: '',
      is_active: true,
    },
  });

  // =======================================================
  // FETCH DEPARTMENT
  // =======================================================

  useEffect(() => {
    if (
      !departmentId ||
      !accessToken ||
      !companyId ||
      !deviceId
    ) {
      return;
    }

    const fetchDepartment = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const res = await getRootDepartments(
          companyId,
          deviceId,
          accessToken
        );

        const dept = res.data?.find(
          (d) =>
            d.department_id === departmentId
        );

        if (!dept) {
          setLoadError(
            'The requested department could not be found.'
          );
          return;
        }

        reset({
          department_name:
            dept.department_name || '',

          module_code:
            dept.module_code || '',

          is_active:
            dept.is_active ?? true,
        });
      } catch (error: any) {
        console.error(
          'Failed to load department:',
          error
        );

        setLoadError(
          error?.message ||
            'Failed to load department information.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDepartment();
  }, [
    departmentId,
    accessToken,
    companyId,
    deviceId,
    reset,
  ]);

  // =======================================================
  // SUBMIT
  // =======================================================

  const onSubmit = async (data: FormData) => {
    if (
      !accessToken ||
      !companyId ||
      !deviceId ||
      !departmentId
    ) {
      setSaveError(
        'Missing authentication information. Please log in again.'
      );

      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      const payload = {
        ...data,
        module_code:
          data.module_code?.trim() || undefined,
      };

      await updateDepartment(
        companyId,
        deviceId,
        departmentId as string,
        payload,
        accessToken
      );

      router.back();
    } catch (error: any) {
      console.error(
        'Failed to update department:',
        error
      );

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to update department. Please try again.';

      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  // =======================================================
  // CANCEL
  // =======================================================

  const handleCancel = () => {
    if (isDirty && !saving) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );

      if (!confirmed) return;
    }

    router.back();
  };

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <>
        <div className="page loadingPage">
          <div className="loadingCard">
            <div className="loadingSpinner" />

            <h2>Loading department</h2>

            <p>
              Fetching department information...
            </p>
          </div>
        </div>

        <style jsx>{styles}</style>
      </>
    );
  }

  // =======================================================
  // LOAD ERROR
  // =======================================================

  if (loadError) {
    return (
      <>
        <div className="page">
          <div className="errorCard">

            <div className="errorIcon">
              <FiInfo />
            </div>

            <h2>Unable to load department</h2>

            <p>{loadError}</p>

            <button
              type="button"
              className="primaryButton"
              onClick={() => router.back()}
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

            <div className="brand">

              <div className="brandIcon">
                P
              </div>

              <div className="brandText">
                <span className="brandName">
                  Prayantra
                </span>

                <span className="brandSubtitle">
                  Business Management
                </span>
              </div>

            </div>

            <button
              type="button"
              className="headerBack"
              onClick={handleCancel}
            >
              <FiArrowLeft />
              Back
            </button>

          </div>
        </header>

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <main className="main">

          {/* Breadcrumb */}

          <div className="breadcrumb">

            <button
              type="button"
              onClick={() => router.back()}
            >
              Administration
            </button>

            <FiChevronRight />

            <span>Departments</span>

            <FiChevronRight />

            <strong>Edit Department</strong>

          </div>

          {/* =================================================
              PAGE TITLE
          ================================================= */}

          <section className="pageHeading">

            <div className="titleArea">

              <div className="titleIcon">
                <FiSettings />
              </div>

              <div>
                <h1>Edit Department</h1>

                <p>
                  Update the department information and
                  configuration.
                </p>
              </div>

            </div>

            <div
              className={`statusBadge ${
                control
                  ? ''
                  : ''
              }`}
            >
              <span className="statusDot" />
              Department
            </div>

          </section>

          {/* =================================================
              FORM CARD
          ================================================= */}

          <form
            className="formCard"
            onSubmit={handleSubmit(onSubmit)}
          >

            {/* =================================================
                CARD HEADER
            ================================================= */}

            <div className="formHeader">

              <div>
                <h2>Department Information</h2>

                <p>
                  Manage the basic information associated
                  with this department.
                </p>
              </div>

              <div className="formHeaderIcon">
                <FiSettings />
              </div>

            </div>

            <div className="formDivider" />

            {/* =================================================
                FORM BODY
            ================================================= */}

            <div className="formBody">

              {/* Department name */}

              <Controller
                control={control}
                name="department_name"
                render={({ field }) => (
                  <div className="field">

                    <label htmlFor="department_name">
                      Department Name
                      <span>*</span>
                    </label>

                    <p className="fieldHint">
                      The name employees will see for
                      this department.
                    </p>

                    <input
                      {...field}
                      id="department_name"
                      type="text"
                      placeholder="e.g. Human Resources"
                      className={`input ${
                        errors.department_name
                          ? 'inputError'
                          : ''
                      }`}
                      disabled={saving}
                    />

                    {errors.department_name && (
                      <div className="validationError">
                        <FiInfo />
                        <span>
                          {
                            errors
                              .department_name
                              .message
                          }
                        </span>
                      </div>
                    )}

                  </div>
                )}
              />

              {/* Module code */}

              <Controller
                control={control}
                name="module_code"
                render={({ field }) => (
                  <div className="field">

                    <label htmlFor="module_code">
                      Module Code
                      <span className="optional">
                        Optional
                      </span>
                    </label>

                    <p className="fieldHint">
                      An internal code used to associate
                      this department with a module.
                    </p>

                    <input
                      id="module_code"
                      type="text"
                      value={
                        field.value ?? ''
                      }
                      onChange={
                        field.onChange
                      }
                      onBlur={
                        field.onBlur
                      }
                      name={field.name}
                      ref={field.ref}
                      placeholder="e.g. HR, FIN, ADM"
                      className="input"
                      disabled={saving}
                    />

                    <div className="inputFooter">
                      <span>
                        Leave empty if no module code
                        is required.
                      </span>
                    </div>

                  </div>
                )}
              />

              {/* Active */}

              <Controller
                control={control}
                name="is_active"
                render={({
                  field: {
                    value,
                    onChange,
                  },
                }) => (
                  <div className="statusField">

                    <div className="statusInfo">

                      <div className="statusIcon">
                        <FiCheck />
                      </div>

                      <div>
                        <label>
                          Department Status
                        </label>

                        <p>
                          {value
                            ? 'This department is currently active and available.'
                            : 'This department is inactive and unavailable.'}
                        </p>
                      </div>

                    </div>

                    <div className="statusControl">

                      <span
                        className={
                          value
                            ? 'activeText'
                            : 'inactiveText'
                        }
                      >
                        {value
                          ? 'Active'
                          : 'Inactive'}
                      </span>

                      <Switch
                        value={
                          value ?? true
                        }
                        onChange={
                          onChange
                        }
                        disabled={saving}
                      />

                    </div>

                  </div>
                )}
              />

              {/* Save error */}

              {saveError && (
                <div className="saveError">

                  <div className="saveErrorIcon">
                    <FiInfo />
                  </div>

                  <div>
                    <strong>
                      Update failed
                    </strong>

                    <p>
                      {saveError}
                    </p>
                  </div>

                </div>
              )}

            </div>

            {/* =================================================
                FOOTER
            ================================================= */}

            <div className="formFooter">

              <div className="requiredNote">
                <span>*</span>
                Required field
              </div>

              <div className="footerActions">

                <button
                  type="button"
                  className="cancelButton"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <FiX />
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
                      Updating...
                    </>
                  ) : (
                    <>
                      <FiSave />
                      Update Department
                    </>
                  )}

                </button>

              </div>

            </div>

          </form>

          {/* =================================================
              SECURITY / INFO NOTE
          ================================================= */}

          <div className="infoNote">

            <div className="infoNoteIcon">
              <FiInfo />
            </div>

            <div>
              <strong>Department settings</strong>

              <p>
                Changes to department configuration may
                affect employee access and module
                availability.
              </p>
            </div>

          </div>

        </main>

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

  .page {
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

    padding-bottom: 60px;
  }

  /* =======================================================
     HEADER
  ======================================================= */

  .topHeader {
    position: sticky;
    top: 0;
    z-index: 50;

    background: rgba(255,255,255,0.94);

    border-bottom: 1px solid #e7ebf1;

    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);

    box-shadow:
      0 2px 10px rgba(15,23,42,0.035);
  }

  .headerInner {
    width: min(1200px, calc(100% - 48px));

    min-height: 70px;

    margin: 0 auto;

    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brandIcon {
    width: 39px;
    height: 39px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 11px;

    background:
      linear-gradient(
        135deg,
        #00b4db,
        #7b2fbe
      );

    color: white;

    font-size: 19px;
    font-weight: 800;

    box-shadow:
      0 5px 13px rgba(123,47,190,0.2);
  }

  .brandText {
    display: flex;
    flex-direction: column;
  }

  .brandName {
    color: #172033;

    font-size: 16px;
    line-height: 1.1;
    font-weight: 750;
  }

  .brandSubtitle {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 9px;
    font-weight: 600;
  }

  .headerBack {
    all: unset;

    display: flex;
    align-items: center;
    gap: 7px;

    padding: 8px 12px;

    border: 1px solid #e2e8f0;
    border-radius: 9px;

    background: white;

    color: #64748b;

    font-size: 12px;
    font-weight: 650;

    cursor: pointer;

    transition:
      color 0.18s ease,
      background 0.18s ease,
      border-color 0.18s ease,
      transform 0.18s ease;
  }

  .headerBack:hover {
    color: #7b2fbe;
    background: #f8f5ff;
    border-color: #ddd0f5;

    transform: translateX(-2px);
  }

  .headerBack svg {
    width: 16px;
    height: 16px;
  }

  /* =======================================================
     MAIN
  ======================================================= */

  .main {
    width: min(1000px, calc(100% - 48px));

    margin: 0 auto;

    padding-top: 30px;
  }

  /* =======================================================
     BREADCRUMB
  ======================================================= */

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 5px;

    color: #94a3b8;

    font-size: 11px;
    font-weight: 550;
  }

  .breadcrumb button {
    all: unset;

    color: #64748b;

    cursor: pointer;

    transition: color 0.15s ease;
  }

  .breadcrumb button:hover {
    color: #7b2fbe;
  }

  .breadcrumb svg {
    width: 13px;
    height: 13px;
  }

  .breadcrumb strong {
    color: #475569;

    font-weight: 650;
  }

  /* =======================================================
     PAGE HEADING
  ======================================================= */

  .pageHeading {
    margin-top: 25px;
    margin-bottom: 23px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;
  }

  .titleArea {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .titleIcon {
    width: 52px;
    height: 52px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border: 1px solid #ddd0f5;
    border-radius: 14px;

    background: #f3edff;

    color: #7b2fbe;
  }

  .titleIcon svg {
    width: 23px;
    height: 23px;
  }

  .titleArea h1 {
    margin: 0;

    color: #172033;

    font-size: 27px;
    line-height: 1.2;

    font-weight: 750;

    letter-spacing: -0.5px;
  }

  .titleArea p {
    margin: 5px 0 0;

    color: #64748b;

    font-size: 12px;
    line-height: 1.5;
  }

  .statusBadge {
    display: flex;
    align-items: center;
    gap: 7px;

    padding: 7px 11px;

    border: 1px solid #e2e8f0;
    border-radius: 8px;

    background: #ffffff;

    color: #64748b;

    font-size: 11px;
    font-weight: 650;
  }

  .statusDot {
    width: 7px;
    height: 7px;

    border-radius: 50%;

    background: #22c55e;
  }

  /* =======================================================
     FORM CARD
  ======================================================= */

  .formCard {
    overflow: hidden;

    border: 1px solid #e3e8ef;
    border-radius: 17px;

    background: #ffffff;

    box-shadow:
      0 7px 25px rgba(15,23,42,0.045);
  }

  .formHeader {
    min-height: 85px;

    padding: 20px 25px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;
  }

  .formHeader h2 {
    margin: 0;

    color: #1e293b;

    font-size: 16px;
    font-weight: 700;
  }

  .formHeader p {
    margin: 5px 0 0;

    color: #94a3b8;

    font-size: 11px;
    line-height: 1.5;
  }

  .formHeaderIcon {
    width: 37px;
    height: 37px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;

    background: #f8fafc;

    color: #94a3b8;
  }

  .formHeaderIcon svg {
    width: 17px;
    height: 17px;
  }

  .formDivider {
    height: 1px;

    background: #edf0f4;
  }

  /* =======================================================
     FORM BODY
  ======================================================= */

  .formBody {
    padding: 27px 25px 30px;
  }

  .field {
    margin-bottom: 27px;
  }

  .field:last-of-type {
    margin-bottom: 0;
  }

  .field label {
    display: flex;
    align-items: center;
    gap: 4px;

    color: #334155;

    font-size: 12px;
    font-weight: 700;
  }

  .field label > span:first-child {
    color: #ef4444;
  }

  .field .optional {
    margin-left: 5px;

    padding: 3px 6px;

    border-radius: 5px;

    background: #f1f5f9;

    color: #94a3b8;

    font-size: 9px;
    font-weight: 600;

    text-transform: uppercase;
    letter-spacing: 0.2px;
  }

  .fieldHint {
    margin: 5px 0 9px;

    color: #94a3b8;

    font-size: 10px;
    line-height: 1.4;
  }

  .input {
    width: 100%;
    height: 44px;

    padding: 0 13px;

    border: 1px solid #dce2ea;
    border-radius: 9px;

    outline: none;

    background: #ffffff;

    color: #1e293b;

    font-family: inherit;

    font-size: 13px;

    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease,
      background 0.18s ease;
  }

  .input::placeholder {
    color: #c0c8d4;
  }

  .input:hover {
    border-color: #cbd5e1;
  }

  .input:focus {
    border-color: #a98bd1;

    box-shadow:
      0 0 0 3px rgba(123,47,190,0.08);
  }

  .input:disabled {
    background: #f8fafc;
    color: #94a3b8;
    cursor: not-allowed;
  }

  .inputError {
    border-color: #ef4444;
  }

  .inputError:focus {
    border-color: #ef4444;

    box-shadow:
      0 0 0 3px rgba(239,68,68,0.08);
  }

  .validationError {
    margin-top: 7px;

    display: flex;
    align-items: center;
    gap: 5px;

    color: #dc2626;

    font-size: 10px;
    font-weight: 550;
  }

  .validationError svg {
    width: 13px;
    height: 13px;
  }

  .inputFooter {
    margin-top: 6px;

    color: #a0a9b7;

    font-size: 9px;
  }

  /* =======================================================
     STATUS
  ======================================================= */

  .statusField {
    min-height: 78px;

    margin-top: 3px;

    padding: 15px 16px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;

    border: 1px solid #e5eaf1;
    border-radius: 11px;

    background: #fafbfd;
  }

  .statusInfo {
    display: flex;
    align-items: center;
    gap: 11px;

    min-width: 0;
  }

  .statusIcon {
    width: 36px;
    height: 36px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;

    background: #ecfdf5;

    color: #16a34a;
  }

  .statusIcon svg {
    width: 17px;
    height: 17px;
  }

  .statusInfo label {
    display: block;

    color: #334155;

    font-size: 11px;
    font-weight: 700;
  }

  .statusInfo p {
    margin: 3px 0 0;

    color: #94a3b8;

    font-size: 9px;
    line-height: 1.4;
  }

  .statusControl {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .activeText,
  .inactiveText {
    font-size: 10px;
    font-weight: 700;
  }

  .activeText {
    color: #16a34a;
  }

  .inactiveText {
    color: #94a3b8;
  }

  /* =======================================================
     SWITCH
  ======================================================= */

  .switch {
    position: relative;

    width: 43px;
    height: 24px;

    flex-shrink: 0;

    padding: 0;

    border: none;
    border-radius: 999px;

    cursor: pointer;

    transition:
      background 0.2s ease;
  }

  .switchActive {
    background: #7b2fbe;
  }

  .switchInactive {
    background: #cbd5e1;
  }

  .switchThumb {
    position: absolute;

    top: 4px;
    left: 4px;

    width: 16px;
    height: 16px;

    border-radius: 50%;

    background: white;

    box-shadow:
      0 1px 3px rgba(15,23,42,0.2);

    transition:
      transform 0.2s ease;
  }

  .switchThumbActive {
    transform: translateX(19px);
  }

  .switchDisabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  /* =======================================================
     SAVE ERROR
  ======================================================= */

  .saveError {
    margin-top: 22px;

    padding: 12px 14px;

    display: flex;
    align-items: flex-start;
    gap: 10px;

    border: 1px solid #fecaca;
    border-radius: 10px;

    background: #fef2f2;
  }

  .saveErrorIcon {
    width: 27px;
    height: 27px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 7px;

    background: #fee2e2;

    color: #dc2626;
  }

  .saveErrorIcon svg {
    width: 14px;
    height: 14px;
  }

  .saveError strong {
    color: #991b1b;

    font-size: 10px;
    font-weight: 700;
  }

  .saveError p {
    margin: 3px 0 0;

    color: #b91c1c;

    font-size: 10px;
    line-height: 1.45;
  }

  /* =======================================================
     FOOTER
  ======================================================= */

  .formFooter {
    min-height: 78px;

    padding: 16px 25px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;

    border-top: 1px solid #edf0f4;

    background: #fafbfd;
  }

  .requiredNote {
    color: #94a3b8;

    font-size: 9px;
    font-weight: 550;
  }

  .requiredNote span {
    color: #ef4444;
    margin-right: 3px;
  }

  .footerActions {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .cancelButton,
  .saveButton {
    height: 38px;

    padding: 0 14px;

    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;

    border-radius: 8px;

    font-family: inherit;

    font-size: 11px;
    font-weight: 650;

    cursor: pointer;

    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      background 0.18s ease;
  }

  .cancelButton {
    border: 1px solid #dce2ea;

    background: #ffffff;

    color: #64748b;
  }

  .cancelButton:hover:not(:disabled) {
    background: #f8fafc;
    color: #334155;

    transform: translateY(-1px);
  }

  .saveButton {
    border: none;

    background:
      linear-gradient(
        135deg,
        #7b2fbe,
        #6730a5
      );

    color: #ffffff;

    box-shadow:
      0 5px 12px rgba(123,47,190,0.17);
  }

  .saveButton:hover:not(:disabled) {
    transform: translateY(-1px);

    box-shadow:
      0 7px 17px rgba(123,47,190,0.25);
  }

  .saveButton:disabled,
  .cancelButton:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }

  .cancelButton svg,
  .saveButton svg {
    width: 14px;
    height: 14px;
  }

  .buttonSpinner {
    animation: spin 0.8s linear infinite;
  }

  /* =======================================================
     INFO NOTE
  ======================================================= */

  .infoNote {
    margin-top: 15px;

    padding: 13px 15px;

    display: flex;
    align-items: flex-start;
    gap: 10px;

    border: 1px solid #e5eaf1;
    border-radius: 11px;

    background: rgba(255,255,255,0.65);
  }

  .infoNoteIcon {
    width: 27px;
    height: 27px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 7px;

    background: #eff6ff;

    color: #2563eb;
  }

  .infoNoteIcon svg {
    width: 14px;
    height: 14px;
  }

  .infoNote strong {
    color: #475569;

    font-size: 10px;
    font-weight: 700;
  }

  .infoNote p {
    margin: 3px 0 0;

    color: #94a3b8;

    font-size: 9px;
    line-height: 1.45;
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
    width: min(370px, calc(100% - 40px));

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
    width: 39px;
    height: 39px;

    border: 3px solid #e8eaf0;
    border-top-color: #7b2fbe;

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
     ERROR
  ======================================================= */

  .errorCard {
    width: min(430px, calc(100% - 40px));

    margin: 100px auto;

    padding: 40px 30px;

    display: flex;
    flex-direction: column;
    align-items: center;

    border: 1px solid #e5eaf1;
    border-radius: 18px;

    background: #ffffff;

    box-shadow:
      0 12px 35px rgba(15,23,42,0.06);

    text-align: center;
  }

  .errorIcon {
    width: 62px;
    height: 62px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 16px;

    background: #fef2f2;

    color: #ef4444;
  }

  .errorIcon svg {
    width: 28px;
    height: 28px;
  }

  .errorCard h2 {
    margin: 18px 0 0;

    color: #1e293b;

    font-size: 20px;
    font-weight: 700;
  }

  .errorCard p {
    margin: 7px 0 0;

    color: #64748b;

    font-size: 12px;
    line-height: 1.6;
  }

  .primaryButton {
    margin-top: 22px;

    height: 38px;

    padding: 0 15px;

    display: flex;
    align-items: center;
    gap: 7px;

    border: none;
    border-radius: 8px;

    background: #7b2fbe;
    color: #ffffff;

    font-family: inherit;

    font-size: 11px;
    font-weight: 650;

    cursor: pointer;
  }

  .primaryButton svg {
    width: 15px;
    height: 15px;
  }

  /* =======================================================
     RESPONSIVE
  ======================================================= */

  @media (max-width: 700px) {
    .headerInner,
    .main {
      width: calc(100% - 28px);
    }

    .main {
      padding-top: 23px;
    }

    .pageHeading {
      align-items: flex-start;
      flex-direction: column;
    }

    .statusBadge {
      display: none;
    }

    .formHeader,
    .formBody,
    .formFooter {
      padding-left: 18px;
      padding-right: 18px;
    }

    .formFooter {
      align-items: flex-start;
      flex-direction: column;
    }

    .footerActions {
      width: 100%;
    }

    .cancelButton,
    .saveButton {
      flex: 1;
    }
  }

  @media (max-width: 480px) {
    .brandSubtitle {
      display: none;
    }

    .headerBack {
      padding: 8px;
    }

    .headerBack {
      font-size: 0;
    }

    .headerBack svg {
      width: 18px;
      height: 18px;
    }

    .titleArea {
      align-items: flex-start;
    }

    .titleIcon {
      width: 46px;
      height: 46px;
    }

    .titleArea h1 {
      font-size: 23px;
    }

    .titleArea p {
      font-size: 11px;
    }

    .statusField {
      align-items: flex-start;
      flex-direction: column;
    }

    .statusControl {
      width: 100%;

      justify-content: space-between;
    }

    .breadcrumb {
      overflow: hidden;
      white-space: nowrap;
    }

    .breadcrumb strong {
      overflow: hidden;
      text-overflow: ellipsis;
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