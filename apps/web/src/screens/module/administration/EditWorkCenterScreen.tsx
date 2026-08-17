import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ✅ Use axiosInstance directly
import { axiosInstance } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';

import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiChevronRight,
  FiClock,
  FiEdit3,
  FiInfo,
  FiSave,
  FiTool,
  FiX,
} from 'react-icons/fi';

// =========================================================
// SCHEMA
// =========================================================

const schema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .optional(),

  description: z
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
}> = ({ value, onChange }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      className={`statusSwitch ${
        value ? 'switchOn' : 'switchOff'
      }`}
      onClick={() => onChange(!value)}
    >
      <span className="switchThumb" />
    </button>
  );
};

// =========================================================
// SCREEN
// =========================================================

export default function EditWorkCenterScreen() {
  const router = useRouter();
  const { code } = router.query;

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      name: '',
      description: '',
      is_active: true,
    },
  });

  // =======================================================
  // LOAD WORK CENTER
  // =======================================================

  useEffect(() => {
    if (
      !code ||
      !accessToken ||
      !companyId ||
      !deviceId
    ) {
      if (!code) {
        alert('Work center code missing');
      }

      if (!accessToken || !companyId || !deviceId) {
        alert('Missing authentication information');
      }

      router.back();
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        // ✅ Use axiosInstance to GET the work center
        const response = await axiosInstance.get(
          `/companies/${companyId}/attendance/work-centers/${code}`,
          {
            headers: {
              'X-Company-ID': companyId,
              'X-Device-ID': deviceId,
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        // Assume response.data is the work center object
        const workCenter = response.data?.data || response.data;

        if (workCenter) {
          reset({
            name: workCenter.name,
            description: workCenter.description || '',
            is_active: workCenter.is_active,
          });
        } else {
          alert('Work center not found');
          router.back();
        }
      } catch (error: any) {
        console.error('Failed to load work center:', error);
        alert(
          error?.response?.data?.message ||
          error.message ||
          'Failed to load work center'
        );
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    code,
    accessToken,
    companyId,
    deviceId,
    reset,
    router,
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
      alert('Missing authentication');
      return;
    }

    setSaving(true);

    try {
      const payload: {
        name?: string;
        description?: string;
        is_active?: boolean;
      } = {};

      if (
        data.name !== undefined
      ) {
        payload.name = data.name.trim();
      }

      if (
        data.description !== undefined
      ) {
        payload.description =
          data.description?.trim() || '';
      }

      if (
        data.is_active !== undefined
      ) {
        payload.is_active =
          data.is_active;
      }

      // ✅ Use axiosInstance to PUT the update
      const response = await axiosInstance.put(
        `/companies/${companyId}/attendance/work-centers/${code}`,
        payload,
        {
          headers: {
            'X-Company-ID': companyId,
            'X-Device-ID': deviceId,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Check response success (adjust based on actual API response)
      if (response.data?.success !== false) {
        alert('Work center updated successfully');
        router.back();
      } else {
        alert(
          response.data?.message ||
          'Update failed'
        );
      }
    } catch (error: any) {
      console.error('Failed to update work center:', error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'An unexpected error occurred';
      alert(message);
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
        <div className="page loadingPage">
          <div className="loadingCard">
            <div className="loadingSpinner" />

            <h2>
              Loading Work Center
            </h2>

            <p>
              Fetching work center information...
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
      <div className="page">

        {/* =================================================
            HEADER
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

            <div className="headerDivider" />

            <div className="breadcrumb">
              <span>Administration</span>

              <FiChevronRight />

              <span>Work Centers</span>

              <FiChevronRight />

              <strong>Edit</strong>
            </div>

            <div className="headerRight">
              <span
                className={
                  isDirty
                    ? 'unsavedBadge'
                    : 'savedBadge'
                }
              >
                <span className="statusDot" />

                {isDirty
                  ? 'Unsaved changes'
                  : 'No changes'}
              </span>
            </div>

          </div>
        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="content">

          {/* =================================================
              TITLE
          ================================================= */}

          <section className="titleSection">

            <div className="titleIcon">
              <FiTool />
            </div>

            <div className="titleContent">

              <div className="eyebrow">
                WORK CENTER
              </div>

              <h1>
                Edit Work Center
              </h1>

              <p>
                Update the name, description,
                and operational status of this
                work center.
              </p>

            </div>

          </section>

          {/* =================================================
              WORK CENTER IDENTITY
          ================================================= */}

          <section className="identityCard">

            <div className="identityIcon">
              <FiTool />
            </div>

            <div className="identityInfo">

              <span className="identityLabel">
                WORK CENTER CODE
              </span>

              <strong>
                {code}
              </strong>

              <span className="identityDescription">
                Unique identifier for this
                work center
              </span>

            </div>

            <div className="readOnlyBadge">
              <FiInfo />
              Read only
            </div>

          </section>

          {/* =================================================
              FORM
          ================================================= */}

          <form
            className="formCard"
            onSubmit={handleSubmit(
              onSubmit
            )}
          >

            {/* =================================================
                BASIC INFORMATION
            ================================================= */}

            <div className="formSection">

              <div className="sectionTitle">

                <div className="sectionTitleIcon">
                  <FiEdit3 />
                </div>

                <div>
                  <h2>
                    Basic Information
                  </h2>

                  <p>
                    Define the basic details
                    of this work center.
                  </p>
                </div>

              </div>

              <div className="fields">

                {/* Name */}

                <Controller
                  control={control}
                  name="name"
                  render={({
                    field,
                  }) => (
                    <div className="field">

                      <label
                        htmlFor="work-center-name"
                      >
                        Work Center Name
                        <span className="required">
                          *
                        </span>
                      </label>

                      <input
                        {...field}
                        id="work-center-name"
                        type="text"
                        placeholder="Enter work center name"
                        autoComplete="off"
                        className={
                          errors.name
                            ? 'input inputError'
                            : 'input'
                        }
                      />

                      {errors.name && (
                        <div className="fieldError">
                          <FiInfo />

                          <span>
                            {
                              errors
                                .name
                                .message
                            }
                          </span>
                        </div>
                      )}

                    </div>
                  )}
                />

                {/* Description */}

                <Controller
                  control={control}
                  name="description"
                  render={({
                    field,
                  }) => (
                    <div className="field">

                      <label htmlFor="work-center-description">
                        Description
                        <span className="optional">
                          Optional
                        </span>
                      </label>

                      <textarea
                        {...field}
                        id="work-center-description"
                        value={
                          field.value ?? ''
                        }
                        rows={5}
                        placeholder="Describe the purpose or responsibilities of this work center..."
                        className="input textarea"
                      />

                      <div className="fieldHint">
                        <span>
                          Add a short description
                          to help employees
                          understand this work
                          center.
                        </span>

                        <span>
                          {(field.value ||
                            '').length}{' '}
                          / 500
                        </span>
                      </div>

                    </div>
                  )}
                />

              </div>

            </div>

            {/* =================================================
                STATUS
            ================================================= */}

            <div className="formSection statusSection">

              <div className="sectionTitle">

                <div className="sectionTitleIcon">
                  <FiClock />
                </div>

                <div>
                  <h2>
                    Work Center Status
                  </h2>

                  <p>
                    Control whether this
                    work center is currently
                    available.
                  </p>
                </div>

              </div>

              <Controller
                control={control}
                name="is_active"
                render={({
                  field: {
                    value,
                    onChange,
                  },
                }) => (
                  <div
                    className={`statusCard ${
                      value
                        ? 'statusActive'
                        : 'statusInactive'
                    }`}
                  >

                    <div className="statusLeft">

                      <div className="statusIndicator">
                        {value ? (
                          <FiCheck />
                        ) : (
                          <FiX />
                        )}
                      </div>

                      <div>
                        <strong>
                          {value
                            ? 'Active'
                            : 'Inactive'}
                        </strong>

                        <p>
                          {value
                            ? 'This work center is available for use.'
                            : 'This work center is currently disabled.'}
                        </p>
                      </div>

                    </div>

                    <Switch
                      value={
                        value ?? false
                      }
                      onChange={
                        onChange
                      }
                    />

                  </div>
                )}
              />

            </div>

            {/* =================================================
                FOOTER
            ================================================= */}

            <div className="formFooter">

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
                    <span className="buttonSpinner" />

                    Updating...
                  </>
                ) : (
                  <>
                    <FiSave />

                    Update Work Center

                    <FiArrowRight className="saveArrow" />
                  </>
                )}

              </button>

            </div>

          </form>

          {/* =================================================
              BOTTOM NOTE
          ================================================= */}

          <div className="bottomNote">
            <FiInfo />

            <span>
              Changes to this work center will
              be reflected across the system
              immediately after saving.
            </span>
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
        rgba(37, 99, 235, 0.045),
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
    z-index: 40;

    background: rgba(255,255,255,0.94);

    border-bottom: 1px solid #e7ebf1;

    box-shadow:
      0 2px 10px rgba(15,23,42,0.035);

    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  .headerInner {
    width: min(1180px, calc(100% - 40px));

    min-height: 68px;

    margin: 0 auto;

    display: flex;
    align-items: center;

    gap: 13px;
  }

  .backButton {
    all: unset;

    width: 38px;
    height: 38px;

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
      color .18s ease,
      background .18s ease,
      border-color .18s ease,
      transform .18s ease;
  }

  .backButton svg {
    width: 18px;
    height: 18px;
  }

  .backButton:hover {
    color: #2563eb;

    border-color: #bfdbfe;

    background: #eff6ff;

    transform: translateX(-2px);
  }

  .headerDivider {
    width: 1px;
    height: 27px;

    background: #e5eaf1;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;

    color: #94a3b8;

    font-size: 11px;
    font-weight: 600;
  }

  .breadcrumb svg {
    width: 13px;
    height: 13px;
  }

  .breadcrumb strong {
    color: #475569;
    font-weight: 650;
  }

  .headerRight {
    margin-left: auto;
  }

  .unsavedBadge,
  .savedBadge {
    padding: 6px 10px;

    display: flex;
    align-items: center;
    gap: 6px;

    border-radius: 8px;

    font-size: 10px;
    font-weight: 650;
  }

  .unsavedBadge {
    background: #fff7ed;
    border: 1px solid #fed7aa;
    color: #c2410c;
  }

  .savedBadge {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #94a3b8;
  }

  .statusDot {
    width: 6px;
    height: 6px;

    border-radius: 50%;

    background: currentColor;
  }

  /* =======================================================
     CONTENT
  ======================================================= */

  .content {
    width: min(900px, calc(100% - 40px));

    margin: 0 auto;

    padding: 42px 0 70px;
  }

  /* =======================================================
     TITLE
  ======================================================= */

  .titleSection {
    display: flex;
    align-items: center;

    gap: 17px;

    margin-bottom: 27px;
  }

  .titleIcon {
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

  .titleIcon svg {
    width: 25px;
    height: 25px;
  }

  .titleContent {
    min-width: 0;
  }

  .eyebrow {
    margin-bottom: 4px;

    color: #2563eb;

    font-size: 10px;
    font-weight: 750;

    letter-spacing: 1px;
  }

  .titleContent h1 {
    margin: 0;

    color: #172033;

    font-size: 28px;
    line-height: 1.2;

    font-weight: 750;

    letter-spacing: -0.55px;
  }

  .titleContent p {
    margin: 6px 0 0;

    color: #64748b;

    font-size: 13px;
    line-height: 1.5;
  }

  /* =======================================================
     IDENTITY CARD
  ======================================================= */

  .identityCard {
    min-height: 88px;

    margin-bottom: 18px;

    padding: 16px 18px;

    display: flex;
    align-items: center;

    gap: 14px;

    border: 1px solid #dbeafe;
    border-radius: 14px;

    background:
      linear-gradient(
        135deg,
        #f8fbff,
        #ffffff
      );
  }

  .identityIcon {
    width: 48px;
    height: 48px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 12px;

    background: #eff6ff;

    color: #2563eb;
  }

  .identityIcon svg {
    width: 21px;
    height: 21px;
  }

  .identityInfo {
    min-width: 0;

    display: flex;
    flex-direction: column;
  }

  .identityLabel {
    color: #94a3b8;

    font-size: 9px;
    font-weight: 750;

    letter-spacing: .8px;
  }

  .identityInfo strong {
    margin-top: 3px;

    color: #1e293b;

    font-size: 16px;
    line-height: 1.2;

    font-weight: 750;
  }

  .identityDescription {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 10px;
  }

  .readOnlyBadge {
    margin-left: auto;

    padding: 6px 9px;

    display: flex;
    align-items: center;
    gap: 5px;

    border-radius: 7px;

    background: #f8fafc;

    color: #94a3b8;

    font-size: 9px;
    font-weight: 650;

    white-space: nowrap;
  }

  .readOnlyBadge svg {
    width: 12px;
    height: 12px;
  }

  /* =======================================================
     FORM CARD
  ======================================================= */

  .formCard {
    overflow: hidden;

    border: 1px solid #e3e8ef;
    border-radius: 16px;

    background: #ffffff;

    box-shadow:
      0 5px 20px rgba(15,23,42,0.045);
  }

  .formSection {
    padding: 27px 28px;
  }

  .formSection + .formSection {
    border-top: 1px solid #edf0f4;
  }

  /* =======================================================
     SECTION TITLE
  ======================================================= */

  .sectionTitle {
    display: flex;
    align-items: center;

    gap: 11px;

    margin-bottom: 24px;
  }

  .sectionTitleIcon {
    width: 35px;
    height: 35px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;

    background: #f1f5f9;

    color: #64748b;
  }

  .sectionTitleIcon svg {
    width: 16px;
    height: 16px;
  }

  .sectionTitle h2 {
    margin: 0;

    color: #1e293b;

    font-size: 14px;
    line-height: 1.3;

    font-weight: 700;
  }

  .sectionTitle p {
    margin: 3px 0 0;

    color: #94a3b8;

    font-size: 10px;
    line-height: 1.4;
  }

  /* =======================================================
     FIELDS
  ======================================================= */

  .fields {
    display: flex;
    flex-direction: column;

    gap: 22px;
  }

  .field {
    display: flex;
    flex-direction: column;
  }

  .field label {
    margin-bottom: 7px;

    color: #334155;

    font-size: 11px;
    font-weight: 650;
  }

  .required {
    margin-left: 3px;
    color: #ef4444;
  }

  .optional {
    margin-left: 7px;

    color: #94a3b8;

    font-size: 9px;
    font-weight: 500;
  }

  .input {
    width: 100%;

    min-height: 43px;

    padding: 10px 12px;

    border: 1px solid #d9e0e8;
    border-radius: 9px;

    outline: none;

    background: #ffffff;

    color: #1e293b;

    font-family: inherit;

    font-size: 12px;
    font-weight: 500;

    transition:
      border-color .18s ease,
      box-shadow .18s ease,
      background .18s ease;
  }

  .input::placeholder {
    color: #b0b8c5;
  }

  .input:hover {
    border-color: #c5ced9;
  }

  .input:focus {
    border-color: #2563eb;

    box-shadow:
      0 0 0 3px rgba(37,99,235,.09);
  }

  .inputError {
    border-color: #ef4444;
  }

  .inputError:focus {
    border-color: #ef4444;

    box-shadow:
      0 0 0 3px rgba(239,68,68,.08);
  }

  .textarea {
    min-height: 120px;

    resize: vertical;

    line-height: 1.55;
  }

  .fieldError {
    margin-top: 6px;

    display: flex;
    align-items: center;
    gap: 5px;

    color: #dc2626;

    font-size: 10px;
    font-weight: 550;
  }

  .fieldError svg {
    width: 12px;
    height: 12px;
  }

  .fieldHint {
    margin-top: 6px;

    display: flex;
    justify-content: space-between;
    gap: 15px;

    color: #94a3b8;

    font-size: 9px;
    line-height: 1.4;
  }

  /* =======================================================
     STATUS
  ======================================================= */

  .statusSection {
    padding-bottom: 25px;
  }

  .statusCard {
    min-height: 76px;

    padding: 13px 15px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 15px;

    border: 1px solid;

    border-radius: 12px;

    transition:
      background .18s ease,
      border-color .18s ease;
  }

  .statusActive {
    background: #f0fdf4;
    border-color: #bbf7d0;
  }

  .statusInactive {
    background: #f8fafc;
    border-color: #e2e8f0;
  }

  .statusLeft {
    display: flex;
    align-items: center;

    gap: 11px;
  }

  .statusIndicator {
    width: 37px;
    height: 37px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;
  }

  .statusActive .statusIndicator {
    background: #dcfce7;
    color: #16a34a;
  }

  .statusInactive .statusIndicator {
    background: #e2e8f0;
    color: #64748b;
  }

  .statusIndicator svg {
    width: 17px;
    height: 17px;
  }

  .statusLeft strong {
    display: block;

    color: #1e293b;

    font-size: 12px;
    font-weight: 700;
  }

  .statusLeft p {
    margin: 3px 0 0;

    color: #94a3b8;

    font-size: 9px;
  }

  /* =======================================================
     SWITCH
  ======================================================= */

  .statusSwitch {
    position: relative;

    width: 46px;
    height: 26px;

    flex-shrink: 0;

    padding: 0;

    border: none;
    border-radius: 20px;

    cursor: pointer;

    transition:
      background .2s ease;
  }

  .switchOn {
    background: #16a34a;
  }

  .switchOff {
    background: #cbd5e1;
  }

  .switchThumb {
    position: absolute;

    top: 4px;
    left: 4px;

    width: 18px;
    height: 18px;

    border-radius: 50%;

    background: #ffffff;

    box-shadow:
      0 1px 3px rgba(0,0,0,.2);

    transition:
      transform .2s ease;
  }

  .switchOn .switchThumb {
    transform: translateX(20px);
  }

  .switchOff .switchThumb {
    transform: translateX(0);
  }

  /* =======================================================
     FORM FOOTER
  ======================================================= */

  .formFooter {
    min-height: 78px;

    padding: 16px 28px;

    display: flex;
    align-items: center;
    justify-content: flex-end;

    gap: 10px;

    border-top: 1px solid #edf0f4;

    background: #fafbfc;
  }

  .cancelButton,
  .saveButton {
    min-height: 41px;

    padding: 0 15px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 7px;

    border-radius: 9px;

    font-family: inherit;

    font-size: 11px;
    font-weight: 650;

    cursor: pointer;

    transition:
      transform .18s ease,
      box-shadow .18s ease,
      background .18s ease,
      opacity .18s ease;
  }

  .cancelButton {
    border: 1px solid #dce2e9;

    background: #ffffff;

    color: #64748b;
  }

  .cancelButton:hover:not(:disabled) {
    background: #f8fafc;

    color: #334155;
  }

  .saveButton {
    min-width: 190px;

    border: none;

    background:
      linear-gradient(
        135deg,
        #2563eb,
        #1d4ed8
      );

    color: #ffffff;

    box-shadow:
      0 5px 13px rgba(37,99,235,.18);
  }

  .saveButton:hover:not(:disabled) {
    transform: translateY(-1px);

    box-shadow:
      0 8px 18px rgba(37,99,235,.25);
  }

  .cancelButton:disabled,
  .saveButton:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .saveButton svg {
    width: 15px;
    height: 15px;
  }

  .saveArrow {
    margin-left: 3px;
    opacity: .7;
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
     BOTTOM NOTE
  ======================================================= */

  .bottomNote {
    margin-top: 14px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 6px;

    color: #94a3b8;

    font-size: 9px;
    line-height: 1.5;

    text-align: center;
  }

  .bottomNote svg {
    width: 12px;
    height: 12px;

    flex-shrink: 0;
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
      0 12px 35px rgba(15,23,42,.06);

    text-align: center;
  }

  .loadingSpinner {
    width: 38px;
    height: 38px;

    border: 3px solid #e8edf4;
    border-top-color: #2563eb;

    border-radius: 50%;

    animation: spin .8s linear infinite;
  }

  .loadingCard h2 {
    margin: 19px 0 0;

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

  @media (max-width: 700px) {
    .headerInner,
    .content {
      width: calc(100% - 28px);
    }

    .breadcrumb {
      display: none;
    }

    .headerDivider {
      display: none;
    }

    .content {
      padding-top: 28px;
    }

    .titleSection {
      align-items: flex-start;
    }

    .titleIcon {
      width: 50px;
      height: 50px;
    }

    .titleContent h1 {
      font-size: 23px;
    }

    .titleContent p {
      font-size: 11px;
    }

    .formSection {
      padding: 22px 18px;
    }

    .formFooter {
      padding: 14px 18px;
    }
  }

  @media (max-width: 520px) {
    .headerRight {
      display: none;
    }

    .titleSection {
      gap: 12px;
    }

    .identityCard {
      align-items: flex-start;
    }

    .readOnlyBadge {
      display: none;
    }

    .statusCard {
      align-items: flex-start;
    }

    .formFooter {
      flex-direction: column-reverse;
    }

    .cancelButton,
    .saveButton {
      width: 100%;
    }

    .bottomNote {
      padding: 0 15px;
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