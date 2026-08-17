import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

import {
  axiosInstance,
  listRoles,
  getRootDepartments,
  findEmployeeByUsername,
  advancedSearchEmployees,
} from '@b2b/api-client';

import { useUserAuthStore } from '../../../store/userAuthStore';
import { CompanyEmployee, Role, Department } from '@b2b/shared-types';
import { UserAvatar } from '../../../components/UserAvatar';

import {
  FiSearch,
  FiX,
  FiChevronDown,
  FiChevronRight,
  FiCheck,
  FiArrowLeft,
  FiRefreshCw,
  FiUsers,
  FiSliders,
  FiUser,
  FiBriefcase,
} from 'react-icons/fi';


// =========================================================
// SELECT MODAL
// =========================================================

const SelectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: Array<{ id: string; name: string }>;
  selectedId?: string;
  onSelect: (id: string) => void;
}> = ({
  isOpen,
  onClose,
  title,
  items,
  selectedId,
  onSelect,
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
        {/* Modal header */}
        <div className="modalHeader">
          <div>
            <span className="modalEyebrow">
              FILTER
            </span>

            <h3>{title}</h3>
          </div>

          <button
            type="button"
            className="modalCloseButton"
            onClick={onClose}
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>

        {/* Options */}
        <div className="modalOptions">
          {items.map((item) => {
            const isSelected = selectedId === item.id;

            return (
              <button
                type="button"
                key={item.id}
                className={`modalOption ${
                  isSelected ? 'selected' : ''
                }`}
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
              >
                <span>{item.name}</span>

                {isSelected && (
                  <span className="selectedCheck">
                    <FiCheck />
                  </span>
                )}
              </button>
            );
          })}

          {items.length === 0 && (
            <div className="modalEmpty">
              No options available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// =========================================================
// EMPLOYEE SEARCH SCREEN
// =========================================================

export default function EmployeeSearchScreen() {
  const router = useRouter();

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  // =======================================================
  // SEARCH
  // =======================================================

  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const limit = 20;

  // =======================================================
  // FILTERS
  // =======================================================

  const [selectedRoleId, setSelectedRoleId] =
    useState<string | undefined>(undefined);

  const [selectedDeptId, setSelectedDeptId] =
    useState<string | undefined>(undefined);

  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [loadingFilters, setLoadingFilters] =
    useState(true);

  // =======================================================
  // MODALS
  // =======================================================

  const [roleModalOpen, setRoleModalOpen] =
    useState(false);

  const [deptModalOpen, setDeptModalOpen] =
    useState(false);

  // =======================================================
  // FETCH FILTER DATA
  // =======================================================

  useEffect(() => {
    const fetchFilters = async () => {
      if (!accessToken || !companyId || !deviceId) {
        setLoadingFilters(false);
        return;
      }

      try {
        const [rolesRes, deptsRes] =
          await Promise.all([
            listRoles(
              companyId,
              deviceId,
              {
                page: 1,
                limit: 100,
              },
              accessToken
            ),

            getRootDepartments(
              companyId,
              deviceId,
              accessToken
            ),
          ]);

        setRoles(
          rolesRes.data?.roles || []
        );

        setDepartments(
          deptsRes.data || []
        );
      } catch (error) {
        console.error(
          'Failed to load filters',
          error
        );
      } finally {
        setLoadingFilters(false);
      }
    };

    fetchFilters();
  }, [
    accessToken,
    companyId,
    deviceId,
  ]);

  // =======================================================
  // LOAD EMPLOYEES
  // =======================================================

  const loadEmployees = useCallback(
    async (
      reset = true
    ) => {
      if (
        !accessToken ||
        !companyId ||
        !deviceId
      ) {
        return;
      }

      const currentOffset = reset
        ? 0
        : offset;

      setLoading(true);

      try {
        const hasSearch =
          searchQuery.trim().length > 0;

        const hasFilters =
          !!(
            selectedRoleId ||
            selectedDeptId
          );

        // ---------------------------------------------------
        // EXACT USERNAME SEARCH
        // ---------------------------------------------------

        if (hasSearch) {
          try {
            const res =
              await findEmployeeByUsername(
                companyId,
                deviceId,
                searchQuery.trim(),
                accessToken
              );

            const employee =
              (res.data as any)?.employee ||
              null;

            setEmployees(
              employee
                ? [employee]
                : []
            );

            setOffset(
              employee ? 1 : 0
            );

            setHasMore(false);
          } catch (error) {
            setEmployees([]);
            setOffset(0);
            setHasMore(false);
          }

          return;
        }

        // ---------------------------------------------------
        // FILTERED SEARCH
        // ---------------------------------------------------

        if (hasFilters) {
          const params: any = {
            limit,
            offset: currentOffset,
          };

          if (selectedRoleId) {
            params.role_id =
              selectedRoleId;
          }

          if (selectedDeptId) {
            params.department_id =
              selectedDeptId;
          }

          const res =
            await advancedSearchEmployees(
              companyId,
              deviceId,
              params,
              accessToken
            );

          const data =
            res.data?.employees || [];

          if (reset) {
            setEmployees(data);
            setOffset(data.length);
          } else {
            setEmployees((prev) => [
              ...prev,
              ...data,
            ]);

            setOffset(
              (prev) =>
                prev + data.length
            );
          }

          setHasMore(
            data.length === limit
          );

          return;
        }

        // ---------------------------------------------------
        // ALL EMPLOYEES
        // ---------------------------------------------------

        const url =
          `/companies/${companyId}/getemployees`;

        const headers = {
          'X-Company-ID': companyId,
          'X-Device-ID': deviceId,
          Authorization:
            `Bearer ${accessToken}`,
          'Content-Type':
            'application/json',
        };

        const response =
          await axiosInstance.get(
            url,
            {
              headers,
              params: {
                limit,
                offset:
                  currentOffset,
              },
            }
          );

        const data =
          response.data?.data
            ?.employees || [];

        if (reset) {
          setEmployees(data);
          setOffset(data.length);
        } else {
          setEmployees((prev) => [
            ...prev,
            ...data,
          ]);

          setOffset(
            (prev) =>
              prev + data.length
          );
        }

        setHasMore(
          data.length === limit
        );
      } catch (error: any) {
        console.error(
          'Failed to load employees',
          error
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      accessToken,
      companyId,
      deviceId,
      searchQuery,
      selectedRoleId,
      selectedDeptId,
      offset,
    ]
  );

  // =======================================================
  // SEARCH / FILTER CHANGE
  // =======================================================

  useEffect(() => {
    setOffset(0);

    loadEmployees(true);
  }, [
    searchQuery,
    selectedRoleId,
    selectedDeptId,
  ]);

  // =======================================================
  // REFRESH
  // =======================================================

  const onRefresh = () => {
    setRefreshing(true);
    setOffset(0);

    loadEmployees(true);
  };

  // =======================================================
  // LOAD MORE
  // =======================================================

  const loadMore = () => {
    if (
      !loading &&
      hasMore &&
      !refreshing &&
      !searchQuery.trim()
    ) {
      loadEmployees(false);
    }
  };

  // =======================================================
  // CLEAR FILTERS
  // =======================================================

  const clearFilters = () => {
    setSelectedRoleId(undefined);
    setSelectedDeptId(undefined);

    setSearchTerm('');
    setSearchQuery('');
  };

  // =======================================================
  // SEARCH
  // =======================================================

  const performSearch = () => {
    setSearchQuery(
      searchTerm.trim()
    );
  };

  // =======================================================
  // SELECTED LABELS
  // =======================================================

  const selectedRoleName =
    roles.find(
      (role) =>
        role.role_id ===
        selectedRoleId
    )?.role_name;

  const selectedDeptName =
    departments.find(
      (dept) =>
        dept.department_id ===
        selectedDeptId
    )?.department_name;

  const hasActiveFilters =
    !!(
      selectedRoleId ||
      selectedDeptId ||
      searchQuery
    );

  // =======================================================
  // EMPLOYEE CARD
  // =======================================================

  const renderEmployee = (
    item: CompanyEmployee
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
            `/module/administration/employee-detail?userId=${item.user_id}`
          )
        }
      >
        {/* Avatar */}
        <div className="employeeAvatar">
          <UserAvatar
            userId={item.user_id}
            username={item.username}
            fullName={item.full_name}
            size={52}
            className=""
          />
        </div>

        {/* Employee info */}
        <div className="employeeInfo">

          <div className="employeeNameRow">
            <span className="employeeName">
              {displayName}
            </span>

            <span className="employeeStatus">
              Active
            </span>
          </div>

          {item.username && (
            <span className="employeeUsername">
              @{item.username}
            </span>
          )}

          <div className="employeeMeta">
            <span>
              <FiBriefcase />
              ID: {item.employee_id || 'N/A'}
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div className="employeeArrow">
          <FiChevronRight />
        </div>
      </button>
    );
  };

  // =======================================================
  // FILTER LOADING
  // =======================================================

  if (loadingFilters) {
    return (
      <>
        <div className="employeePage loadingPage">
          <div className="loadingCard">
            <div className="spinner" />

            <h2>
              Loading employee directory
            </h2>

            <p>
              Preparing search and filters...
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
              onClick={() =>
                router.back()
              }
              aria-label="Go back"
            >
              <FiArrowLeft />
            </button>

            <div className="headerIcon">
              <FiUsers />
            </div>

            <div className="headerText">
              <div className="breadcrumb">
                <span>
                  Administration
                </span>

                <FiChevronRight />

                <span>
                  Employees
                </span>
              </div>

              <h1>
                Employee Directory
              </h1>

              <p>
                Search and manage company employees
              </p>
            </div>

            <button
              type="button"
              className="headerRefresh"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh employees"
            >
              <FiRefreshCw
                className={
                  refreshing
                    ? 'rotating'
                    : ''
                }
              />
            </button>
          </div>

          <div className="headerAccent" />
        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="content">

          {/* =================================================
              SEARCH PANEL
          ================================================= */}

          <section className="searchPanel">

            <div className="searchHeading">
              <div>
                <h2>
                  Find an employee
                </h2>

                <p>
                  Search by exact username
                  or narrow the results using
                  filters.
                </p>
              </div>

              <div className="directoryCount">
                <FiUsers />

                <span>
                  {employees.length}
                </span>

                <small>
                  {employees.length === 1
                    ? 'result'
                    : 'results'}
                </small>
              </div>
            </div>

            {/* Search box */}
            <div className="searchBox">

              <FiSearch className="searchIcon" />

              <input
                type="text"
                placeholder="Enter exact username..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter'
                  ) {
                    performSearch();
                  }
                }}
              />

              {searchTerm && (
                <button
                  type="button"
                  className="clearSearch"
                  onClick={() => {
                    setSearchTerm('');
                    setSearchQuery('');
                  }}
                  aria-label="Clear search"
                >
                  <FiX />
                </button>
              )}

              <button
                type="button"
                className="searchButton"
                onClick={performSearch}
              >
                Search
              </button>
            </div>

            {/* Filters */}
            <div className="filterArea">

              <div className="filterLabel">
                <FiSliders />
                <span>
                  Filters
                </span>
              </div>

              <div className="filterButtons">

                <button
                  type="button"
                  className={`filterButton ${
                    selectedRoleId
                      ? 'active'
                      : ''
                  }`}
                  onClick={() =>
                    setRoleModalOpen(true)
                  }
                >
                  <span>
                    {selectedRoleName ||
                      'All Roles'}
                  </span>

                  <FiChevronDown />
                </button>

                <button
                  type="button"
                  className={`filterButton ${
                    selectedDeptId
                      ? 'active'
                      : ''
                  }`}
                  onClick={() =>
                    setDeptModalOpen(true)
                  }
                >
                  <span>
                    {selectedDeptName ||
                      'All Departments'}
                  </span>

                  <FiChevronDown />
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    className="clearFilters"
                    onClick={
                      clearFilters
                    }
                  >
                    <FiX />
                    Clear all
                  </button>
                )}

              </div>
            </div>

            {/* Active filter summary */}
            {hasActiveFilters && (
              <div className="activeFilters">

                {searchQuery && (
                  <span className="activeTag">
                    <FiSearch />
                    Username: {searchQuery}
                  </span>
                )}

                {selectedRoleName && (
                  <span className="activeTag">
                    Role: {selectedRoleName}
                  </span>
                )}

                {selectedDeptName && (
                  <span className="activeTag">
                    Department:{' '}
                    {selectedDeptName}
                  </span>
                )}

              </div>
            )}
          </section>

          {/* =================================================
              RESULTS
          ================================================= */}

          <section className="resultsSection">

            <div className="resultsHeader">
              <div>
                <h2>
                  Employees
                </h2>

                <p>
                  {searchQuery ||
                  selectedRoleId ||
                  selectedDeptId
                    ? 'Matching employees'
                    : 'All employees'}
                </p>
              </div>

              {!loading &&
                employees.length > 0 && (
                  <span className="resultBadge">
                    {employees.length}
                    {hasMore
                      ? '+'
                      : ''}{' '}
                    found
                  </span>
                )}
            </div>

            {/* Initial loading */}
            {loading &&
            employees.length === 0 ? (
              <div className="resultsLoading">
                <div className="spinner small" />

                <span>
                  Searching employees...
                </span>
              </div>
            ) : employees.length ===
              0 ? (

              /* Empty */
              <div className="emptyResults">

                <div className="emptyResultsIcon">
                  {hasActiveFilters ? (
                    <FiSearch />
                  ) : (
                    <FiUser />
                  )}
                </div>

                <h3>
                  {hasActiveFilters
                    ? 'No employees found'
                    : 'No employees to display'}
                </h3>

                <p>
                  {hasActiveFilters
                    ? 'Try changing your search or filter criteria.'
                    : 'Employees will appear here when they are available.'}
                </p>

                {hasActiveFilters && (
                  <button
                    type="button"
                    className="emptyClearButton"
                    onClick={
                      clearFilters
                    }
                  >
                    Clear filters
                  </button>
                )}
              </div>

            ) : (

              /* Employee list */
              <div className="employeeList">

                {employees.map(
                  renderEmployee
                )}

                {/* Loading more */}
                {loading &&
                  employees.length >
                    0 && (
                    <div className="loadMoreLoading">
                      <div className="spinner tiny" />
                      <span>
                        Loading more...
                      </span>
                    </div>
                  )}

                {/* Load more */}
                {hasMore &&
                  !loading &&
                  !searchQuery.trim() && (
                    <button
                      type="button"
                      className="loadMoreButton"
                      onClick={
                        loadMore
                      }
                    >
                      Load more employees
                      <FiChevronDown />
                    </button>
                  )}

              </div>
            )}

          </section>
        </main>

        {/* =================================================
            FLOATING REFRESH
        ================================================= */}

        <button
          type="button"
          className="floatingRefresh"
          onClick={onRefresh}
          disabled={refreshing}
          title="Refresh"
          aria-label="Refresh"
        >
          <FiRefreshCw
            className={
              refreshing
                ? 'rotating'
                : ''
            }
          />
        </button>
      </div>

      {/* =================================================
          ROLE MODAL
      ================================================= */}

      <SelectModal
        isOpen={roleModalOpen}
        onClose={() =>
          setRoleModalOpen(false)
        }
        title="Filter by Role"
        items={[
          {
            id: '',
            name: 'All Roles',
          },
          ...roles.map((role) => ({
            id: role.role_id,
            name: role.role_name,
          })),
        ]}
        selectedId={
          selectedRoleId || ''
        }
        onSelect={(id) =>
          setSelectedRoleId(
            id || undefined
          )
        }
      />

      {/* =================================================
          DEPARTMENT MODAL
      ================================================= */}

      <SelectModal
        isOpen={deptModalOpen}
        onClose={() =>
          setDeptModalOpen(false)
        }
        title="Filter by Department"
        items={[
          {
            id: '',
            name: 'All Departments',
          },
          ...departments.map(
            (dept) => ({
              id: dept.department_id,
              name:
                dept.department_name,
            })
          ),
        ]}
        selectedId={
          selectedDeptId || ''
        }
        onSelect={(id) =>
          setSelectedDeptId(
            id || undefined
          )
        }
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

  .employeePage {
    min-height: 100vh;

    background:
      radial-gradient(
        circle at 0% 0%,
        rgba(37, 99, 235, 0.055),
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

    padding-bottom: 60px;
  }

  /* =======================================================
     HEADER
  ======================================================= */

  .pageHeader {
    position: sticky;
    top: 0;
    z-index: 30;

    background: rgba(255,255,255,0.95);

    border-bottom: 1px solid #e7ebf1;

    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);

    box-shadow:
      0 2px 10px rgba(15,23,42,0.035);
  }

  .headerInner {
    width: min(
      1200px,
      calc(100% - 48px)
    );

    min-height: 108px;

    margin: 0 auto;

    display: flex;
    align-items: center;

    gap: 15px;
  }

  .headerAccent {
    height: 3px;

    background:
      linear-gradient(
        90deg,
        #2563eb,
        #3b82f6
      );
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
    width: 19px;
    height: 19px;
  }

  .headerIcon {
    width: 56px;
    height: 56px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 14px;

    background: #eff6ff;

    color: #2563eb;

    border: 1px solid #dbeafe;
  }

  .headerIcon svg {
    width: 25px;
    height: 25px;
  }

  .headerText {
    min-width: 0;
    flex: 1;
  }

  .breadcrumb {
    display: flex;
    align-items: center;

    gap: 5px;

    margin-bottom: 4px;

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
    line-height: 1.15;

    font-weight: 750;

    letter-spacing: -0.55px;
  }

  .headerText p {
    margin: 5px 0 0;

    color: #64748b;

    font-size: 12px;

    font-weight: 500;
  }

  .headerRefresh {
    all: unset;

    width: 40px;
    height: 40px;

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
      color 0.18s ease;
  }

  .headerRefresh:hover {
    color: #2563eb;
    background: #eff6ff;
  }

  .headerRefresh:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .headerRefresh svg {
    width: 17px;
    height: 17px;
  }

  /* =======================================================
     CONTENT
  ======================================================= */

  .content {
    width: min(
      1200px,
      calc(100% - 48px)
    );

    margin: 0 auto;
  }

  /* =======================================================
     SEARCH PANEL
  ======================================================= */

  .searchPanel {
    margin-top: 30px;

    padding: 24px;

    border: 1px solid #e4e9f0;
    border-radius: 17px;

    background: #ffffff;

    box-shadow:
      0 4px 15px rgba(15,23,42,0.035);
  }

  .searchHeading {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;

    margin-bottom: 18px;
  }

  .searchHeading h2 {
    margin: 0;

    color: #1e293b;

    font-size: 17px;
    font-weight: 700;
  }

  .searchHeading p {
    margin: 5px 0 0;

    color: #94a3b8;

    font-size: 12px;
    font-weight: 500;
  }

  .directoryCount {
    display: flex;
    align-items: center;
    gap: 6px;

    padding: 8px 11px;

    border: 1px solid #e2e8f0;
    border-radius: 9px;

    background: #f8fafc;

    color: #64748b;

    white-space: nowrap;
  }

  .directoryCount svg {
    width: 14px;
    height: 14px;

    color: #2563eb;
  }

  .directoryCount span {
    color: #1e293b;

    font-size: 14px;
    font-weight: 750;
  }

  .directoryCount small {
    color: #94a3b8;

    font-size: 10px;
    font-weight: 600;
  }

  /* =======================================================
     SEARCH BOX
  ======================================================= */

  .searchBox {
    height: 52px;

    display: flex;
    align-items: center;

    padding: 5px 5px 5px 15px;

    border: 1px solid #dce3ec;
    border-radius: 12px;

    background: #f9fafc;

    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease,
      background 0.18s ease;
  }

  .searchBox:focus-within {
    border-color: #93c5fd;

    background: #ffffff;

    box-shadow:
      0 0 0 3px rgba(37,99,235,0.08);
  }

  .searchIcon {
    width: 18px;
    height: 18px;

    flex-shrink: 0;

    color: #94a3b8;
  }

  .searchBox input {
    flex: 1;

    min-width: 0;

    height: 100%;

    padding: 0 12px;

    border: none;
    outline: none;

    background: transparent;

    color: #1e293b;

    font-family: inherit;

    font-size: 13px;
    font-weight: 500;
  }

  .searchBox input::placeholder {
    color: #a0aabd;
  }

  .clearSearch {
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

  .clearSearch:hover {
    background: #f1f5f9;
    color: #475569;
  }

  .clearSearch svg {
    width: 16px;
    height: 16px;
  }

  .searchButton {
    height: 40px;

    padding: 0 20px;

    border: none;
    border-radius: 9px;

    background: #2563eb;

    color: #ffffff;

    cursor: pointer;

    font-family: inherit;

    font-size: 12px;
    font-weight: 650;

    transition:
      background 0.18s ease,
      transform 0.18s ease;
  }

  .searchButton:hover {
    background: #1d4ed8;

    transform: translateY(-1px);
  }

  /* =======================================================
     FILTERS
  ======================================================= */

  .filterArea {
    display: flex;
    align-items: center;

    gap: 14px;

    margin-top: 17px;
  }

  .filterLabel {
    display: flex;
    align-items: center;
    gap: 6px;

    color: #64748b;

    font-size: 11px;
    font-weight: 650;
  }

  .filterLabel svg {
    width: 14px;
    height: 14px;
  }

  .filterButtons {
    display: flex;
    align-items: center;
    flex-wrap: wrap;

    gap: 8px;
  }

  .filterButton {
    all: unset;

    min-height: 33px;

    display: flex;
    align-items: center;
    gap: 7px;

    padding: 0 11px;

    border: 1px solid #e1e7ef;
    border-radius: 9px;

    background: #ffffff;

    color: #64748b;

    cursor: pointer;

    font-size: 11px;
    font-weight: 600;

    transition:
      background 0.18s ease,
      border-color 0.18s ease,
      color 0.18s ease;
  }

  .filterButton:hover,
  .filterButton.active {
    border-color: #bfdbfe;

    background: #eff6ff;

    color: #2563eb;
  }

  .filterButton svg {
    width: 14px;
    height: 14px;
  }

  .clearFilters {
    all: unset;

    display: flex;
    align-items: center;
    gap: 4px;

    padding: 5px 7px;

    color: #64748b;

    cursor: pointer;

    font-size: 11px;
    font-weight: 600;
  }

  .clearFilters:hover {
    color: #ef4444;
  }

  .clearFilters svg {
    width: 13px;
    height: 13px;
  }

  /* =======================================================
     ACTIVE FILTERS
  ======================================================= */

  .activeFilters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;

    gap: 7px;

    margin-top: 15px;
    padding-top: 14px;

    border-top: 1px solid #eef1f5;
  }

  .activeTag {
    display: flex;
    align-items: center;

    padding: 5px 8px;

    border-radius: 7px;

    background: #eff6ff;

    color: #2563eb;

    font-size: 10px;
    font-weight: 650;
  }

  .activeTag svg {
    width: 12px;
    height: 12px;

    margin-right: 4px;
  }

  /* =======================================================
     RESULTS
  ======================================================= */

  .resultsSection {
    margin-top: 30px;
  }

  .resultsHeader {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;

    margin-bottom: 15px;
  }

  .resultsHeader h2 {
    margin: 0;

    color: #1e293b;

    font-size: 18px;
    font-weight: 700;
  }

  .resultsHeader p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 11px;
    font-weight: 500;
  }

  .resultBadge {
    padding: 6px 9px;

    border: 1px solid #e2e8f0;
    border-radius: 7px;

    background: #ffffff;

    color: #64748b;

    font-size: 10px;
    font-weight: 650;
  }

  /* =======================================================
     EMPLOYEE LIST
  ======================================================= */

  .employeeList {
    display: flex;
    flex-direction: column;

    gap: 10px;
  }

  .employeeCard {
    all: unset;

    position: relative;

    min-width: 0;

    display: flex;
    align-items: center;

    gap: 14px;

    padding: 15px 17px;

    border: 1px solid #e5eaf1;
    border-radius: 14px;

    background: #ffffff;

    cursor: pointer;

    box-shadow:
      0 2px 5px rgba(15,23,42,0.02);

    transition:
      transform 0.18s ease,
      border-color 0.18s ease,
      box-shadow 0.18s ease,
      background 0.18s ease;
  }

  .employeeCard:hover {
    transform: translateY(-2px);

    border-color: #bfdbfe;

    background: #ffffff;

    box-shadow:
      0 9px 22px rgba(15,23,42,0.065);
  }

  .employeeCard:focus-visible {
    outline: 3px solid rgba(37,99,235,0.12);
    outline-offset: 2px;
  }

  .employeeAvatar {
    width: 52px;
    height: 52px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 13px;

    overflow: hidden;

    background: #eff6ff;
  }

  .employeeInfo {
    min-width: 0;
    flex: 1;

    display: flex;
    flex-direction: column;
  }

  .employeeNameRow {
    display: flex;
    align-items: center;

    gap: 8px;

    min-width: 0;
  }

  .employeeName {
    overflow: hidden;

    color: #1e293b;

    font-size: 14px;
    line-height: 1.3;

    font-weight: 700;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .employeeStatus {
    flex-shrink: 0;

    padding: 3px 6px;

    border-radius: 5px;

    background: #ecfdf5;

    color: #059669;

    font-size: 8px;
    line-height: 1;

    font-weight: 750;

    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .employeeUsername {
    margin-top: 4px;

    overflow: hidden;

    color: #64748b;

    font-size: 11px;
    font-weight: 500;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .employeeMeta {
    display: flex;
    align-items: center;

    margin-top: 6px;
  }

  .employeeMeta span {
    display: flex;
    align-items: center;
    gap: 4px;

    color: #94a3b8;

    font-size: 10px;
    font-weight: 550;
  }

  .employeeMeta svg {
    width: 11px;
    height: 11px;
  }

  .employeeArrow {
    width: 32px;
    height: 32px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    background: #f8fafc;

    color: #94a3b8;

    transition:
      background 0.18s ease,
      color 0.18s ease,
      transform 0.18s ease;
  }

  .employeeArrow svg {
    width: 15px;
    height: 15px;
  }

  .employeeCard:hover .employeeArrow {
    background: #eff6ff;

    color: #2563eb;

    transform: translateX(2px);
  }

  /* =======================================================
     LOADING / EMPTY
  ======================================================= */

  .resultsLoading {
    min-height: 180px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    gap: 12px;

    border: 1px solid #e5eaf1;
    border-radius: 15px;

    background: #ffffff;

    color: #94a3b8;

    font-size: 12px;
    font-weight: 550;
  }

  .emptyResults {
    min-height: 260px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    padding: 35px;

    border: 1px solid #e5eaf1;
    border-radius: 15px;

    background: #ffffff;

    text-align: center;
  }

  .emptyResultsIcon {
    width: 58px;
    height: 58px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 15px;

    background: #f1f5f9;

    color: #94a3b8;
  }

  .emptyResultsIcon svg {
    width: 25px;
    height: 25px;
  }

  .emptyResults h3 {
    margin: 17px 0 0;

    color: #334155;

    font-size: 16px;
    font-weight: 700;
  }

  .emptyResults p {
    max-width: 380px;

    margin: 6px 0 0;

    color: #94a3b8;

    font-size: 11px;
    line-height: 1.55;
  }

  .emptyClearButton {
    all: unset;

    margin-top: 17px;

    padding: 8px 12px;

    border-radius: 8px;

    background: #eff6ff;

    color: #2563eb;

    cursor: pointer;

    font-size: 11px;
    font-weight: 650;
  }

  .emptyClearButton:hover {
    background: #dbeafe;
  }

  /* =======================================================
     LOAD MORE
  ======================================================= */

  .loadMoreButton {
    width: 100%;

    min-height: 43px;

    margin-top: 4px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 7px;

    border: 1px solid #e2e8f0;
    border-radius: 10px;

    background: #ffffff;

    color: #2563eb;

    cursor: pointer;

    font-size: 11px;
    font-weight: 650;

    transition:
      background 0.18s ease,
      border-color 0.18s ease;
  }

  .loadMoreButton:hover {
    background: #eff6ff;
    border-color: #bfdbfe;
  }

  .loadMoreButton svg {
    width: 14px;
    height: 14px;
  }

  .loadMoreLoading {
    display: flex;
    align-items: center;
    justify-content: center;

    gap: 8px;

    padding: 13px;

    color: #94a3b8;

    font-size: 11px;
  }

  /* =======================================================
     SPINNERS
  ======================================================= */

  .spinner {
    width: 38px;
    height: 38px;

    border: 3px solid #e5e7eb;
    border-top-color: #2563eb;

    border-radius: 50%;

    animation: spin 0.8s linear infinite;
  }

  .spinner.small {
    width: 27px;
    height: 27px;
  }

  .spinner.tiny {
    width: 17px;
    height: 17px;

    border-width: 2px;
  }

  .rotating {
    animation: spin 0.8s linear infinite;
  }

  /* =======================================================
     LOADING PAGE
  ======================================================= */

  .loadingPage {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loadingCard {
    width: min(
      390px,
      calc(100% - 40px)
    );

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

  .loadingCard h2 {
    margin: 19px 0 0;

    color: #1e293b;

    font-size: 18px;
    font-weight: 700;
  }

  .loadingCard p {
    margin: 6px 0 0;

    color: #94a3b8;

    font-size: 12px;
  }

  /* =======================================================
     FLOATING REFRESH
  ======================================================= */

  .floatingRefresh {
    position: fixed;

    right: 25px;
    bottom: 25px;

    z-index: 20;

    width: 45px;
    height: 45px;

    display: flex;
    align-items: center;
    justify-content: center;

    border: none;
    border-radius: 13px;

    background: #2563eb;

    color: #ffffff;

    cursor: pointer;

    box-shadow:
      0 8px 20px rgba(37,99,235,0.25);

    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease;
  }

  .floatingRefresh:hover {
    transform: translateY(-2px);

    box-shadow:
      0 11px 24px rgba(37,99,235,0.3);
  }

  .floatingRefresh:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .floatingRefresh svg {
    width: 18px;
    height: 18px;
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

  .selectModal {
    width: min(
      430px,
      100%
    );

    max-height: min(
      620px,
      calc(100vh - 40px)
    );

    overflow: hidden;

    display: flex;
    flex-direction: column;

    border: 1px solid #e2e8f0;
    border-radius: 17px;

    background: #ffffff;

    box-shadow:
      0 25px 60px rgba(15,23,42,0.2);

    animation:
      modalIn 0.18s ease-out;
  }

  .modalHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;

    padding: 19px 20px;

    border-bottom: 1px solid #edf0f4;
  }

  .modalEyebrow {
    display: block;

    margin-bottom: 4px;

    color: #94a3b8;

    font-size: 9px;
    font-weight: 750;

    letter-spacing: 0.8px;
  }

  .modalHeader h3 {
    margin: 0;

    color: #1e293b;

    font-size: 17px;
    font-weight: 700;
  }

  .modalCloseButton {
    all: unset;

    width: 34px;
    height: 34px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;

    color: #64748b;

    cursor: pointer;
  }

  .modalCloseButton:hover {
    background: #f1f5f9;
    color: #334155;
  }

  .modalCloseButton svg {
    width: 18px;
    height: 18px;
  }

  .modalOptions {
    overflow-y: auto;

    padding: 7px;
  }

  .modalOption {
    all: unset;

    min-height: 47px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    width: 100%;

    padding: 0 12px;

    border-radius: 9px;

    color: #475569;

    cursor: pointer;

    font-size: 12px;
    font-weight: 550;

    transition:
      background 0.15s ease,
      color 0.15s ease;
  }

  .modalOption:hover {
    background: #f8fafc;
    color: #1e293b;
  }

  .modalOption.selected {
    background: #eff6ff;
    color: #2563eb;

    font-weight: 650;
  }

  .selectedCheck {
    width: 25px;
    height: 25px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 7px;

    background: #2563eb;

    color: #ffffff;
  }

  .selectedCheck svg {
    width: 14px;
    height: 14px;
  }

  .modalEmpty {
    padding: 35px 15px;

    color: #94a3b8;

    text-align: center;

    font-size: 12px;
  }

  /* =======================================================
     RESPONSIVE
  ======================================================= */

  @media (max-width: 700px) {
    .headerInner,
    .content {
      width: calc(100% - 28px);
    }

    .headerInner {
      min-height: 91px;
    }

    .headerIcon {
      width: 47px;
      height: 47px;
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

    .searchPanel {
      margin-top: 18px;

      padding: 17px;

      border-radius: 14px;
    }

    .searchHeading {
      align-items: flex-start;
    }

    .directoryCount {
      display: none;
    }

    .searchBox {
      height: 49px;
    }

    .searchButton {
      padding: 0 14px;
    }

    .filterArea {
      align-items: flex-start;

      flex-direction: column;

      gap: 8px;
    }

    .filterButtons {
      width: 100%;
    }

    .resultsSection {
      margin-top: 23px;
    }

    .employeeCard {
      padding: 13px;

      gap: 11px;
    }

    .employeeAvatar {
      width: 46px;
      height: 46px;
    }

    .employeeStatus {
      display: none;
    }

    .floatingRefresh {
      right: 16px;
      bottom: 16px;
    }
  }

  @media (max-width: 480px) {
    .headerRefresh {
      width: 36px;
      height: 36px;
    }

    .headerIcon {
      display: none;
    }

    .headerText h1 {
      font-size: 20px;
    }

    .searchHeading h2 {
      font-size: 15px;
    }

    .searchHeading p {
      font-size: 10px;
    }

    .searchButton {
      font-size: 11px;
      padding: 0 11px;
    }

    .filterLabel {
      display: none;
    }

    .filterButtons {
      gap: 6px;
    }

    .filterButton {
      font-size: 10px;
    }

    .employeeName {
      font-size: 13px;
    }

    .employeeUsername {
      font-size: 10px;
    }

    .employeeMeta span {
      font-size: 9px;
    }

    .employeeArrow {
      width: 29px;
      height: 29px;
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

  @keyframes modalIn {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.98);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;