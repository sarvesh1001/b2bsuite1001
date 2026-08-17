import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createDepartment } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { Switch } from '../../../components/Switch';

import {
  FiArrowLeft,
  FiCheck,
  FiChevronRight,
  FiInfo,
  FiLayers,
  FiLoader,
  FiSave,
  FiToggleLeft,
} from 'react-icons/fi';

// =========================================================
// SCHEMA
// =========================================================

const schema = z.object({
  department_name: z
    .string()
    .trim()
    .min(1, 'Department name is required'),

  module_code: z
    .string()
    .trim()
    .optional(),

  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

// =========================================================
// COMPONENT
// =========================================================

export default function CreateDepartmentScreen() {
  const router = useRouter();

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(
    null
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),

    defaultValues: {
      department_name: '',
      module_code: '',
      is_active: true,
    },
  });

  // =======================================================
  // SUBMIT
  // =======================================================

  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId || !deviceId) {
      setSubmitError(
        'Your authentication session is incomplete. Please log in again.'
      );

      return;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      await createDepartment(
        companyId,
        deviceId,
        data,
        accessToken
      );

      router.back();
    } catch (error: any) {
      console.error(
        'Failed to create department:',
        error
      );

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to create the department. Please try again.';

      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <>
      <div className="page">

        {/* =================================================
            TOP HEADER
        ================================================= */}

        <header className="topHeader">
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
              <FiLayers />
            </div>

            <div className="headerText">
              <div className="breadcrumb">
                <span>Administration</span>
                <FiChevronRight />
                <span>Departments</span>
              </div>

              <h1>Create Department</h1>

              <p>
                Add a new department to your organization
              </p>
            </div>

          </div>

          <div className="accentLine" />
        </header>

        {/* =================================================
            MAIN
        ================================================= */}

        <main className="content">

          {/* Page introduction */}

          <div className="pageIntro">

            <div>
              <h2>Department Details</h2>

              <p>
                Enter the basic information for the new
                department.
              </p>
            </div>

            <div className="requiredBadge">
              <span>*</span>
              Required fields
            </div>

          </div>

          {/* =================================================
              FORM CARD
          ================================================= */}

          <form
            className="formCard"
            onSubmit={handleSubmit(onSubmit)}
          >

            {/* =================================================
                DEPARTMENT NAME
            ================================================= */}

            <div className="fieldGroup">

              <label
                htmlFor="department_name"
                className="fieldLabel"
              >
                Department Name
                <span className="required">*</span>
              </label>

              <p className="fieldHint">
                Enter the official name used to identify
                this department.
              </p>

              <Controller
                control={control}
                name="department_name"
                render={({
                  field: {
                    onChange,
                    onBlur,
                    value,
                  },
                }) => (
                  <div
                    className={`inputWrapper ${
                      errors.department_name
                        ? 'inputError'
                        : ''
                    }`}
                  >
                    <FiLayers className="inputIcon" />

                    <input
                      id="department_name"
                      type="text"
                      value={value}
                      onChange={(e) =>
                        onChange(e.target.value)
                      }
                      onBlur={onBlur}
                      placeholder="e.g. Human Resources"
                      autoComplete="off"
                    />
                  </div>
                )}
              />

              {errors.department_name && (
                <div className="errorMessage">
                  <FiInfo />
                  <span>
                    {errors.department_name.message}
                  </span>
                </div>
              )}

            </div>

            {/* =================================================
                MODULE CODE
            ================================================= */}

            <div className="fieldGroup">

              <label
                htmlFor="module_code"
                className="fieldLabel"
              >
                Module Code
                <span className="optional">
                  Optional
                </span>
              </label>

              <p className="fieldHint">
                A short internal code that can be used to
                associate this department with a module.
              </p>

              <Controller
                control={control}
                name="module_code"
                render={({
                  field: {
                    onChange,
                    onBlur,
                    value,
                  },
                }) => (
                  <div className="inputWrapper">

                    <FiToggleLeft className="inputIcon" />

                    <input
                      id="module_code"
                      type="text"
                      value={value || ''}
                      onChange={(e) =>
                        onChange(e.target.value)
                      }
                      onBlur={onBlur}
                      placeholder="e.g. HR, FINANCE, SALES"
                      autoComplete="off"
                    />

                  </div>
                )}
              />

              <div className="infoHint">
                <FiInfo />

                <span>
                  Use a short, unique code when your
                  organization uses module-based access.
                </span>
              </div>

            </div>

            {/* =================================================
                ACTIVE STATUS
            ================================================= */}

            <div className="statusSection">

              <div className="statusIcon">
                <FiCheck />
              </div>

              <div className="statusContent">

                <div className="statusTitle">
                  Active Department
                </div>

                <p>
                  Active departments can be used throughout
                  the organization. You can deactivate this
                  department later if needed.
                </p>

              </div>

              <Controller
                control={control}
                name="is_active"
                render={({
                  field: {
                    onChange,
                    value,
                  },
                }) => (
                  <div className="switchContainer">
                    <Switch
                      value={value}
                      onChange={onChange}
                    />

                    <span
                      className={
                        value
                          ? 'activeText'
                          : 'inactiveText'
                      }
                    >
                      {value ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                )}
              />

            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {submitError && (
              <div className="submitError">
                <div className="submitErrorIcon">
                  <FiInfo />
                </div>

                <div>
                  <strong>
                    Unable to create department
                  </strong>

                  <p>{submitError}</p>
                </div>
              </div>
            )}

            {/* =================================================
                FORM FOOTER
            ================================================= */}

            <div className="formFooter">

              <button
                type="button"
                className="cancelButton"
                disabled={loading}
                onClick={() => router.back()}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="createButton"
                disabled={loading}
              >

                {loading ? (
                  <>
                    <FiLoader className="loadingIcon" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FiSave />
                    Create Department
                  </>
                )}

              </button>

            </div>

          </form>

          {/* =================================================
              FOOTER HELP
          ================================================= */}

          <div className="helpBox">

            <div className="helpIcon">
              <FiInfo />
            </div>

            <div>
              <strong>Before you create the department</strong>

              <p>
                Make sure the department name is clear and
                recognizable. You can manage its employees,
                roles and permissions after creation.
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
        rgba(37, 99, 235, 0.055),
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
    position: relative;

    background: rgba(255,255,255,0.96);

    border-bottom: 1px solid #e7ebf1;

    box-shadow:
      0 2px 10px rgba(15,23,42,0.035);
  }

  .headerInner {
    width: min(1100px, calc(100% - 48px));

    min-height: 118px;

    margin: 0 auto;

    display: flex;
    align-items: center;

    gap: 16px;
  }

  .accentLine {
    position: absolute;

    left: 0;
    bottom: 0;

    width: 100%;
    height: 3px;

    background: #2563eb;
  }

  /* =======================================================
     BACK BUTTON
  ======================================================= */

  .backButton {
    all: unset;

    width: 42px;
    height: 42px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border: 1px solid #e1e6ee;
    border-radius: 11px;

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

  /* =======================================================
     HEADER ICON
  ======================================================= */

  .headerIcon {
    width: 58px;
    height: 58px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 15px;

    background: #eff6ff;

    border: 1px solid #dbeafe;

    color: #2563eb;
  }

  .headerIcon svg {
    width: 25px;
    height: 25px;
  }

  /* =======================================================
     HEADER TEXT
  ======================================================= */

  .headerText {
    min-width: 0;
  }

  .breadcrumb {
    display: flex;
    align-items: center;

    gap: 5px;

    margin-bottom: 5px;

    color: #94a3b8;

    font-size: 11px;
    font-weight: 650;
  }

  .breadcrumb svg {
    width: 13px;
    height: 13px;
  }

  .headerText h1 {
    margin: 0;

    color: #172033;

    font-size: 28px;
    line-height: 1.2;

    font-weight: 750;

    letter-spacing: -0.55px;
  }

  .headerText p {
    margin: 5px 0 0;

    color: #64748b;

    font-size: 13px;

    font-weight: 500;
  }

  /* =======================================================
     CONTENT
  ======================================================= */

  .content {
    width: min(850px, calc(100% - 48px));

    margin: 0 auto;

    padding: 38px 0 60px;
  }

  /* =======================================================
     PAGE INTRO
  ======================================================= */

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

    font-weight: 500;
  }

  .requiredBadge {
    padding: 7px 10px;

    border: 1px solid #e2e8f0;

    border-radius: 8px;

    background: #ffffff;

    color: #94a3b8;

    font-size: 10px;

    font-weight: 600;

    white-space: nowrap;
  }

  .requiredBadge span {
    margin-right: 4px;

    color: #ef4444;

    font-weight: 800;
  }

  /* =======================================================
     FORM CARD
  ======================================================= */

  .formCard {
    padding: 30px;

    border: 1px solid #e5eaf1;

    border-radius: 17px;

    background: #ffffff;

    box-shadow:
      0 5px 20px rgba(15,23,42,0.045);
  }

  /* =======================================================
     FIELD
  ======================================================= */

  .fieldGroup {
    padding-bottom: 25px;

    margin-bottom: 25px;

    border-bottom: 1px solid #eef1f5;
  }

  .fieldLabel {
    display: flex;
    align-items: center;

    gap: 5px;

    color: #334155;

    font-size: 13px;

    font-weight: 700;
  }

  .required {
    color: #ef4444;
  }

  .optional {
    margin-left: 4px;

    color: #94a3b8;

    font-size: 10px;

    font-weight: 550;
  }

  .fieldHint {
    margin: 5px 0 10px;

    color: #94a3b8;

    font-size: 11px;

    line-height: 1.5;

    font-weight: 500;
  }

  /* =======================================================
     INPUT
  ======================================================= */

  .inputWrapper {
    position: relative;

    display: flex;
    align-items: center;

    width: 100%;

    height: 47px;

    border: 1px solid #dce2ea;

    border-radius: 10px;

    background: #ffffff;

    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease,
      background 0.18s ease;
  }

  .inputWrapper:focus-within {
    border-color: #2563eb;

    background: #ffffff;

    box-shadow:
      0 0 0 3px rgba(37,99,235,0.09);
  }

  .inputWrapper.inputError {
    border-color: #ef4444;
  }

  .inputWrapper.inputError:focus-within {
    box-shadow:
      0 0 0 3px rgba(239,68,68,0.08);
  }

  .inputIcon {
    width: 18px;
    height: 18px;

    flex-shrink: 0;

    margin-left: 14px;

    color: #94a3b8;
  }

  .inputWrapper:focus-within .inputIcon {
    color: #2563eb;
  }

  .inputWrapper input {
    width: 100%;
    height: 100%;

    padding: 0 14px 0 10px;

    border: none;
    outline: none;

    background: transparent;

    color: #1e293b;

    font-family: inherit;

    font-size: 13px;

    font-weight: 500;
  }

  .inputWrapper input::placeholder {
    color: #c0c7d2;

    font-weight: 450;
  }

  /* =======================================================
     ERROR
  ======================================================= */

  .errorMessage {
    display: flex;
    align-items: center;

    gap: 5px;

    margin-top: 7px;

    color: #ef4444;

    font-size: 11px;

    font-weight: 550;
  }

  .errorMessage svg {
    width: 13px;
    height: 13px;
  }

  /* =======================================================
     INFO HINT
  ======================================================= */

  .infoHint {
    display: flex;
    align-items: flex-start;

    gap: 6px;

    margin-top: 8px;

    color: #94a3b8;

    font-size: 10px;

    line-height: 1.5;

    font-weight: 500;
  }

  .infoHint svg {
    width: 13px;
    height: 13px;

    flex-shrink: 0;

    margin-top: 1px;

    color: #94a3b8;
  }

  /* =======================================================
     STATUS
  ======================================================= */

  .statusSection {
    min-height: 82px;

    display: flex;
    align-items: center;

    gap: 13px;

    padding: 15px;

    border: 1px solid #e5eaf1;

    border-radius: 12px;

    background: #f8fafc;
  }

  .statusIcon {
    width: 39px;
    height: 39px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;

    background: #ecfdf5;

    color: #10b981;
  }

  .statusIcon svg {
    width: 18px;
    height: 18px;
  }

  .statusContent {
    flex: 1;

    min-width: 0;
  }

  .statusTitle {
    color: #334155;

    font-size: 12px;

    font-weight: 700;
  }

  .statusContent p {
    max-width: 500px;

    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 10px;

    line-height: 1.5;

    font-weight: 500;
  }

  .switchContainer {
    flex-shrink: 0;

    display: flex;
    align-items: center;

    gap: 8px;
  }

  .activeText,
  .inactiveText {
    min-width: 45px;

    font-size: 10px;

    font-weight: 700;
  }

  .activeText {
    color: #10b981;
  }

  .inactiveText {
    color: #94a3b8;
  }

  /* =======================================================
     SUBMIT ERROR
  ======================================================= */

  .submitError {
    display: flex;
    align-items: flex-start;

    gap: 11px;

    margin-top: 22px;

    padding: 13px;

    border: 1px solid #fecaca;

    border-radius: 11px;

    background: #fef2f2;

    color: #991b1b;
  }

  .submitErrorIcon {
    width: 30px;
    height: 30px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    background: #fee2e2;

    color: #ef4444;
  }

  .submitErrorIcon svg {
    width: 16px;
    height: 16px;
  }

  .submitError strong {
    display: block;

    color: #991b1b;

    font-size: 11px;

    font-weight: 700;
  }

  .submitError p {
    margin: 3px 0 0;

    color: #b91c1c;

    font-size: 10px;

    line-height: 1.5;
  }

  /* =======================================================
     FORM FOOTER
  ======================================================= */

  .formFooter {
    display: flex;
    justify-content: flex-end;

    gap: 10px;

    margin-top: 28px;

    padding-top: 23px;

    border-top: 1px solid #eef1f5;
  }

  .cancelButton,
  .createButton {
    min-height: 42px;

    padding: 0 17px;

    display: inline-flex;
    align-items: center;
    justify-content: center;

    gap: 7px;

    border-radius: 9px;

    font-family: inherit;

    font-size: 12px;

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

  .createButton {
    border: none;

    background:
      linear-gradient(
        135deg,
        #2563eb,
        #1d4ed8
      );

    color: #ffffff;

    box-shadow:
      0 5px 13px rgba(37,99,235,0.19);
  }

  .createButton:hover:not(:disabled) {
    transform: translateY(-1px);

    box-shadow:
      0 8px 17px rgba(37,99,235,0.25);
  }

  .cancelButton:disabled,
  .createButton:disabled {
    opacity: 0.6;

    cursor: not-allowed;
  }

  .createButton svg,
  .cancelButton svg {
    width: 15px;
    height: 15px;
  }

  .loadingIcon {
    animation: spin 0.8s linear infinite;
  }

  /* =======================================================
     HELP BOX
  ======================================================= */

  .helpBox {
    display: flex;
    align-items: flex-start;

    gap: 11px;

    margin-top: 16px;

    padding: 14px 15px;

    border: 1px solid #e5eaf1;

    border-radius: 12px;

    background: rgba(255,255,255,0.65);
  }

  .helpIcon {
    width: 30px;
    height: 30px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    background: #eff6ff;

    color: #2563eb;
  }

  .helpIcon svg {
    width: 15px;
    height: 15px;
  }

  .helpBox strong {
    display: block;

    color: #475569;

    font-size: 11px;

    font-weight: 700;
  }

  .helpBox p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 10px;

    line-height: 1.5;

    font-weight: 500;
  }

  /* =======================================================
     RESPONSIVE
  ======================================================= */

  @media (max-width: 650px) {

    .headerInner {
      width: calc(100% - 28px);

      min-height: 100px;
    }

    .headerIcon {
      width: 48px;
      height: 48px;

      border-radius: 13px;
    }

    .headerIcon svg {
      width: 21px;
      height: 21px;
    }

    .headerText h1 {
      font-size: 22px;
    }

    .breadcrumb {
      display: none;
    }

    .headerText p {
      font-size: 11px;
    }

    .content {
      width: calc(100% - 28px);

      padding-top: 27px;
    }

    .pageIntro {
      align-items: flex-start;
    }

    .requiredBadge {
      display: none;
    }

    .formCard {
      padding: 21px;
    }

    .statusSection {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .statusContent {
      flex-basis: calc(100% - 55px);
    }

    .switchContainer {
      width: 100%;

      justify-content: flex-end;

      padding-top: 5px;
    }

    .formFooter {
      flex-direction: column-reverse;
    }

    .cancelButton,
    .createButton {
      width: 100%;
    }
  }

  @media (max-width: 400px) {

    .backButton {
      width: 37px;
      height: 37px;
    }

    .headerIcon {
      display: none;
    }

    .formCard {
      padding: 18px;
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