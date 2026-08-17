import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  FiArrowLeft,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiCode,
  FiFileText,
  FiInfo,
  FiMapPin,
  FiSettings,
  FiX,
  FiSave,
  FiLoader,
} from 'react-icons/fi';

// ✅ Use axiosInstance directly
import { axiosInstance } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';

// =========================================================
// TIMEZONES
// =========================================================

const TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
  'Asia/Singapore',
  'Asia/Dubai',
];

// =========================================================
// VALIDATION
// =========================================================

const schema = z.object({
  work_center_code: z
    .string()
    .trim()
    .min(1, 'Work center code is required'),

  name: z
    .string()
    .trim()
    .min(1, 'Work center name is required'),

  description: z.string().optional(),

  timezone: z
    .string()
    .min(1, 'Timezone is required'),

  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

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
      onClick={() => onChange(!value)}
      className={`statusSwitch ${value ? 'active' : ''}`}
    >
      <span className="switchThumb" />
    </button>
  );
};

// =========================================================
// INPUT FIELD
// =========================================================

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({
  label,
  required,
  error,
  hint,
  icon,
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
        </label>

        {hint && (
          <span className="fieldHint">
            {hint}
          </span>
        )}
      </div>

      {children}

      {error && (
        <div className="fieldError">
          <FiInfo />
          {error}
        </div>
      )}
    </div>
  );
};

// =========================================================
// SCREEN
// =========================================================

export default function CreateWorkCenterScreen() {
  const router = useRouter();

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  const [modalOpen, setModalOpen] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<FormData>({
    resolver: zodResolver(schema),

    defaultValues: {
      work_center_code: '',
      name: '',
      description: '',
      timezone: 'Asia/Kolkata',
      is_active: true,
    },
  });

  const selectedTimezone = watch('timezone');
  const isActive = watch('is_active');

  // =======================================================
  // SUBMIT – using axiosInstance directly
  // =======================================================

  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId || !deviceId) {
      alert('Missing authentication details');
      return;
    }

    try {
      // ✅ Use axiosInstance with correct headers
      const response = await axiosInstance.post(
        `/companies/${companyId}/attendance/work-centers`,
        data,
        {
          headers: {
            'X-Company-ID': companyId,
            'X-Device-ID': deviceId,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log('✅ Work center created:', response.data);
      alert('Work center created successfully');
      router.back();
    } catch (error: any) {
      console.error('❌ Creation failed:', error);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'Creation failed';
      alert(msg);
    }
  };

  // =======================================================
  // RENDER
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
              <FiSettings />
            </div>

            <div className="headerText">

              <div className="breadcrumb">
                <span>Administration</span>
                <FiChevronDown />
                <span>Work Centers</span>
              </div>

              <h1>
                Create Work Center
              </h1>

              <p>
                Add a new work center to your organization
              </p>

            </div>

          </div>

          <div className="headerAccent" />

        </header>

        {/* =================================================
            MAIN
        ================================================= */}

        <main className="main">

          {/* Page intro */}

          <div className="pageIntro">

            <div>
              <h2>
                Work Center Details
              </h2>

              <p>
                Enter the basic information and operating
                settings for this work center.
              </p>
            </div>

            <div className="requiredLegend">
              <span>*</span>
              Required fields
            </div>

          </div>

          {/* =================================================
              FORM
          ================================================= */}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="form"
          >

            {/* =================================================
                BASIC INFORMATION
            ================================================= */}

            <section className="formSection">

              <div className="sectionHeader">

                <div className="sectionIcon blue">
                  <FiFileText />
                </div>

                <div>
                  <h3>
                    Basic Information
                  </h3>

                  <p>
                    Identify your work center
                  </p>
                </div>

              </div>

              <div className="sectionBody">

                <div className="twoColumn">

                  {/* Work center code */}

                  <Controller
                    control={control}
                    name="work_center_code"
                    render={({ field }) => (
                      <Field
                        label="Work Center Code"
                        required
                        error={
                          errors.work_center_code?.message
                        }
                        hint="Unique identifier"
                        icon={<FiCode />}
                      >
                        <input
                          {...field}
                          type="text"
                          placeholder="e.g. WC-001"
                          autoComplete="off"
                          className={`input ${
                            errors.work_center_code
                              ? 'inputError'
                              : ''
                          }`}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value.toUpperCase()
                            )
                          }
                        />
                      </Field>
                    )}
                  />

                  {/* Name */}

                  <Controller
                    control={control}
                    name="name"
                    render={({ field }) => (
                      <Field
                        label="Work Center Name"
                        required
                        error={
                          errors.name?.message
                        }
                        hint="Display name"
                        icon={<FiSettings />}
                      >
                        <input
                          {...field}
                          type="text"
                          placeholder="e.g. Assembly Line 1"
                          className={`input ${
                            errors.name
                              ? 'inputError'
                              : ''
                          }`}
                        />
                      </Field>
                    )}
                  />

                </div>

                {/* Description */}

                <Controller
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <Field
                      label="Description"
                      hint="Optional"
                      icon={<FiFileText />}
                    >
                      <textarea
                        {...field}
                        rows={4}
                        placeholder="Describe the purpose, function or responsibilities of this work center..."
                        className="textarea"
                      />
                    </Field>
                  )}
                />

              </div>

            </section>

            {/* =================================================
                OPERATING SETTINGS
            ================================================= */}

            <section className="formSection">

              <div className="sectionHeader">

                <div className="sectionIcon purple">
                  <FiClock />
                </div>

                <div>
                  <h3>
                    Operating Settings
                  </h3>

                  <p>
                    Configure location and availability
                  </p>
                </div>

              </div>

              <div className="sectionBody">

                {/* Timezone */}

                <Field
                  label="Timezone"
                  required
                  error={
                    errors.timezone?.message
                  }
                  hint="Used for schedules and operations"
                  icon={<FiMapPin />}
                >
                  <button
                    type="button"
                    className={`selectButton ${
                      errors.timezone
                        ? 'inputError'
                        : ''
                    }`}
                    onClick={() =>
                      setModalOpen(true)
                    }
                  >
                    <span>
                      {selectedTimezone ||
                        'Select timezone'}
                    </span>

                    <FiChevronDown />
                  </button>
                </Field>

                {/* Active status */}

                <Controller
                  control={control}
                  name="is_active"
                  render={({
                    field: {
                      value,
                      onChange,
                    },
                  }) => (
                    <div className="statusCard">

                      <div className="statusLeft">

                        <div
                          className={`statusIcon ${
                            value
                              ? 'statusActive'
                              : 'statusInactive'
                          }`}
                        >
                          {value ? (
                            <FiCheck />
                          ) : (
                            <FiX />
                          )}
                        </div>

                        <div>
                          <span className="statusTitle">
                            Work Center Status
                          </span>

                          <span className="statusDescription">
                            {value
                              ? 'This work center is active and available for use.'
                              : 'This work center is inactive and unavailable.'}
                          </span>
                        </div>

                      </div>

                      <div className="statusRight">

                        <span
                          className={`statusLabel ${
                            value
                              ? 'activeLabel'
                              : 'inactiveLabel'
                          }`}
                        >
                          {value
                            ? 'Active'
                            : 'Inactive'}
                        </span>

                        <Switch
                          value={value}
                          onChange={onChange}
                        />

                      </div>

                    </div>
                  )}
                />

              </div>

            </section>

            {/* =================================================
                ACTIONS
            ================================================= */}

            <div className="formActions">

              <button
                type="button"
                className="cancelButton"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="createButton"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <FiLoader className="buttonSpinner" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FiSave />
                    Create Work Center
                  </>
                )}
              </button>

            </div>

          </form>

        </main>

      </div>

      {/* =====================================================
          TIMEZONE MODAL
      ===================================================== */}

      {modalOpen && (
        <div
          className="modalOverlay"
          onClick={() =>
            setModalOpen(false)
          }
        >

          <div
            className="timezoneModal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* Modal header */}

            <div className="modalHeader">

              <div className="modalTitleGroup">

                <div className="modalIcon">
                  <FiClock />
                </div>

                <div>
                  <h3>
                    Select Timezone
                  </h3>

                  <p>
                    Choose the timezone used by this
                    work center
                  </p>
                </div>

              </div>

              <button
                type="button"
                className="modalClose"
                onClick={() =>
                  setModalOpen(false)
                }
              >
                <FiX />
              </button>

            </div>

            {/* Current selection */}

            <div className="currentTimezone">

              <span>
                Current timezone
              </span>

              <strong>
                {selectedTimezone}
              </strong>

            </div>

            {/* Timezone list */}

            <div className="timezoneList">

              {TIMEZONES.map((tz) => {
                const selected =
                  selectedTimezone === tz;

                return (
                  <button
                    type="button"
                    key={tz}
                    className={`timezoneOption ${
                      selected
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => {
                      setValue(
                        'timezone',
                        tz,
                        {
                          shouldValidate: true,
                        }
                      );

                      setModalOpen(false);
                    }}
                  >

                    <div className="timezoneOptionLeft">

                      <div
                        className={`timezoneRadio ${
                          selected
                            ? 'radioSelected'
                            : ''
                        }`}
                      >
                        {selected && (
                          <FiCheck />
                        )}
                      </div>

                      <span>
                        {tz}
                      </span>

                    </div>

                    {selected && (
                      <span className="selectedText">
                        Selected
                      </span>
                    )}

                  </button>
                );
              })}

            </div>

          </div>

        </div>
      )}

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

  .pageHeader {
    position: relative;

    background: rgba(255,255,255,0.96);

    border-bottom: 1px solid #e5eaf1;

    box-shadow:
      0 2px 12px rgba(15,23,42,0.035);
  }

  .headerInner {
    width: min(1050px, calc(100% - 48px));

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

    width: 41px;
    height: 41px;

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
      background 0.18s ease,
      color 0.18s ease,
      transform 0.18s ease;
  }

  .backButton svg {
    width: 19px;
    height: 19px;
  }

  .backButton:hover {
    color: #2563eb;
    background: #eff6ff;

    transform: translateX(-2px);
  }

  .headerIcon {
    width: 56px;
    height: 56px;

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
    width: 26px;
    height: 26px;
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

    font-size: 11px;
    font-weight: 600;
  }

  .breadcrumb svg {
    width: 12px;
    height: 12px;

    transform: rotate(-90deg);
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
    margin: 5px 0 0;

    color: #64748b;

    font-size: 12px;
    font-weight: 500;
  }

  /* =======================================================
     MAIN
  ======================================================= */

  .main {
    width: min(1050px, calc(100% - 48px));

    margin: 0 auto;

    padding: 35px 0 50px;
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
    line-height: 1.3;

    font-weight: 700;
  }

  .pageIntro p {
    margin: 5px 0 0;

    color: #94a3b8;

    font-size: 12px;
    line-height: 1.5;

    font-weight: 500;
  }

  .requiredLegend {
    color: #94a3b8;

    font-size: 11px;
    font-weight: 500;
  }

  .requiredLegend span {
    margin-right: 3px;

    color: #ef4444;
    font-weight: 700;
  }

  /* =======================================================
     FORM SECTION
  ======================================================= */

  .form {
    display: flex;
    flex-direction: column;
    gap: 17px;
  }

  .formSection {
    overflow: hidden;

    border: 1px solid #e5eaf1;
    border-radius: 16px;

    background: #ffffff;

    box-shadow:
      0 2px 5px rgba(15,23,42,0.025);
  }

  .sectionHeader {
    display: flex;
    align-items: center;

    gap: 12px;

    padding: 20px 23px;

    border-bottom: 1px solid #edf0f4;

    background:
      linear-gradient(
        to right,
        #ffffff,
        #fbfcfe
      );
  }

  .sectionIcon {
    width: 40px;
    height: 40px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 11px;
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
    background: #f5f3ff;
    color: #7c3aed;
  }

  .sectionHeader h3 {
    margin: 0;

    color: #1e293b;

    font-size: 15px;
    line-height: 1.3;

    font-weight: 700;
  }

  .sectionHeader p {
    margin: 3px 0 0;

    color: #94a3b8;

    font-size: 11px;
    font-weight: 500;
  }

  .sectionBody {
    padding: 24px;
  }

  /* =======================================================
     FIELDS
  ======================================================= */

  .twoColumn {
    display: grid;

    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );

    gap: 20px;
  }

  .field {
    min-width: 0;
  }

  .field + .field {
    margin-top: 0;
  }

  .twoColumn + .field {
    margin-top: 20px;
  }

  .fieldLabelRow {
    min-height: 18px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 10px;

    margin-bottom: 7px;
  }

  .fieldLabel {
    display: flex;
    align-items: center;
    gap: 5px;

    color: #334155;

    font-size: 12px;
    line-height: 1.3;

    font-weight: 650;
  }

  .fieldLabelIcon {
    display: flex;

    color: #94a3b8;
  }

  .fieldLabelIcon svg {
    width: 13px;
    height: 13px;
  }

  .requiredMark {
    color: #ef4444;
    font-weight: 700;
  }

  .fieldHint {
    color: #a0aabd;

    font-size: 10px;
    font-weight: 500;
  }

  .input,
  .textarea,
  .selectButton {
    width: 100%;

    border: 1px solid #dfe5ed;
    border-radius: 10px;

    background: #ffffff;

    color: #172033;

    font-family: inherit;

    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease,
      background 0.18s ease;
  }

  .input {
    height: 45px;

    padding: 0 13px;

    font-size: 13px;
    font-weight: 500;
  }

  .textarea {
    min-height: 100px;

    padding: 12px 13px;

    resize: vertical;

    font-size: 13px;
    line-height: 1.5;
    font-weight: 500;
  }

  .input::placeholder,
  .textarea::placeholder {
    color: #b0b9c7;
  }

  .input:hover,
  .textarea:hover,
  .selectButton:hover {
    border-color: #cbd5e1;
  }

  .input:focus,
  .textarea:focus,
  .selectButton:focus {
    outline: none;

    border-color: #2563eb;

    box-shadow:
      0 0 0 3px rgba(37,99,235,0.09);
  }

  .inputError {
    border-color: #ef4444 !important;
  }

  .inputError:focus {
    box-shadow:
      0 0 0 3px rgba(239,68,68,0.09) !important;
  }

  .fieldError {
    display: flex;
    align-items: center;
    gap: 4px;

    margin-top: 6px;

    color: #dc2626;

    font-size: 10px;
    font-weight: 500;
  }

  .fieldError svg {
    width: 12px;
    height: 12px;
  }

  /* =======================================================
     SELECT
  ======================================================= */

  .selectButton {
    height: 45px;

    padding: 0 13px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    text-align: left;

    cursor: pointer;

    font-size: 13px;
    font-weight: 500;
  }

  .selectButton svg {
    width: 16px;
    height: 16px;

    color: #64748b;
  }

  /* =======================================================
     STATUS
  ======================================================= */

  .statusCard {
    margin-top: 23px;

    padding: 15px 16px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;

    border: 1px solid #e5eaf1;
    border-radius: 12px;

    background: #f9fafc;
  }

  .statusLeft {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 11px;
  }

  .statusIcon {
    width: 38px;
    height: 38px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;
  }

  .statusIcon svg {
    width: 17px;
    height: 17px;
  }

  .statusActive {
    background: #ecfdf5;
    color: #10b981;
  }

  .statusInactive {
    background: #f1f5f9;
    color: #64748b;
  }

  .statusLeft > div:last-child {
    min-width: 0;

    display: flex;
    flex-direction: column;
  }

  .statusTitle {
    color: #334155;

    font-size: 12px;
    font-weight: 700;
  }

  .statusDescription {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 10px;
    line-height: 1.4;

    font-weight: 500;
  }

  .statusRight {
    flex-shrink: 0;

    display: flex;
    align-items: center;

    gap: 10px;
  }

  .statusLabel {
    min-width: 48px;

    text-align: right;

    font-size: 11px;
    font-weight: 700;
  }

  .activeLabel {
    color: #059669;
  }

  .inactiveLabel {
    color: #64748b;
  }

  /* =======================================================
     SWITCH
  ======================================================= */

  .statusSwitch {
    all: unset;

    position: relative;

    width: 43px;
    height: 24px;

    flex-shrink: 0;

    border-radius: 999px;

    background: #cbd5e1;

    cursor: pointer;

    transition:
      background 0.2s ease;
  }

  .statusSwitch.active {
    background: #2563eb;
  }

  .switchThumb {
    position: absolute;

    top: 4px;
    left: 4px;

    width: 16px;
    height: 16px;

    border-radius: 50%;

    background: #ffffff;

    box-shadow:
      0 1px 3px rgba(15,23,42,0.2);

    transition:
      transform 0.2s ease;
  }

  .statusSwitch.active .switchThumb {
    transform: translateX(19px);
  }

  /* =======================================================
     ACTIONS
  ======================================================= */

  .formActions {
    display: flex;
    justify-content: flex-end;
    align-items: center;

    gap: 10px;

    padding-top: 4px;
  }

  .cancelButton,
  .createButton {
    min-height: 43px;

    padding: 0 17px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 7px;

    border-radius: 10px;

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
    border: 1px solid #dfe5ed;

    background: #ffffff;

    color: #475569;
  }

  .cancelButton:hover:not(:disabled) {
    background: #f8fafc;
    transform: translateY(-1px);
  }

  .createButton {
    min-width: 170px;

    border: none;

    background:
      linear-gradient(
        135deg,
        #2563eb,
        #1d4ed8
      );

    color: #ffffff;

    box-shadow:
      0 5px 13px rgba(37,99,235,0.18);
  }

  .createButton:hover:not(:disabled) {
    transform: translateY(-1px);

    box-shadow:
      0 8px 18px rgba(37,99,235,0.23);
  }

  .cancelButton:disabled,
  .createButton:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .createButton svg,
  .cancelButton svg {
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

    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .timezoneModal {
    width: min(480px, 100%);

    max-height: min(650px, calc(100vh - 40px));

    display: flex;
    flex-direction: column;

    overflow: hidden;

    border: 1px solid rgba(255,255,255,0.8);
    border-radius: 18px;

    background: #ffffff;

    box-shadow:
      0 25px 60px rgba(15,23,42,0.22);
  }

  .modalHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 15px;

    padding: 18px 20px;

    border-bottom: 1px solid #edf0f4;
  }

  .modalTitleGroup {
    display: flex;
    align-items: center;
    gap: 11px;

    min-width: 0;
  }

  .modalIcon {
    width: 40px;
    height: 40px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 11px;

    background: #eff6ff;
    color: #2563eb;
  }

  .modalIcon svg {
    width: 18px;
    height: 18px;
  }

  .modalHeader h3 {
    margin: 0;

    color: #1e293b;

    font-size: 15px;
    font-weight: 700;
  }

  .modalHeader p {
    margin: 3px 0 0;

    color: #94a3b8;

    font-size: 10px;
    font-weight: 500;
  }

  .modalClose {
    all: unset;

    width: 34px;
    height: 34px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;

    color: #64748b;

    cursor: pointer;

    transition:
      background 0.18s ease,
      color 0.18s ease;
  }

  .modalClose:hover {
    background: #f1f5f9;
    color: #1e293b;
  }

  .modalClose svg {
    width: 18px;
    height: 18px;
  }

  /* =======================================================
     CURRENT TIMEZONE
  ======================================================= */

  .currentTimezone {
    margin: 15px 18px 8px;

    padding: 12px 13px;

    display: flex;
    flex-direction: column;
    gap: 4px;

    border-radius: 10px;

    background: #f8fafc;
  }

  .currentTimezone span {
    color: #94a3b8;

    font-size: 9px;
    font-weight: 600;
  }

  .currentTimezone strong {
    color: #2563eb;

    font-size: 12px;
    font-weight: 700;
  }

  /* =======================================================
     TIMEZONE LIST
  ======================================================= */

  .timezoneList {
    overflow-y: auto;

    padding: 7px 10px 12px;
  }

  .timezoneOption {
    width: 100%;

    min-height: 48px;

    padding: 8px 9px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    border: 1px solid transparent;
    border-radius: 9px;

    background: transparent;

    color: #334155;

    cursor: pointer;

    font-family: inherit;

    text-align: left;

    transition:
      background 0.16s ease,
      border-color 0.16s ease;
  }

  .timezoneOption:hover {
    background: #f8fafc;
  }

  .timezoneOption.selected {
    border-color: #dbeafe;

    background: #eff6ff;
  }

  .timezoneOptionLeft {
    display: flex;
    align-items: center;
    gap: 10px;

    min-width: 0;
  }

  .timezoneOptionLeft > span {
    overflow: hidden;

    color: #334155;

    font-size: 12px;
    font-weight: 550;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .timezoneOption.selected
    .timezoneOptionLeft > span {
    color: #2563eb;
    font-weight: 700;
  }

  .timezoneRadio {
    width: 20px;
    height: 20px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border: 1.5px solid #cbd5e1;
    border-radius: 50%;

    background: #ffffff;
  }

  .timezoneRadio svg {
    width: 12px;
    height: 12px;
  }

  .radioSelected {
    border-color: #2563eb;

    background: #2563eb;

    color: #ffffff;
  }

  .selectedText {
    color: #2563eb;

    font-size: 9px;
    font-weight: 700;
  }

  /* =======================================================
     RESPONSIVE
  ======================================================= */

  @media (max-width: 700px) {
    .headerInner,
    .main {
      width: calc(100% - 28px);
    }

    .headerInner {
      min-height: 100px;
    }

    .headerIcon {
      width: 48px;
      height: 48px;
    }

    .headerText h1 {
      font-size: 23px;
    }

    .pageIntro {
      align-items: flex-start;
      flex-direction: column;
    }

    .twoColumn {
      grid-template-columns: 1fr;
      gap: 20px;
    }

    .twoColumn + .field {
      margin-top: 20px;
    }
  }

  @media (max-width: 520px) {
    .headerInner,
    .main {
      width: calc(100% - 24px);
    }

    .headerInner {
      gap: 10px;
    }

    .backButton {
      width: 37px;
      height: 37px;
    }

    .headerIcon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
    }

    .headerIcon svg {
      width: 21px;
      height: 21px;
    }

    .breadcrumb {
      display: none;
    }

    .headerText h1 {
      font-size: 20px;
    }

    .headerText p {
      font-size: 10px;
    }

    .main {
      padding-top: 25px;
    }

    .sectionHeader {
      padding: 17px;
    }

    .sectionBody {
      padding: 18px;
    }

    .statusCard {
      align-items: flex-start;
      flex-direction: column;
    }

    .statusRight {
      width: 100%;
      justify-content: space-between;
    }

    .formActions {
      flex-direction: column-reverse;
    }

    .cancelButton,
    .createButton {
      width: 100%;
    }

    .modalOverlay {
      align-items: flex-end;
      padding: 0;
    }

    .timezoneModal {
      width: 100%;
      max-height: 78vh;

      border-radius: 18px 18px 0 0;
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