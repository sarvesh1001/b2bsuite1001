// apps/web/src/pages/dashboard.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getUserDepartments } from '@b2b/api-client';
import { useUserAuthStore } from '../store/userAuthStore';

import {
  FiArrowRight,
  FiCamera,
  FiChevronRight,
  FiLogOut,
  FiMessageCircle,
  FiRefreshCw,
  FiGrid,
  FiAlertCircle,
} from 'react-icons/fi';

// =========================================================
// MODULE CONFIGURATION
// =========================================================

const MODULE_CONFIG: Record<
  string,
  {
    icon: string;
    label: string;
    color: string;
  }
> = {
  administration: {
    icon: '⚙️',
    label: 'Administration',
    color: '#2563EB',
  },
  hr: {
    icon: '👥',
    label: 'HR',
    color: '#7C3AED',
  },
  attendance: {
    icon: '📅',
    label: 'Attendance',
    color: '#F59E0B',
  },
  inventory: {
    icon: '📦',
    label: 'Inventory',
    color: '#10B981',
  },
  payroll: {
    icon: '💰',
    label: 'Payroll',
    color: '#EF4444',
  },
  sales: {
    icon: '🏷️',
    label: 'Sales',
    color: '#8B5CF6',
  },
  procurement: {
    icon: '🚚',
    label: 'Procurement',
    color: '#F97316',
  },
  production: {
    icon: '🏭',
    label: 'Production',
    color: '#14B8A6',
  },
  logistics: {
    icon: '📍',
    label: 'Logistics',
    color: '#3B82F6',
  },
  accounting: {
    icon: '🧮',
    label: 'Accounting',
    color: '#6366F1',
  },
  finance: {
    icon: '🏦',
    label: 'Finance',
    color: '#8B5CF6',
  },
  it: {
    icon: '💻',
    label: 'IT',
    color: '#6B7280',
  },
  academics: {
    icon: '🎓',
    label: 'Academics',
    color: '#EC4899',
  },
  marketing: {
    icon: '📣',
    label: 'Marketing',
    color: '#F59E0B',
  },
  transport: {
    icon: '🚌',
    label: 'Transport',
    color: '#14B8A6',
  },
  operations: {
    icon: '📋',
    label: 'Operations',
    color: '#0EA5E9',
  },
};

// =========================================================
// DEPARTMENT → MODULE
// =========================================================

const DEPARTMENT_TO_MODULE_KEY: Record<string, string> = {
  Academics: 'academics',
  Accounting: 'accounting',
  Administration: 'administration',
  Attendance: 'attendance',
  Finance: 'finance',
  HR: 'hr',
  IT: 'it',
  Inventory: 'inventory',
  Logistics: 'logistics',
  Marketing: 'marketing',
  Operations: 'operations',
  Payroll: 'payroll',
  Procurement: 'procurement',
  Production: 'production',
  Sales: 'sales',

  'Company Management': 'administration',
  'Employee Management': 'hr',
  'Manager Management': 'hr',
  'Quality Assurance': 'operations',
  'Quality Control': 'operations',
  'R&D': 'administration',
  'Customer Support': 'administration',
};

// =========================================================
// DASHBOARD
// =========================================================

export default function Dashboard() {
  const router = useRouter();

  const {
    accessToken,
    deviceId,
    companyId,
    user,
    logout,
  } = useUserAuthStore();

  // ----- LOG: render state -----
  console.log('[Dashboard] Render – auth data:', {
    accessToken: accessToken ? `${accessToken.slice(0, 20)}…` : null,
    deviceId,
    companyId,
    user: user ? { id: user.user_id, name: user.full_name } : null,
    hasAccessToken: !!accessToken,
    hasDeviceId: !!deviceId,
    hasCompanyId: !!companyId,
    hasUser: !!user,
    userId: user?.user_id,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleKeys, setModuleKeys] = useState<string[]>([]);

  // =======================================================
  // FETCH DEPARTMENTS
  // =======================================================

  useEffect(() => {
    console.log('[Dashboard] Effect running – checking auth data');
    if (!accessToken || !companyId || !user?.user_id || !deviceId) {
      console.warn('[Dashboard] Missing required auth data:', {
        accessToken: !!accessToken,
        companyId: !!companyId,
        userId: user?.user_id,
        deviceId: !!deviceId,
        // Also log actual values (mask token)
        accessTokenValue: accessToken ? `${accessToken.slice(0, 20)}…` : null,
        deviceIdValue: deviceId,
        companyIdValue: companyId,
        userValue: user,
      });

      setLoading(false);
      setError(
        'Missing authentication information. Please log out and log in again.'
      );

      return;
    }

    console.log('[Dashboard] All auth data present – fetching departments');

    const fetchDepartments = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[Dashboard] Calling getUserDepartments with:', {
          companyId,
          userId: user.user_id,
          deviceId,
          accessToken: accessToken ? `${accessToken.slice(0, 20)}…` : null,
        });

        const response = await getUserDepartments(
          companyId,
          user.user_id,
          deviceId,
          accessToken
        );

        console.log('[Dashboard] Departments response:', response);

        const depts = response.data || [];

        const keys: string[] = depts
          .map(
            (dept: any) =>
              DEPARTMENT_TO_MODULE_KEY[dept.department_name]
          )
          .filter(
            (key: string | undefined): key is string =>
              key !== undefined
          );

        const uniqueKeys = Array.from(new Set(keys));
        console.log('[Dashboard] Mapped module keys:', uniqueKeys);
        setModuleKeys(uniqueKeys);
      } catch (err) {
        console.error('[Dashboard] Failed to fetch departments:', err);
        setError(
          'Unable to load your modules. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, [accessToken, companyId, user?.user_id, deviceId]);

  // =======================================================
  // LOGOUT
  // =======================================================

  const handleLogout = async () => {
    if (
      !window.confirm(
        'Are you sure you want to log out from all devices?'
      )
    ) {
      return;
    }

    await logout();
    router.push('/web/login');
  };

  // =======================================================
  // MODULE NAVIGATION
  // =======================================================

  const handleModulePress = (moduleName: string) => {
    router.push(`/module/${moduleName}`);
  };

  // =======================================================
  // USER NAME
  // =======================================================

  const userName =
    user?.full_name ||
    user?.username ||
    user?.phone ||
    'User';

  const firstName = userName.split(' ')[0];

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <>
        <div className="dashboardPage loadingPage">
          <div className="loadingCard">
            <div className="loadingSpinner" />

            <h2>Loading your workspace</h2>

            <p>
              Preparing your modules and permissions...
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

  if (error) {
    return (
      <>
        <div className="dashboardPage">
          <div className="stateCard">
            <div className="stateIcon errorIcon">
              <FiAlertCircle />
            </div>

            <h2>Something went wrong</h2>

            <p>{error}</p>

            <div className="stateActions">
              <button
                type="button"
                className="secondaryAction"
                onClick={() => window.location.reload()}
              >
                <FiRefreshCw />
                Try Again
              </button>

              <button
                type="button"
                className="primaryAction"
                onClick={handleLogout}
              >
                <FiLogOut />
                Logout
              </button>
            </div>
          </div>
        </div>

        <style jsx>{styles}</style>
      </>
    );
  }

  // =======================================================
  // NO MODULES
  // =======================================================

  if (moduleKeys.length === 0) {
    return (
      <>
        <div className="dashboardPage">
          <div className="stateCard">
            <div className="stateIcon emptyIcon">
              <FiGrid />
            </div>

            <h2>No Modules Available</h2>

            <p>
              You don't currently have access to any modules
              through your departments.
              <br />
              Please contact your administrator.
            </p>

            <button
              type="button"
              className="primaryAction"
              onClick={handleLogout}
            >
              <FiLogOut />
              Logout
            </button>
          </div>
        </div>

        <style jsx>{styles}</style>
      </>
    );
  }

  // =======================================================
  // MAIN DASHBOARD
  // =======================================================

  return (
    <>
      <div className="dashboardPage">

        {/* =================================================
            TOP HEADER
        ================================================= */}

        <header className="topHeader">
          <div className="headerInner">

            {/* Brand */}
            <div className="brand">
              <div className="brandMark">
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

            {/* Header actions */}
            <div className="headerActions">

              <button
                type="button"
                className="headerIconButton"
                onClick={() =>
                  router.push('/web/qr-scanner')
                }
                title="QR Scanner"
                aria-label="QR Scanner"
              >
                <FiCamera />
              </button>

              <div className="headerDivider" />

              <div className="userMiniProfile">
                <div className="userAvatar">
                  {firstName.charAt(0).toUpperCase()}
                </div>

                <div className="userMiniInfo">
                  <span className="userMiniName">
                    {userName}
                  </span>

                  <span className="userMiniRole">
                    Employee
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="logoutIconButton"
                onClick={handleLogout}
                title="Logout"
                aria-label="Logout"
              >
                <FiLogOut />
              </button>
            </div>
          </div>
        </header>

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <main className="mainContent">

          {/* =================================================
              WELCOME SECTION
          ================================================= */}

          <section className="welcomeSection">

            <div className="welcomeLeft">

              <div className="breadcrumb">
                <span>Workspace</span>
                <FiChevronRight />
                <span>Modules</span>
              </div>

              <h1>
                Welcome back,{' '}
                <span>{firstName}</span>
              </h1>

              <p>
                Everything you need to manage your work,
                all in one place.
              </p>
            </div>

            <div className="moduleSummary">
              <div className="summaryIcon">
                <FiGrid />
              </div>

              <div>
                <strong>{moduleKeys.length}</strong>

                <span>
                  {moduleKeys.length === 1
                    ? 'Module available'
                    : 'Modules available'}
                </span>
              </div>
            </div>

          </section>

          {/* =================================================
              MODULE SECTION
          ================================================= */}

          <section className="modulesSection">

            <div className="sectionHeading">

              <div>
                <h2>Your Modules</h2>

                <p>
                  Select a module to access its features
                </p>
              </div>

              <div className="availableBadge">
                {moduleKeys.length} available
              </div>

            </div>

            {/* =================================================
                MODULE GRID
            ================================================= */}

            <div className="moduleGrid">

              {moduleKeys.map((key, index) => {
                const config = MODULE_CONFIG[key];

                if (!config) return null;

                return (
                  <button
                    type="button"
                    key={key}
                    className="moduleCard"
                    onClick={() =>
                      handleModulePress(key)
                    }
                    style={
                      {
                        '--module-color': config.color,
                        '--module-soft': `${config.color}12`,
                        '--module-border': `${config.color}28`,
                      } as React.CSSProperties
                    }
                  >

                    {/* Card number */}
                    <span className="cardNumber">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    {/* Module icon */}
                    <div className="moduleCardIcon">
                      {config.icon}
                    </div>

                    {/* Module information */}
                    <div className="moduleCardInfo">

                      <span className="moduleCardTitle">
                        {config.label}
                      </span>

                      <span className="moduleCardDescription">
                        Open {config.label.toLowerCase()}
                      </span>

                    </div>

                    {/* Arrow */}
                    <div className="moduleCardArrow">
                      <FiArrowRight />
                    </div>

                  </button>
                );
              })}

            </div>
          </section>

        </main>

        {/* =================================================
            AI CHAT BUTTON
        ================================================= */}

        <button
          type="button"
          className="aiButton"
          onClick={() => router.push('/chat')}
        >

          <div className="aiButtonIcon">
            <FiMessageCircle />
          </div>

          <div className="aiButtonText">
            <span className="aiButtonTitle">
              Prayantra Assistant
            </span>

            <span className="aiButtonSubtitle">
              How can I help you?
            </span>
          </div>

          <FiArrowRight className="aiButtonArrow" />

        </button>

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

  .dashboardPage {
    min-height: 100vh;

    background:
      radial-gradient(
        circle at 0% 0%,
        rgba(123, 47, 190, 0.055),
        transparent 28%
      ),
      radial-gradient(
        circle at 100% 10%,
        rgba(0, 180, 219, 0.045),
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

    padding-bottom: 115px;
  }

  /* =======================================================
     HEADER
  ======================================================= */

  .topHeader {
    position: sticky;
    top: 0;
    z-index: 50;

    background: rgba(255, 255, 255, 0.94);

    border-bottom: 1px solid #e7ebf1;

    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);

    box-shadow:
      0 2px 10px rgba(15, 23, 42, 0.035);
  }

  .headerInner {
    width: min(1400px, calc(100% - 48px));

    min-height: 76px;

    margin: 0 auto;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;
  }

  /* =======================================================
     BRAND
  ======================================================= */

  .brand {
    display: flex;
    align-items: center;
    gap: 11px;
  }

  .brandMark {
    width: 40px;
    height: 40px;

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

    color: #ffffff;

    font-size: 20px;
    font-weight: 800;

    box-shadow:
      0 5px 13px rgba(123, 47, 190, 0.22);
  }

  .brandText {
    display: flex;
    flex-direction: column;
  }

  .brandName {
    color: #172033;

    font-size: 17px;
    line-height: 1.1;
    font-weight: 750;
    letter-spacing: -0.25px;
  }

  .brandSubtitle {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 10px;
    line-height: 1;

    font-weight: 600;

    letter-spacing: 0.15px;
  }

  /* =======================================================
     HEADER ACTIONS
  ======================================================= */

  .headerActions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .headerIconButton,
  .logoutIconButton {
    all: unset;

    width: 39px;
    height: 39px;

    display: flex;
    align-items: center;
    justify-content: center;

    border: 1px solid #e2e8f0;
    border-radius: 10px;

    background: #ffffff;
    color: #64748b;

    cursor: pointer;

    transition:
      background 0.18s ease,
      color 0.18s ease,
      border-color 0.18s ease,
      transform 0.18s ease;
  }

  .headerIconButton svg,
  .logoutIconButton svg {
    width: 18px;
    height: 18px;
  }

  .headerIconButton:hover {
    color: #2563eb;

    border-color: #bfdbfe;
    background: #eff6ff;

    transform: translateY(-1px);
  }

  .logoutIconButton:hover {
    color: #ef4444;

    border-color: #fecaca;
    background: #fef2f2;

    transform: translateY(-1px);
  }

  .headerDivider {
    width: 1px;
    height: 30px;

    background: #e5eaf1;

    margin: 0 3px;
  }

  /* =======================================================
     MINI PROFILE
  ======================================================= */

  .userMiniProfile {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .userAvatar {
    width: 38px;
    height: 38px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 11px;

    background: #f1eafe;

    color: #7b2fbe;

    font-size: 14px;
    font-weight: 750;
  }

  .userMiniInfo {
    display: flex;
    flex-direction: column;

    min-width: 0;
  }

  .userMiniName {
    max-width: 150px;

    overflow: hidden;

    color: #334155;

    font-size: 12px;
    line-height: 1.2;
    font-weight: 650;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .userMiniRole {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 10px;
    line-height: 1;
    font-weight: 500;
  }

  /* =======================================================
     MAIN CONTENT
  ======================================================= */

  .mainContent {
    width: min(1400px, calc(100% - 48px));

    margin: 0 auto;
  }

  /* =======================================================
     WELCOME
  ======================================================= */

  .welcomeSection {
    min-height: 205px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 30px;

    padding: 42px 0 34px;
  }

  .welcomeLeft {
    min-width: 0;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 5px;

    margin-bottom: 11px;

    color: #94a3b8;

    font-size: 11px;
    font-weight: 650;
  }

  .breadcrumb svg {
    width: 13px;
    height: 13px;
  }

  .welcomeLeft h1 {
    margin: 0;

    color: #172033;

    font-size: 34px;
    line-height: 1.15;

    font-weight: 750;

    letter-spacing: -0.8px;
  }

  .welcomeLeft h1 span {
    color: #7b2fbe;
  }

  .welcomeLeft p {
    margin: 9px 0 0;

    color: #64748b;

    font-size: 14px;
    line-height: 1.5;

    font-weight: 500;
  }

  /* =======================================================
     MODULE SUMMARY
  ======================================================= */

  .moduleSummary {
    min-width: 180px;

    display: flex;
    align-items: center;
    gap: 13px;

    padding: 15px 18px;

    border: 1px solid #e5eaf1;
    border-radius: 14px;

    background: rgba(255,255,255,0.8);

    box-shadow:
      0 3px 10px rgba(15, 23, 42, 0.025);
  }

  .summaryIcon {
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

  .summaryIcon svg {
    width: 19px;
    height: 19px;
  }

  .moduleSummary > div:last-child {
    display: flex;
    flex-direction: column;
  }

  .moduleSummary strong {
    color: #1e293b;

    font-size: 22px;
    line-height: 1;

    font-weight: 750;
  }

  .moduleSummary span {
    margin-top: 5px;

    color: #94a3b8;

    font-size: 10px;
    font-weight: 600;
  }

  /* =======================================================
     MODULE SECTION
  ======================================================= */

  .modulesSection {
    padding-bottom: 40px;
  }

  .sectionHeading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;

    gap: 20px;

    margin-bottom: 19px;
  }

  .sectionHeading h2 {
    margin: 0;

    color: #1e293b;

    font-size: 19px;
    line-height: 1.3;

    font-weight: 700;

    letter-spacing: -0.2px;
  }

  .sectionHeading p {
    margin: 5px 0 0;

    color: #94a3b8;

    font-size: 12px;
    font-weight: 500;
  }

  .availableBadge {
    padding: 7px 11px;

    border: 1px solid #e2e8f0;
    border-radius: 8px;

    background: #ffffff;

    color: #64748b;

    font-size: 11px;
    font-weight: 650;

    white-space: nowrap;
  }

  /* =======================================================
     MODULE GRID
  ======================================================= */

  .moduleGrid {
    display: grid;

    grid-template-columns:
      repeat(
        4,
        minmax(0, 1fr)
      );

    gap: 17px;
  }

  /* =======================================================
     MODULE CARD
  ======================================================= */

  .moduleCard {
    all: unset;

    position: relative;

    min-width: 0;
    min-height: 172px;

    padding: 22px;

    display: flex;
    flex-direction: column;

    border: 1px solid #e5eaf1;
    border-radius: 16px;

    background: #ffffff;

    cursor: pointer;

    overflow: hidden;

    box-shadow:
      0 2px 5px rgba(15, 23, 42, 0.025);

    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      border-color 0.2s ease;
  }

  .moduleCard::before {
    content: '';

    position: absolute;

    top: 0;
    left: 0;

    width: 100%;
    height: 3px;

    background: var(--module-color);

    opacity: 0;

    transition: opacity 0.2s ease;
  }

  .moduleCard:hover {
    transform: translateY(-4px);

    border-color: var(--module-border);

    box-shadow:
      0 12px 28px rgba(15, 23, 42, 0.085);
  }

  .moduleCard:hover::before {
    opacity: 1;
  }

  .moduleCard:focus-visible {
    outline: 3px solid var(--module-soft);
    outline-offset: 2px;
  }

  /* =======================================================
     CARD NUMBER
  ======================================================= */

  .cardNumber {
    position: absolute;

    top: 18px;
    right: 19px;

    color: #cbd5e1;

    font-size: 10px;
    font-weight: 750;

    letter-spacing: 0.6px;
  }

  /* =======================================================
     CARD ICON
  ======================================================= */

  .moduleCardIcon {
    width: 52px;
    height: 52px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 14px;

    background: var(--module-soft);

    font-size: 27px;
    line-height: 1;

    transition:
      transform 0.2s ease;
  }

  .moduleCard:hover .moduleCardIcon {
    transform: scale(1.06);
  }

  /* =======================================================
     CARD CONTENT
  ======================================================= */

  .moduleCardInfo {
    min-width: 0;

    display: flex;
    flex-direction: column;

    margin-top: 18px;

    padding-right: 35px;
  }

  .moduleCardTitle {
    overflow: hidden;

    color: #1e293b;

    font-size: 16px;
    line-height: 1.3;

    font-weight: 700;

    text-align: left;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .moduleCardDescription {
    margin-top: 5px;

    overflow: hidden;

    color: #94a3b8;

    font-size: 11px;
    line-height: 1.4;

    font-weight: 500;

    text-align: left;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* =======================================================
     CARD ARROW
  ======================================================= */

  .moduleCardArrow {
    position: absolute;

    right: 18px;
    bottom: 18px;

    width: 31px;
    height: 31px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;

    background: var(--module-soft);

    color: var(--module-color);

    transition:
      transform 0.2s ease;
  }

  .moduleCardArrow svg {
    width: 15px;
    height: 15px;
  }

  .moduleCard:hover .moduleCardArrow {
    transform: translateX(3px);
  }

  /* =======================================================
     AI ASSISTANT
  ======================================================= */

  .aiButton {
    position: fixed;

    right: 28px;
    bottom: 27px;

    z-index: 40;

    min-width: 260px;

    display: flex;
    align-items: center;

    gap: 11px;

    padding: 10px 12px;

    border: 1px solid rgba(255,255,255,0.22);
    border-radius: 15px;

    background:
      linear-gradient(
        135deg,
        #7b2fbe,
        #6230a5
      );

    color: #ffffff;

    cursor: pointer;

    box-shadow:
      0 10px 28px rgba(91, 42, 151, 0.28);

    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
  }

  .aiButton:hover {
    transform: translateY(-3px);

    box-shadow:
      0 15px 34px rgba(91, 42, 151, 0.34);
  }

  .aiButtonIcon {
    width: 39px;
    height: 39px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 11px;

    background: rgba(255,255,255,0.15);
  }

  .aiButtonIcon svg {
    width: 19px;
    height: 19px;
  }

  .aiButtonText {
    min-width: 0;

    flex: 1;

    display: flex;
    flex-direction: column;

    text-align: left;
  }

  .aiButtonTitle {
    font-size: 12px;
    line-height: 1.3;

    font-weight: 700;
  }

  .aiButtonSubtitle {
    margin-top: 2px;

    color: rgba(255,255,255,0.72);

    font-size: 10px;
    line-height: 1.3;

    font-weight: 500;
  }

  .aiButtonArrow {
    width: 16px;
    height: 16px;

    flex-shrink: 0;

    opacity: 0.75;
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
     ERROR / EMPTY STATE
  ======================================================= */

  .stateCard {
    width: min(460px, calc(100% - 40px));

    margin: 100px auto;

    padding: 42px 30px;

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

  .stateIcon {
    width: 68px;
    height: 68px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 18px;
  }

  .stateIcon svg {
    width: 30px;
    height: 30px;
  }

  .errorIcon {
    background: #fef2f2;
    color: #ef4444;
  }

  .emptyIcon {
    background: #f1eafe;
    color: #7b2fbe;
  }

  .stateCard h2 {
    margin: 20px 0 0;

    color: #1e293b;

    font-size: 21px;
    font-weight: 700;
  }

  .stateCard p {
    margin: 8px 0 0;

    color: #64748b;

    font-size: 13px;
    line-height: 1.65;
  }

  .stateActions {
    display: flex;
    align-items: center;
    gap: 10px;

    margin-top: 25px;
  }

  .primaryAction,
  .secondaryAction {
    all: unset;

    padding: 10px 15px;

    display: flex;
    align-items: center;
    gap: 7px;

    border-radius: 9px;

    cursor: pointer;

    font-size: 12px;
    font-weight: 650;

    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease;
  }

  .primaryAction {
    background: #7b2fbe;
    color: #ffffff;
  }

  .secondaryAction {
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #475569;
  }

  .primaryAction:hover,
  .secondaryAction:hover {
    transform: translateY(-1px);
  }

  .primaryAction svg,
  .secondaryAction svg {
    width: 15px;
    height: 15px;
  }

  /* =======================================================
     RESPONSIVE
  ======================================================= */

  @media (max-width: 1150px) {
    .moduleGrid {
      grid-template-columns:
        repeat(
          3,
          minmax(0, 1fr)
        );
    }
  }

  @media (max-width: 850px) {
    .moduleGrid {
      grid-template-columns:
        repeat(
          2,
          minmax(0, 1fr)
        );
    }

    .userMiniInfo {
      display: none;
    }

    .welcomeSection {
      min-height: auto;
    }
  }

  @media (max-width: 650px) {
    .headerInner,
    .mainContent {
      width: calc(100% - 28px);
    }

    .headerInner {
      min-height: 68px;
    }

    .brandSubtitle {
      display: none;
    }

    .headerDivider {
      display: none;
    }

    .welcomeSection {
      padding: 30px 0 25px;

      align-items: flex-start;

      flex-direction: column;
    }

    .welcomeLeft h1 {
      font-size: 28px;
    }

    .moduleSummary {
      width: 100%;
    }

    .sectionHeading {
      align-items: flex-start;
    }

    .availableBadge {
      display: none;
    }

    .moduleGrid {
      grid-template-columns: 1fr;
      gap: 13px;
    }

    .moduleCard {
      min-height: 135px;
    }

    .aiButton {
      right: 14px;
      bottom: 14px;
      left: 14px;

      min-width: 0;

      width: auto;
    }
  }

  @media (max-width: 420px) {
    .brandText {
      display: none;
    }

    .userAvatar {
      width: 36px;
      height: 36px;
    }

    .headerIconButton,
    .logoutIconButton {
      width: 36px;
      height: 36px;
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