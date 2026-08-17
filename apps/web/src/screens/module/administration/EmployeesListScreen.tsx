import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  getCompanyEmployees,
  findEmployeeByUsername,
} from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { CompanyEmployee } from '@b2b/shared-types';
import { UserAvatar } from '../../../components/UserAvatar';

import {
  FiPlus,
  FiSearch,
  FiX,
  FiEdit2,
  FiRefreshCw,
  FiUsers,
  FiChevronRight,
  FiArrowLeft,
  FiUserPlus,
  FiAlertCircle,
  FiInbox,
} from 'react-icons/fi';

export default function EmployeesListScreen() {
  const router = useRouter();

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // =========================================================
  // FETCH EMPLOYEES
  // =========================================================

  const fetchEmployees = useCallback(
    async (query?: string, isRefresh = false) => {
      if (!accessToken || !companyId || !deviceId) {
        setLoading(false);
        setError(
          'Missing authentication information. Please log in again.'
        );
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        let employeesData: CompanyEmployee[] = [];

        if (query && query.trim()) {
          try {
            const res = await findEmployeeByUsername(
              companyId,
              deviceId,
              query.trim(),
              accessToken
            );

            const employee =
              (res.data as any)?.employee || null;

            employeesData = employee ? [employee] : [];
          } catch {
            employeesData = [];
          }
        } else {
          const res = await getCompanyEmployees(
            companyId,
            deviceId,
            accessToken
          );

          employeesData =
            res.data?.employees || [];
        }

        setEmployees(employeesData);
      } catch (err: any) {
        console.error(
          'Failed to load employees:',
          err
        );

        setError(
          err?.message ||
            'Unable to load employees. Please try again.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, companyId, deviceId]
  );

  // =========================================================
  // INITIAL LOAD / SEARCH
  // =========================================================

  useEffect(() => {
    fetchEmployees(searchQuery);
  }, [fetchEmployees, searchQuery]);

  // =========================================================
  // SEARCH
  // =========================================================

  const handleSearchSubmit = () => {
    const normalized = searchTerm.trim();

    if (normalized === searchQuery) {
      fetchEmployees(normalized);
      return;
    }

    setSearchQuery(normalized);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchQuery('');
  };

  // =========================================================
  // EMPLOYEE CARD
  // =========================================================

  const renderEmployee = (
    item: CompanyEmployee,
    index: number
  ) => {
    const displayName =
      item.full_name ||
      item.username ||
      'Unnamed Employee';

    return (
      <button
        type="button"
        key={item.user_id}
        className="employeeCard"
        onClick={() =>
          router.push(
            `/module/administration/edit-employee?userId=${item.user_id}`
          )
        }
      >
        {/* Card number */}
        <span className="cardNumber">
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Avatar */}
        <div className="avatarWrapper">
          <UserAvatar
            userId={item.user_id}
            username={item.username}
            fullName={item.full_name}
            size={56}
          />
        </div>

        {/* Employee information */}
        <div className="employeeInfo">
          <span className="employeeName">
            {displayName}
          </span>

          {item.username && (
            <span className="employeeUsername">
              @{item.username}
            </span>
          )}

          <div className="employeeMeta">
            <span className="employeeId">
              ID: {item.employee_id || 'N/A'}
            </span>
          </div>
        </div>

        {/* Edit */}
        <div className="editButton">
          <FiEdit2 />
        </div>
      </button>
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading && !refreshing) {
    return (
      <>
        <div className="employeesPage">
          <EmployeeHeader
            router={router}
            employeeCount={0}
          />

          <main className="mainContent">
            <div className="loadingHeader">
              <div className="skeleton skeletonTitle" />
              <div className="skeleton skeletonSubtitle" />
            </div>

            <div className="skeletonSearch" />

            <div className="employeeGrid">
              {Array.from({ length: 6 }).map(
                (_, index) => (
                  <div
                    className="employeeSkeleton"
                    key={index}
                  >
                    <div className="skeleton skeletonAvatar" />

                    <div className="skeletonInfo">
                      <div className="skeleton skeletonName" />
                      <div className="skeleton skeletonSmall" />
                      <div className="skeleton skeletonTiny" />
                    </div>
                  </div>
                )
              )}
            </div>
          </main>
        </div>

        <style jsx>{styles}</style>
      </>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <>
        <div className="employeesPage">
          <EmployeeHeader
            router={router}
            employeeCount={0}
          />

          <main className="mainContent">
            <div className="stateCard">
              <div className="stateIcon errorIcon">
                <FiAlertCircle />
              </div>

              <h2>Unable to load employees</h2>

              <p>{error}</p>

              <button
                type="button"
                className="primaryButton"
                onClick={() =>
                  fetchEmployees(
                    searchQuery,
                    true
                  )
                }
              >
                <FiRefreshCw />
                Try Again
              </button>
            </div>
          </main>
        </div>

        <style jsx>{styles}</style>
      </>
    );
  }

  // =========================================================
  // MAIN
  // =========================================================

  return (
    <>
      <div className="employeesPage">

        {/* =================================================
            HEADER
        ================================================= */}

        <EmployeeHeader
          router={router}
          employeeCount={employees.length}
        />

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <main className="mainContent">

          {/* =================================================
              PAGE INTRO
          ================================================= */}

          <section className="pageIntro">

            <div className="introLeft">

              <div className="breadcrumb">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      '/module/administration'
                    )
                  }
                >
                  Administration
                </button>

                <FiChevronRight />

                <span>Employees</span>
              </div>

              <h1>Employees</h1>

              <p>
                Manage employees, view their details,
                and update employee information.
              </p>
            </div>

            <button
              type="button"
              className="addEmployeeButton"
              onClick={() =>
                router.push(
                  '/module/administration/add-employee'
                )
              }
            >
              <FiUserPlus />
              Add Employee
            </button>

          </section>

          {/* =================================================
              TOOLBAR
          ================================================= */}

          <section className="toolbar">

            <div className="searchWrapper">

              <FiSearch className="searchIcon" />

              <input
                type="text"
                placeholder="Search by exact username..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchSubmit();
                  }
                }}
                className="searchInput"
              />

              {searchTerm && (
                <button
                  type="button"
                  className="clearSearch"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  <FiX />
                </button>
              )}

              <button
                type="button"
                className="searchButton"
                onClick={handleSearchSubmit}
              >
                Search
              </button>
            </div>

            <button
              type="button"
              className="refreshButton"
              onClick={() =>
                fetchEmployees(
                  searchQuery,
                  true
                )
              }
              disabled={refreshing}
              title="Refresh employees"
            >
              <FiRefreshCw
                className={
                  refreshing
                    ? 'refreshingIcon'
                    : ''
                }
              />

              <span>Refresh</span>
            </button>

          </section>

          {/* =================================================
              SEARCH STATUS
          ================================================= */}

          {searchQuery && (
            <div className="searchStatus">

              <div>
                <span className="searchStatusLabel">
                  Search results for
                </span>

                <strong>
                  "{searchQuery}"
                </strong>
              </div>

              <button
                type="button"
                onClick={handleClearSearch}
              >
                Clear search
                <FiX />
              </button>

            </div>
          )}

          {/* =================================================
              LIST HEADER
          ================================================= */}

          <div className="listHeader">

            <div>
              <h2>
                {searchQuery
                  ? 'Search Results'
                  : 'All Employees'}
              </h2>

              <p>
                {employees.length}{' '}
                {employees.length === 1
                  ? 'employee'
                  : 'employees'}
              </p>
            </div>

            <div className="countBadge">
              <FiUsers />
              {employees.length}
            </div>

          </div>

          {/* =================================================
              EMPTY STATE
          ================================================= */}

          {employees.length === 0 ? (
            <div className="emptyState">

              <div className="emptyStateIcon">
                {searchQuery ? (
                  <FiSearch />
                ) : (
                  <FiInbox />
                )}
              </div>

              <h2>
                {searchQuery
                  ? 'No employee found'
                  : 'No employees yet'}
              </h2>

              <p>
                {searchQuery
                  ? `We couldn't find an employee with the username "${searchQuery}".`
                  : 'Start building your team by adding your first employee.'}
              </p>

              {searchQuery ? (
                <button
                  type="button"
                  className="secondaryButton"
                  onClick={handleClearSearch}
                >
                  <FiX />
                  Clear Search
                </button>
              ) : (
                <button
                  type="button"
                  className="primaryButton"
                  onClick={() =>
                    router.push(
                      '/module/administration/add-employee'
                    )
                  }
                >
                  <FiUserPlus />
                  Add Employee
                </button>
              )}

            </div>
          ) : (
            /* =================================================
               EMPLOYEE GRID
            ================================================= */

            <div className="employeeGrid">
              {employees.map(renderEmployee)}
            </div>
          )}

        </main>

        {/* =================================================
            MOBILE ADD BUTTON
        ================================================= */}

        <button
          type="button"
          className="mobileAddButton"
          onClick={() =>
            router.push(
              '/module/administration/add-employee'
            )
          }
          aria-label="Add employee"
        >
          <FiPlus />
        </button>

      </div>

      <style jsx>{styles}</style>
    </>
  );
}

// =========================================================
// HEADER COMPONENT
// =========================================================

function EmployeeHeader({
  router,
  employeeCount,
}: {
  router: ReturnType<typeof useRouter>;
  employeeCount: number;
}) {
  return (
    <header className="topHeader">

      <div className="headerInner">

        <div className="headerLeft">

          <button
            type="button"
            className="backButton"
            onClick={() =>
              router.push(
                '/module/administration'
              )
            }
            aria-label="Back"
          >
            <FiArrowLeft />
          </button>

          <div className="headerIcon">
            <FiUsers />
          </div>

          <div className="headerText">
            <span className="headerSection">
              Administration
            </span>

            <span className="headerTitle">
              Employees
            </span>
          </div>

        </div>

        <div className="headerCount">

          <strong>{employeeCount}</strong>

          <span>
            {employeeCount === 1
              ? 'Employee'
              : 'Employees'}
          </span>

        </div>

      </div>

      <div className="headerAccent" />

    </header>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = `
  * {
    box-sizing: border-box;
  }

  .employeesPage {
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

    padding-bottom: 50px;
  }

  /* =======================================================
     HEADER
  ======================================================= */

  .topHeader {
    position: sticky;
    top: 0;
    z-index: 50;

    background: rgba(255, 255, 255, 0.96);

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
  }

  .headerLeft {
    display: flex;
    align-items: center;
    gap: 13px;
  }

  .backButton {
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
      color 0.18s ease,
      background 0.18s ease,
      border-color 0.18s ease,
      transform 0.18s ease;
  }

  .backButton svg {
    width: 18px;
    height: 18px;
  }

  .backButton:hover {
    color: #2563eb;
    background: #eff6ff;
    border-color: #bfdbfe;

    transform: translateX(-2px);
  }

  .headerIcon {
    width: 45px;
    height: 45px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 12px;

    background: #eff6ff;

    color: #2563eb;
  }

  .headerIcon svg {
    width: 21px;
    height: 21px;
  }

  .headerText {
    display: flex;
    flex-direction: column;
  }

  .headerSection {
    color: #94a3b8;

    font-size: 10px;
    line-height: 1.2;

    font-weight: 650;
  }

  .headerTitle {
    margin-top: 3px;

    color: #172033;

    font-size: 17px;
    line-height: 1.2;

    font-weight: 750;
  }

  .headerCount {
    min-width: 78px;

    padding: 9px 13px;

    display: flex;
    flex-direction: column;
    align-items: center;

    border: 1px solid #e5eaf1;
    border-radius: 10px;

    background: #f8fafc;
  }

  .headerCount strong {
    color: #2563eb;

    font-size: 19px;
    line-height: 1;

    font-weight: 750;
  }

  .headerCount span {
    margin-top: 4px;

    color: #94a3b8;

    font-size: 9px;
    font-weight: 650;
  }

  .headerAccent {
    height: 3px;

    background: #2563eb;
  }

  /* =======================================================
     CONTENT
  ======================================================= */

  .mainContent {
    width: min(1400px, calc(100% - 48px));

    margin: 0 auto;

    padding: 36px 0 60px;
  }

  /* =======================================================
     PAGE INTRO
  ======================================================= */

  .pageIntro {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;

    gap: 25px;

    margin-bottom: 28px;
  }

  .introLeft {
    min-width: 0;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 5px;

    margin-bottom: 9px;

    color: #94a3b8;

    font-size: 11px;
    font-weight: 600;
  }

  .breadcrumb button {
    all: unset;

    color: #64748b;

    cursor: pointer;

    transition: color 0.18s ease;
  }

  .breadcrumb button:hover {
    color: #2563eb;
  }

  .breadcrumb svg {
    width: 13px;
    height: 13px;
  }

  .pageIntro h1 {
    margin: 0;

    color: #172033;

    font-size: 32px;
    line-height: 1.15;

    font-weight: 750;

    letter-spacing: -0.7px;
  }

  .pageIntro p {
    margin: 8px 0 0;

    color: #64748b;

    font-size: 13px;
    line-height: 1.5;

    font-weight: 500;
  }

  .addEmployeeButton {
    all: unset;

    display: flex;
    align-items: center;
    gap: 8px;

    padding: 11px 16px;

    border-radius: 10px;

    background: #2563eb;

    color: #ffffff;

    cursor: pointer;

    font-size: 12px;
    font-weight: 650;

    box-shadow:
      0 5px 13px rgba(37, 99, 235, 0.18);

    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease;
  }

  .addEmployeeButton:hover {
    transform: translateY(-2px);

    box-shadow:
      0 8px 18px rgba(37, 99, 235, 0.24);
  }

  .addEmployeeButton svg {
    width: 16px;
    height: 16px;
  }

  /* =======================================================
     TOOLBAR
  ======================================================= */

  .toolbar {
    display: flex;
    align-items: center;

    gap: 11px;

    margin-bottom: 16px;
  }

  .searchWrapper {
    min-width: 0;
    flex: 1;

    height: 48px;

    display: flex;
    align-items: center;

    padding: 0 7px 0 14px;

    border: 1px solid #dfe5ed;
    border-radius: 12px;

    background: #ffffff;

    box-shadow:
      0 2px 5px rgba(15, 23, 42, 0.025);

    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease;
  }

  .searchWrapper:focus-within {
    border-color: #93c5fd;

    box-shadow:
      0 0 0 3px rgba(37, 99, 235, 0.07);
  }

  .searchIcon {
    width: 18px;
    height: 18px;

    flex-shrink: 0;

    color: #94a3b8;
  }

  .searchInput {
    min-width: 0;
    flex: 1;

    height: 100%;

    margin-left: 10px;

    border: none;
    outline: none;

    background: transparent;

    color: #1e293b;

    font-family: inherit;
    font-size: 13px;
  }

  .searchInput::placeholder {
    color: #a0aec0;
  }

  .clearSearch {
    all: unset;

    width: 30px;
    height: 30px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 7px;

    color: #94a3b8;

    cursor: pointer;
  }

  .clearSearch:hover {
    background: #f1f5f9;
    color: #475569;
  }

  .clearSearch svg {
    width: 16px;
    height: 16px;
  }

  .searchButton {
    all: unset;

    height: 36px;

    display: flex;
    align-items: center;

    padding: 0 15px;

    border-radius: 8px;

    background: #eff6ff;

    color: #2563eb;

    cursor: pointer;

    font-size: 11px;
    font-weight: 700;

    transition:
      background 0.18s ease;
  }

  .searchButton:hover {
    background: #dbeafe;
  }

  .refreshButton {
    height: 48px;

    display: flex;
    align-items: center;
    gap: 7px;

    padding: 0 15px;

    border: 1px solid #dfe5ed;
    border-radius: 12px;

    background: #ffffff;

    color: #64748b;

    cursor: pointer;

    font-family: inherit;

    font-size: 12px;
    font-weight: 600;

    transition:
      background 0.18s ease,
      color 0.18s ease,
      border-color 0.18s ease;
  }

  .refreshButton:hover:not(:disabled) {
    color: #2563eb;

    border-color: #bfdbfe;

    background: #eff6ff;
  }

  .refreshButton:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .refreshButton svg {
    width: 16px;
    height: 16px;
  }

  .refreshingIcon {
    animation: spin 0.8s linear infinite;
  }

  /* =======================================================
     SEARCH STATUS
  ======================================================= */

  .searchStatus {
    min-height: 43px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 15px;

    padding: 8px 12px;

    margin-bottom: 16px;

    border: 1px solid #dbeafe;
    border-radius: 10px;

    background: #eff6ff;

    color: #475569;

    font-size: 11px;
  }

  .searchStatus > div {
    display: flex;
    align-items: center;
    gap: 5px;

    min-width: 0;
  }

  .searchStatusLabel {
    color: #64748b;
  }

  .searchStatus strong {
    overflow: hidden;

    color: #2563eb;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .searchStatus button {
    all: unset;

    display: flex;
    align-items: center;
    gap: 4px;

    color: #2563eb;

    cursor: pointer;

    font-size: 10px;
    font-weight: 700;

    white-space: nowrap;
  }

  .searchStatus button svg {
    width: 13px;
    height: 13px;
  }

  /* =======================================================
     LIST HEADER
  ======================================================= */

  .listHeader {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;

    margin-bottom: 15px;
  }

  .listHeader h2 {
    margin: 0;

    color: #1e293b;

    font-size: 18px;
    line-height: 1.3;

    font-weight: 700;
  }

  .listHeader p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 11px;
    font-weight: 500;
  }

  .countBadge {
    display: flex;
    align-items: center;
    gap: 6px;

    padding: 7px 10px;

    border: 1px solid #e2e8f0;
    border-radius: 8px;

    background: #ffffff;

    color: #64748b;

    font-size: 11px;
    font-weight: 650;
  }

  .countBadge svg {
    width: 14px;
    height: 14px;

    color: #2563eb;
  }

  /* =======================================================
     EMPLOYEE GRID
  ======================================================= */

  .employeeGrid {
    display: grid;

    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );

    gap: 14px;
  }

  /* =======================================================
     EMPLOYEE CARD
  ======================================================= */

  .employeeCard {
    all: unset;

    position: relative;

    min-width: 0;
    min-height: 116px;

    padding: 20px;

    display: flex;
    align-items: center;

    gap: 14px;

    border: 1px solid #e5eaf1;
    border-radius: 15px;

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

  .employeeCard::before {
    content: '';

    position: absolute;

    top: 0;
    left: 0;

    width: 3px;
    height: 100%;

    background: #2563eb;

    opacity: 0;

    transition: opacity 0.2s ease;
  }

  .employeeCard:hover {
    transform: translateY(-3px);

    border-color: #bfdbfe;

    box-shadow:
      0 10px 25px rgba(15, 23, 42, 0.08);
  }

  .employeeCard:hover::before {
    opacity: 1;
  }

  .employeeCard:focus-visible {
    outline: 3px solid #dbeafe;
    outline-offset: 2px;
  }

  .cardNumber {
    position: absolute;

    top: 13px;
    right: 15px;

    color: #d3dbe7;

    font-size: 9px;
    font-weight: 750;

    letter-spacing: 0.5px;
  }

  .avatarWrapper {
    flex-shrink: 0;

    width: 56px;
    height: 56px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 15px;

    background: #f1f5f9;

    overflow: hidden;
  }

  .employeeInfo {
    min-width: 0;

    flex: 1;

    display: flex;
    flex-direction: column;

    text-align: left;

    padding-right: 25px;
  }

  .employeeName {
    overflow: hidden;

    color: #1e293b;

    font-size: 15px;
    line-height: 1.35;

    font-weight: 700;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .employeeUsername {
    margin-top: 3px;

    overflow: hidden;

    color: #64748b;

    font-size: 11px;
    line-height: 1.3;

    font-weight: 500;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .employeeMeta {
    display: flex;
    align-items: center;

    margin-top: 7px;
  }

  .employeeId {
    padding: 4px 7px;

    border-radius: 6px;

    background: #f8fafc;

    color: #94a3b8;

    font-size: 9px;
    font-weight: 650;
  }

  .editButton {
    position: absolute;

    right: 16px;
    bottom: 16px;

    width: 31px;
    height: 31px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;

    background: #eff6ff;

    color: #2563eb;

    transition:
      transform 0.18s ease,
      background 0.18s ease;
  }

  .editButton svg {
    width: 14px;
    height: 14px;
  }

  .employeeCard:hover .editButton {
    transform: translateX(2px);
    background: #dbeafe;
  }

  /* =======================================================
     EMPTY STATE
  ======================================================= */

  .emptyState {
    padding: 60px 25px;

    display: flex;
    flex-direction: column;
    align-items: center;

    border: 1px solid #e5eaf1;
    border-radius: 16px;

    background: #ffffff;

    box-shadow:
      0 3px 10px rgba(15, 23, 42, 0.025);

    text-align: center;
  }

  .emptyStateIcon {
    width: 64px;
    height: 64px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 17px;

    background: #eff6ff;

    color: #2563eb;
  }

  .emptyStateIcon svg {
    width: 28px;
    height: 28px;
  }

  .emptyState h2 {
    margin: 18px 0 0;

    color: #1e293b;

    font-size: 19px;
    font-weight: 700;
  }

  .emptyState p {
    max-width: 430px;

    margin: 7px 0 0;

    color: #64748b;

    font-size: 12px;
    line-height: 1.6;
  }

  /* =======================================================
     BUTTONS
  ======================================================= */

  .primaryButton,
  .secondaryButton {
    all: unset;

    margin-top: 22px;

    display: flex;
    align-items: center;
    gap: 7px;

    padding: 10px 15px;

    border-radius: 9px;

    cursor: pointer;

    font-size: 12px;
    font-weight: 650;
  }

  .primaryButton {
    background: #2563eb;
    color: #ffffff;

    box-shadow:
      0 5px 13px rgba(37, 99, 235, 0.17);
  }

  .secondaryButton {
    border: 1px solid #dfe5ed;
    background: #ffffff;
    color: #475569;
  }

  .primaryButton svg,
  .secondaryButton svg {
    width: 15px;
    height: 15px;
  }

  /* =======================================================
     ERROR
  ======================================================= */

  .stateCard {
    width: min(450px, calc(100% - 40px));

    margin: 90px auto;

    padding: 42px 30px;

    display: flex;
    flex-direction: column;
    align-items: center;

    border: 1px solid #e5eaf1;
    border-radius: 18px;

    background: #ffffff;

    box-shadow:
      0 12px 35px rgba(15, 23, 42, 0.06);

    text-align: center;
  }

  .stateIcon {
    width: 66px;
    height: 66px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 17px;
  }

  .stateIcon svg {
    width: 29px;
    height: 29px;
  }

  .errorIcon {
    background: #fef2f2;
    color: #ef4444;
  }

  .stateCard h2 {
    margin: 19px 0 0;

    color: #1e293b;

    font-size: 20px;
    font-weight: 700;
  }

  .stateCard p {
    margin: 7px 0 0;

    color: #64748b;

    font-size: 12px;
    line-height: 1.6;
  }

  /* =======================================================
     LOADING SKELETON
  ======================================================= */

  .loadingHeader {
    margin-bottom: 27px;
  }

  .skeletonSearch {
    width: 100%;
    height: 48px;

    margin-bottom: 22px;

    border-radius: 12px;

    background:
      linear-gradient(
        90deg,
        #edf1f5 25%,
        #f7f9fb 50%,
        #edf1f5 75%
      );

    background-size: 200% 100%;

    animation: skeleton 1.4s infinite;
  }

  .skeleton {
    border-radius: 7px;

    background:
      linear-gradient(
        90deg,
        #e9edf2 25%,
        #f6f8fa 50%,
        #e9edf2 75%
      );

    background-size: 200% 100%;

    animation: skeleton 1.4s infinite;
  }

  .skeletonTitle {
    width: 180px;
    height: 28px;
  }

  .skeletonSubtitle {
    width: 300px;
    height: 12px;

    margin-top: 9px;
  }

  .employeeSkeleton {
    min-height: 116px;

    padding: 20px;

    display: flex;
    align-items: center;
    gap: 14px;

    border: 1px solid #e8ecf1;
    border-radius: 15px;

    background: #ffffff;
  }

  .skeletonAvatar {
    width: 56px;
    height: 56px;

    flex-shrink: 0;

    border-radius: 15px;
  }

  .skeletonInfo {
    flex: 1;
  }

  .skeletonName {
    width: 45%;
    height: 15px;
  }

  .skeletonSmall {
    width: 30%;
    height: 10px;

    margin-top: 8px;
  }

  .skeletonTiny {
    width: 20%;
    height: 8px;

    margin-top: 9px;
  }

  /* =======================================================
     MOBILE ADD BUTTON
  ======================================================= */

  .mobileAddButton {
    display: none;
  }

  /* =======================================================
     RESPONSIVE
  ======================================================= */

  @media (max-width: 900px) {
    .employeeGrid {
      grid-template-columns: 1fr;
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

    .headerCount {
      display: none;
    }

    .mainContent {
      padding-top: 27px;
    }

    .pageIntro {
      align-items: flex-start;
      flex-direction: column;
      gap: 17px;
    }

    .pageIntro h1 {
      font-size: 28px;
    }

    .addEmployeeButton {
      width: 100%;

      justify-content: center;
    }

    .toolbar {
      align-items: stretch;
      flex-direction: column;
    }

    .refreshButton {
      justify-content: center;
    }

    .employeeCard {
      min-height: 108px;
      padding: 17px;
    }

    .employeeInfo {
      padding-right: 30px;
    }

    .employeeName {
      font-size: 14px;
    }

    .mobileAddButton {
      position: fixed;

      right: 18px;
      bottom: 20px;

      z-index: 40;

      width: 52px;
      height: 52px;

      display: flex;
      align-items: center;
      justify-content: center;

      border: none;
      border-radius: 16px;

      background: #2563eb;

      color: #ffffff;

      cursor: pointer;

      box-shadow:
        0 9px 24px rgba(37, 99, 235, 0.28);
    }

    .mobileAddButton svg {
      width: 24px;
      height: 24px;
    }
  }

  @media (max-width: 430px) {
    .headerText {
      min-width: 0;
    }

    .headerTitle {
      font-size: 15px;
    }

    .headerSection {
      font-size: 9px;
    }

    .searchButton {
      padding: 0 11px;
    }

    .searchWrapper {
      padding-left: 11px;
    }

    .searchInput {
      font-size: 12px;
    }

    .searchStatus {
      align-items: flex-start;
      flex-direction: column;
    }

    .searchStatus button {
      align-self: flex-end;
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

  @keyframes skeleton {
    0% {
      background-position: 200% 0;
    }

    100% {
      background-position: -200% 0;
    }
  }
`;