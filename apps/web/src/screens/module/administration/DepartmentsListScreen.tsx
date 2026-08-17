import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiArrowLeft,
  FiSearch,
  FiGrid,
  FiUsers,
  FiChevronRight,
  FiMoreVertical,
  FiAlertCircle,
} from 'react-icons/fi';

import {
  listDepartments,
  deleteDepartment,
} from '@b2b/api-client';

import { useUserAuthStore } from '../../../store/userAuthStore';
import { Department } from '@b2b/shared-types';

export default function DepartmentsListScreen() {
  const router = useRouter();

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // =======================================================
  // FETCH DEPARTMENTS
  // =======================================================

  const fetchDepartments = async () => {
    if (!accessToken || !companyId || !deviceId) {
      setLoading(false);
      return;
    }

    setRefreshing(true);

    try {
      const res = await listDepartments(
        companyId,
        deviceId,
        {
          page: 1,
          limit: 100,
        },
        accessToken
      );

      setDepartments(res.data || []);
    } catch (error: any) {
      console.error('Failed to load departments:', error);

      alert(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to load departments'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [accessToken, companyId, deviceId]);

  // =======================================================
  // DELETE
  // =======================================================

  const handleDelete = async (id: string) => {
    const department = departments.find(
      (dept) => dept.department_id === id
    );

    const departmentName =
      department?.department_name || 'this department';

    const confirmed = window.confirm(
      `Are you sure you want to delete "${departmentName}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);

      await deleteDepartment(
        companyId!,
        deviceId!,
        id,
        accessToken!
      );

      await fetchDepartments();
    } catch (error: any) {
      console.error('Failed to delete department:', error);

      alert(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to delete department'
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =======================================================
  // SEARCH
  // =======================================================

  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return departments;
    }

    return departments.filter((department) => {
      return (
        department.department_name
          ?.toLowerCase()
          .includes(query) ||
        department.module_code
          ?.toLowerCase()
          .includes(query) ||
        department.department_id
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [departments, search]);

  // =======================================================
  // COUNTS
  // =======================================================

  const activeCount = departments.filter(
    (dept) => dept.is_active
  ).length;

  const inactiveCount =
    departments.length - activeCount;

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <>
        <div className="page loadingPage">
          <div className="loadingCard">
            <div className="spinner" />

            <h2>Loading departments</h2>

            <p>
              Fetching your department information...
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

            <div className="headerLeft">

              <button
                type="button"
                className="backButton"
                onClick={() =>
                  router.push('/module/administration')
                }
                aria-label="Back to Administration"
              >
                <FiArrowLeft />
              </button>

              <div className="headerDivider" />

              <div className="breadcrumb">
                <span>Administration</span>

                <FiChevronRight />

                <span>Departments</span>
              </div>

            </div>

            <button
              type="button"
              className="headerRefresh"
              onClick={fetchDepartments}
              disabled={refreshing}
              title="Refresh departments"
            >
              <FiRefreshCw
                className={
                  refreshing ? 'spin' : ''
                }
              />

              <span>Refresh</span>
            </button>

          </div>
        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="content">

          {/* =================================================
              PAGE TITLE
          ================================================= */}

          <section className="pageIntro">

            <div className="introLeft">

              <div className="titleIcon">
                <FiUsers />
              </div>

              <div>
                <h1>Departments</h1>

                <p>
                  Manage departments and organize your
                  company structure.
                </p>
              </div>

            </div>

            <button
              type="button"
              className="addButton"
              onClick={() =>
                router.push(
                  '/module/administration/create-department'
                )
              }
            >
              <FiPlus />
              <span>Add Department</span>
            </button>

          </section>

          {/* =================================================
              STATISTICS
          ================================================= */}

          <section className="statsGrid">

            <div className="statCard">
              <div className="statIcon blue">
                <FiGrid />
              </div>

              <div className="statInfo">
                <span>Total Departments</span>
                <strong>{departments.length}</strong>
              </div>
            </div>

            <div className="statCard">
              <div className="statIcon green">
                <span className="statusDot" />
              </div>

              <div className="statInfo">
                <span>Active</span>
                <strong>{activeCount}</strong>
              </div>
            </div>

            <div className="statCard">
              <div className="statIcon red">
                <span className="statusDot inactive" />
              </div>

              <div className="statInfo">
                <span>Inactive</span>
                <strong>{inactiveCount}</strong>
              </div>
            </div>

          </section>

          {/* =================================================
              TOOLBAR
          ================================================= */}

          <section className="listContainer">

            <div className="listToolbar">

              <div>
                <h2>All Departments</h2>

                <p>
                  {search
                    ? `${filteredDepartments.length} result${
                        filteredDepartments.length === 1
                          ? ''
                          : 's'
                      } found`
                    : `${departments.length} department${
                        departments.length === 1
                          ? ''
                          : 's'
                      }`}
                </p>
              </div>

              <div className="searchBox">

                <FiSearch />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search departments..."
                  aria-label="Search departments"
                />

                {search && (
                  <button
                    type="button"
                    className="clearSearch"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}

              </div>

            </div>

            {/* =================================================
                EMPTY SEARCH RESULT
            ================================================= */}

            {filteredDepartments.length === 0 ? (
              <div className="emptyState">

                <div className="emptyIcon">
                  {search ? (
                    <FiSearch />
                  ) : (
                    <FiUsers />
                  )}
                </div>

                <h3>
                  {search
                    ? 'No departments found'
                    : 'No departments yet'}
                </h3>

                <p>
                  {search
                    ? `No departments match "${search}". Try another search.`
                    : 'Create your first department to start organizing your company.'}
                </p>

                {search ? (
                  <button
                    type="button"
                    className="secondaryButton"
                    onClick={() => setSearch('')}
                  >
                    Clear Search
                  </button>
                ) : (
                  <button
                    type="button"
                    className="emptyAddButton"
                    onClick={() =>
                      router.push(
                        '/module/administration/create-department'
                      )
                    }
                  >
                    <FiPlus />
                    Create Department
                  </button>
                )}

              </div>
            ) : (
              <>
                {/* =================================================
                    DESKTOP TABLE
                ================================================= */}

                <div className="desktopTable">

                  <div className="tableHeader">
                    <div>Department</div>
                    <div>Module</div>
                    <div>Status</div>
                    <div>Department ID</div>
                    <div className="actionsHeader">
                      Actions
                    </div>
                  </div>

                  <div className="tableBody">

                    {filteredDepartments.map(
                      (dept, index) => (
                        <div
                          className="tableRow"
                          key={dept.department_id}
                        >

                          {/* Department */}
                          <div className="departmentCell">

                            <div className="departmentNumber">
                              {String(index + 1).padStart(
                                2,
                                '0'
                              )}
                            </div>

                            <div className="departmentIcon">
                              <FiUsers />
                            </div>

                            <div className="departmentInfo">

                              <span className="departmentName">
                                {dept.department_name}
                              </span>

                              <span className="departmentSubtitle">
                                Company Department
                              </span>

                            </div>

                          </div>

                          {/* Module */}
                          <div>

                            {dept.module_code ? (
                              <span className="moduleBadge">
                                {dept.module_code}
                              </span>
                            ) : (
                              <span className="notAvailable">
                                Not assigned
                              </span>
                            )}

                          </div>

                          {/* Status */}
                          <div>

                            <span
                              className={
                                dept.is_active
                                  ? 'statusBadge active'
                                  : 'statusBadge inactive'
                              }
                            >
                              <span className="statusIndicator" />

                              {dept.is_active
                                ? 'Active'
                                : 'Inactive'}
                            </span>

                          </div>

                          {/* ID */}
                          <div className="idCell">
                            {dept.department_id}
                          </div>

                          {/* Actions */}
                          <div className="rowActions">

                            <button
                              type="button"
                              className="actionButton edit"
                              onClick={() =>
                                router.push(
                                  `/module/administration/edit-department?departmentId=${dept.department_id}`
                                )
                              }
                              title="Edit department"
                            >
                              <FiEdit2 />
                            </button>

                            <button
                              type="button"
                              className="actionButton delete"
                              onClick={() =>
                                handleDelete(
                                  dept.department_id
                                )
                              }
                              disabled={
                                deletingId ===
                                dept.department_id
                              }
                              title="Delete department"
                            >
                              {deletingId ===
                              dept.department_id ? (
                                <FiRefreshCw className="spin" />
                              ) : (
                                <FiTrash2 />
                              )}
                            </button>

                          </div>

                        </div>
                      )
                    )}

                  </div>

                </div>

                {/* =================================================
                    MOBILE CARDS
                ================================================= */}

                <div className="mobileList">

                  {filteredDepartments.map(
                    (dept, index) => (
                      <div
                        className="mobileCard"
                        key={dept.department_id}
                      >

                        <div className="mobileCardTop">

                          <div className="departmentIcon large">
                            <FiUsers />
                          </div>

                          <div className="mobileDepartmentInfo">

                            <span className="departmentName">
                              {dept.department_name}
                            </span>

                            <span className="departmentSubtitle">
                              Department #
                              {String(index + 1).padStart(
                                2,
                                '0'
                              )}
                            </span>

                          </div>

                          <button
                            type="button"
                            className="mobileMoreButton"
                            aria-label="Department actions"
                          >
                            <FiMoreVertical />
                          </button>

                        </div>

                        <div className="mobileCardDetails">

                          <div>
                            <span className="detailLabel">
                              Module
                            </span>

                            {dept.module_code ? (
                              <span className="moduleBadge">
                                {dept.module_code}
                              </span>
                            ) : (
                              <span className="notAvailable">
                                Not assigned
                              </span>
                            )}
                          </div>

                          <div>
                            <span className="detailLabel">
                              Status
                            </span>

                            <span
                              className={
                                dept.is_active
                                  ? 'statusBadge active'
                                  : 'statusBadge inactive'
                              }
                            >
                              <span className="statusIndicator" />
                              {dept.is_active
                                ? 'Active'
                                : 'Inactive'}
                            </span>
                          </div>

                        </div>

                        <div className="mobileId">
                          <span>ID</span>
                          {dept.department_id}
                        </div>

                        <div className="mobileActions">

                          <button
                            type="button"
                            className="mobileEdit"
                            onClick={() =>
                              router.push(
                                `/module/administration/edit-department?departmentId=${dept.department_id}`
                              )
                            }
                          >
                            <FiEdit2 />
                            Edit
                          </button>

                          <button
                            type="button"
                            className="mobileDelete"
                            onClick={() =>
                              handleDelete(
                                dept.department_id
                              )
                            }
                            disabled={
                              deletingId ===
                              dept.department_id
                            }
                          >
                            {deletingId ===
                            dept.department_id ? (
                              <FiRefreshCw className="spin" />
                            ) : (
                              <FiTrash2 />
                            )}

                            Delete
                          </button>

                        </div>

                      </div>
                    )
                  )}

                </div>
              </>
            )}

          </section>

        </main>

        {/* =================================================
            FLOATING REFRESH
        ================================================= */}

        <button
          type="button"
          className="floatingRefresh"
          onClick={fetchDepartments}
          disabled={refreshing}
          title="Refresh departments"
        >
          <FiRefreshCw
            className={
              refreshing ? 'spin' : ''
            }
          />
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

    min-height: 68px;

    margin: 0 auto;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;
  }

  .headerLeft {
    display: flex;
    align-items: center;
    gap: 14px;

    min-width: 0;
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
      background 0.18s ease,
      color 0.18s ease,
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

  .headerDivider {
    width: 1px;
    height: 27px;

    background: #e5eaf1;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;

    color: #64748b;

    font-size: 12px;
    font-weight: 600;
  }

  .breadcrumb svg {
    width: 13px;
    height: 13px;

    color: #cbd5e1;
  }

  .breadcrumb span:last-child {
    color: #1e293b;
  }

  .headerRefresh {
    all: unset;

    display: flex;
    align-items: center;
    gap: 7px;

    padding: 8px 12px;

    border: 1px solid #e2e8f0;
    border-radius: 9px;

    background: #ffffff;
    color: #64748b;

    cursor: pointer;

    font-size: 11px;
    font-weight: 650;

    transition:
      background 0.18s ease,
      color 0.18s ease,
      border-color 0.18s ease;
  }

  .headerRefresh:hover:not(:disabled) {
    color: #2563eb;
    background: #eff6ff;
    border-color: #bfdbfe;
  }

  .headerRefresh:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .headerRefresh svg {
    width: 15px;
    height: 15px;
  }

  /* =======================================================
     CONTENT
  ======================================================= */

  .content {
    width: min(1400px, calc(100% - 48px));

    margin: 0 auto;

    padding: 34px 0 70px;
  }

  /* =======================================================
     PAGE INTRO
  ======================================================= */

  .pageIntro {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 30px;

    margin-bottom: 28px;
  }

  .introLeft {
    display: flex;
    align-items: center;
    gap: 15px;

    min-width: 0;
  }

  .titleIcon {
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

  .titleIcon svg {
    width: 25px;
    height: 25px;
  }

  .pageIntro h1 {
    margin: 0;

    color: #172033;

    font-size: 29px;
    line-height: 1.15;

    font-weight: 750;

    letter-spacing: -0.6px;
  }

  .pageIntro p {
    margin: 6px 0 0;

    color: #64748b;

    font-size: 13px;
    line-height: 1.5;

    font-weight: 500;
  }

  .addButton {
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
      box-shadow 0.18s ease,
      background 0.18s ease;
  }

  .addButton:hover {
    background: #1d4ed8;

    transform: translateY(-1px);

    box-shadow:
      0 8px 18px rgba(37, 99, 235, 0.24);
  }

  .addButton svg {
    width: 16px;
    height: 16px;
  }

  /* =======================================================
     STATISTICS
  ======================================================= */

  .statsGrid {
    display: grid;

    grid-template-columns:
      repeat(
        3,
        minmax(0, 1fr)
      );

    gap: 15px;

    margin-bottom: 25px;
  }

  .statCard {
    min-height: 84px;

    display: flex;
    align-items: center;

    gap: 13px;

    padding: 15px 17px;

    border: 1px solid #e5eaf1;
    border-radius: 14px;

    background: #ffffff;

    box-shadow:
      0 2px 5px rgba(15, 23, 42, 0.025);
  }

  .statIcon {
    width: 43px;
    height: 43px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 11px;
  }

  .statIcon svg {
    width: 19px;
    height: 19px;
  }

  .statIcon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .statIcon.green {
    background: #ecfdf5;
    color: #10b981;
  }

  .statIcon.red {
    background: #fef2f2;
    color: #ef4444;
  }

  .statusDot {
    width: 11px;
    height: 11px;

    border-radius: 50%;

    background: #10b981;

    box-shadow:
      0 0 0 5px rgba(16,185,129,0.10);
  }

  .statusDot.inactive {
    background: #ef4444;

    box-shadow:
      0 0 0 5px rgba(239,68,68,0.10);
  }

  .statInfo {
    display: flex;
    flex-direction: column;
  }

  .statInfo span {
    color: #94a3b8;

    font-size: 10px;
    line-height: 1.2;

    font-weight: 600;
  }

  .statInfo strong {
    margin-top: 4px;

    color: #1e293b;

    font-size: 22px;
    line-height: 1;

    font-weight: 750;
  }

  /* =======================================================
     LIST CONTAINER
  ======================================================= */

  .listContainer {
    overflow: hidden;

    border: 1px solid #e5eaf1;
    border-radius: 16px;

    background: #ffffff;

    box-shadow:
      0 3px 10px rgba(15, 23, 42, 0.025);
  }

  /* =======================================================
     TOOLBAR
  ======================================================= */

  .listToolbar {
    min-height: 79px;

    padding: 17px 20px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;

    border-bottom: 1px solid #edf0f4;
  }

  .listToolbar h2 {
    margin: 0;

    color: #1e293b;

    font-size: 15px;
    line-height: 1.3;

    font-weight: 700;
  }

  .listToolbar p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 10px;
    font-weight: 500;
  }

  /* =======================================================
     SEARCH
  ======================================================= */

  .searchBox {
    width: min(290px, 100%);

    height: 38px;

    display: flex;
    align-items: center;

    padding: 0 10px;

    border: 1px solid #e2e8f0;
    border-radius: 9px;

    background: #f8fafc;

    transition:
      border-color 0.18s ease,
      background 0.18s ease,
      box-shadow 0.18s ease;
  }

  .searchBox:focus-within {
    border-color: #93c5fd;
    background: #ffffff;

    box-shadow:
      0 0 0 3px rgba(37,99,235,0.07);
  }

  .searchBox > svg {
    width: 16px;
    height: 16px;

    flex-shrink: 0;

    color: #94a3b8;
  }

  .searchBox input {
    width: 100%;

    margin-left: 8px;

    border: none;
    outline: none;

    background: transparent;

    color: #334155;

    font-family: inherit;

    font-size: 11px;
    font-weight: 500;
  }

  .searchBox input::placeholder {
    color: #a8b2c0;
  }

  .clearSearch {
    all: unset;

    width: 22px;
    height: 22px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 6px;

    color: #94a3b8;

    cursor: pointer;

    font-size: 17px;
    line-height: 1;
  }

  .clearSearch:hover {
    background: #e2e8f0;
    color: #475569;
  }

  /* =======================================================
     DESKTOP TABLE
  ======================================================= */

  .desktopTable {
    width: 100%;
  }

  .tableHeader,
  .tableRow {
    display: grid;

    grid-template-columns:
      minmax(260px, 2fr)
      minmax(120px, 1fr)
      minmax(120px, 0.9fr)
      minmax(210px, 1.4fr)
      95px;

    align-items: center;
  }

  .tableHeader {
    min-height: 44px;

    padding: 0 20px;

    background: #f8fafc;

    border-bottom: 1px solid #edf0f4;

    color: #94a3b8;

    font-size: 9px;
    font-weight: 750;

    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .tableRow {
    min-height: 82px;

    padding: 0 20px;

    border-bottom: 1px solid #f0f2f5;

    transition:
      background 0.16s ease;
  }

  .tableRow:last-child {
    border-bottom: none;
  }

  .tableRow:hover {
    background: #fafcff;
  }

  /* =======================================================
     DEPARTMENT CELL
  ======================================================= */

  .departmentCell {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 11px;
  }

  .departmentNumber {
    width: 24px;

    flex-shrink: 0;

    color: #cbd5e1;

    font-size: 9px;
    font-weight: 750;

    letter-spacing: 0.4px;
  }

  .departmentIcon {
    width: 39px;
    height: 39px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;

    background: #eff6ff;
    color: #2563eb;

    border: 1px solid #dbeafe;
  }

  .departmentIcon svg {
    width: 18px;
    height: 18px;
  }

  .departmentIcon.large {
    width: 48px;
    height: 48px;

    border-radius: 12px;
  }

  .departmentIcon.large svg {
    width: 21px;
    height: 21px;
  }

  .departmentInfo {
    min-width: 0;

    display: flex;
    flex-direction: column;
  }

  .departmentName {
    overflow: hidden;

    color: #1e293b;

    font-size: 13px;
    line-height: 1.3;

    font-weight: 700;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .departmentSubtitle {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 9px;
    line-height: 1.3;

    font-weight: 500;
  }

  /* =======================================================
     MODULE BADGE
  ======================================================= */

  .moduleBadge {
    display: inline-flex;
    align-items: center;

    padding: 5px 8px;

    border: 1px solid #dbeafe;
    border-radius: 7px;

    background: #eff6ff;

    color: #2563eb;

    font-size: 9px;
    font-weight: 700;

    letter-spacing: 0.2px;
  }

  .notAvailable {
    color: #a8b2c0;

    font-size: 10px;
    font-weight: 500;
  }

  /* =======================================================
     STATUS
  ======================================================= */

  .statusBadge {
    display: inline-flex;
    align-items: center;
    gap: 6px;

    padding: 5px 8px;

    border-radius: 7px;

    font-size: 9px;
    font-weight: 700;
  }

  .statusBadge.active {
    background: #ecfdf5;
    color: #059669;
  }

  .statusBadge.inactive {
    background: #fef2f2;
    color: #dc2626;
  }

  .statusIndicator {
    width: 5px;
    height: 5px;

    border-radius: 50%;

    background: currentColor;
  }

  /* =======================================================
     ID
  ======================================================= */

  .idCell {
    overflow: hidden;

    padding-right: 15px;

    color: #94a3b8;

    font-family:
      ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      monospace;

    font-size: 8px;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* =======================================================
     ACTIONS
  ======================================================= */

  .actionsHeader {
    text-align: right;
  }

  .rowActions {
    display: flex;
    justify-content: flex-end;

    gap: 6px;
  }

  .actionButton {
    all: unset;

    width: 31px;
    height: 31px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    cursor: pointer;

    transition:
      background 0.16s ease,
      color 0.16s ease;
  }

  .actionButton svg {
    width: 14px;
    height: 14px;
  }

  .actionButton.edit {
    color: #2563eb;
  }

  .actionButton.edit:hover {
    background: #eff6ff;
  }

  .actionButton.delete {
    color: #ef4444;
  }

  .actionButton.delete:hover {
    background: #fef2f2;
  }

  .actionButton:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  /* =======================================================
     MOBILE LIST
  ======================================================= */

  .mobileList {
    display: none;
  }

  /* =======================================================
     EMPTY STATE
  ======================================================= */

  .emptyState {
    padding: 65px 25px;

    display: flex;
    flex-direction: column;
    align-items: center;

    text-align: center;
  }

  .emptyIcon {
    width: 64px;
    height: 64px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 17px;

    background: #eff6ff;
    color: #2563eb;

    border: 1px solid #dbeafe;
  }

  .emptyIcon svg {
    width: 27px;
    height: 27px;
  }

  .emptyState h3 {
    margin: 18px 0 0;

    color: #1e293b;

    font-size: 17px;
    font-weight: 700;
  }

  .emptyState p {
    max-width: 430px;

    margin: 7px 0 0;

    color: #94a3b8;

    font-size: 11px;
    line-height: 1.6;
  }

  .emptyAddButton,
  .secondaryButton {
    all: unset;

    margin-top: 21px;

    display: flex;
    align-items: center;
    gap: 7px;

    padding: 9px 13px;

    border-radius: 8px;

    cursor: pointer;

    font-size: 11px;
    font-weight: 650;
  }

  .emptyAddButton {
    background: #2563eb;
    color: #ffffff;
  }

  .secondaryButton {
    border: 1px solid #e2e8f0;

    background: #ffffff;
    color: #475569;
  }

  .emptyAddButton svg,
  .secondaryButton svg {
    width: 14px;
    height: 14px;
  }

  /* =======================================================
     FLOATING REFRESH
  ======================================================= */

  .floatingRefresh {
    position: fixed;

    right: 25px;
    bottom: 25px;

    width: 43px;
    height: 43px;

    display: flex;
    align-items: center;
    justify-content: center;

    border: none;
    border-radius: 12px;

    background: #2563eb;
    color: #ffffff;

    cursor: pointer;

    box-shadow:
      0 7px 20px rgba(37,99,235,0.24);

    transition:
      transform 0.18s ease,
      background 0.18s ease;
  }

  .floatingRefresh:hover:not(:disabled) {
    background: #1d4ed8;
    transform: translateY(-2px);
  }

  .floatingRefresh:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .floatingRefresh svg {
    width: 18px;
    height: 18px;
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

  .spinner {
    width: 40px;
    height: 40px;

    border: 3px solid #e8edf4;
    border-top-color: #2563eb;

    border-radius: 50%;

    animation: spin 0.8s linear infinite;
  }

  .loadingCard h2 {
    margin: 19px 0 0;

    color: #1e293b;

    font-size: 18px;
    font-weight: 700;
  }

  .loadingCard p {
    margin: 7px 0 0;

    color: #94a3b8;

    font-size: 11px;
  }

  /* =======================================================
     MOBILE
  ======================================================= */

  @media (max-width: 850px) {
    .statsGrid {
      grid-template-columns:
        repeat(
          3,
          minmax(0, 1fr)
        );
    }

    .tableHeader,
    .tableRow {
      grid-template-columns:
        minmax(220px, 2fr)
        minmax(100px, 1fr)
        minmax(100px, 1fr)
        80px;
    }

    .tableHeader > div:nth-child(4),
    .tableRow > .idCell {
      display: none;
    }

    .tableHeader,
    .tableRow {
      grid-template-columns:
        minmax(230px, 2fr)
        minmax(100px, 1fr)
        minmax(100px, 1fr)
        80px;
    }
  }

  @media (max-width: 650px) {
    .headerInner,
    .content {
      width: calc(100% - 28px);
    }

    .headerInner {
      min-height: 62px;
    }

    .breadcrumb {
      font-size: 11px;
    }

    .headerRefresh span {
      display: none;
    }

    .headerRefresh {
      width: 36px;
      height: 36px;

      padding: 0;

      justify-content: center;
    }

    .content {
      padding-top: 25px;
    }

    .pageIntro {
      align-items: flex-start;
      flex-direction: column;
      gap: 18px;
    }

    .introLeft {
      width: 100%;
    }

    .pageIntro h1 {
      font-size: 26px;
    }

    .addButton {
      width: 100%;

      justify-content: center;
    }

    .statsGrid {
      grid-template-columns: 1fr;

      gap: 10px;
    }

    .statCard {
      min-height: 70px;
    }

    .listToolbar {
      align-items: stretch;
      flex-direction: column;

      padding: 15px;
    }

    .searchBox {
      width: 100%;
    }

    .desktopTable {
      display: none;
    }

    .mobileList {
      display: flex;
      flex-direction: column;
      gap: 10px;

      padding: 12px;
    }

    .mobileCard {
      padding: 15px;

      border: 1px solid #e7ebf1;
      border-radius: 13px;

      background: #ffffff;

      box-shadow:
        0 2px 5px rgba(15,23,42,0.025);
    }

    .mobileCardTop {
      display: flex;
      align-items: center;
      gap: 11px;
    }

    .mobileDepartmentInfo {
      min-width: 0;
      flex: 1;

      display: flex;
      flex-direction: column;
    }

    .mobileMoreButton {
      all: unset;

      width: 30px;
      height: 30px;

      display: flex;
      align-items: center;
      justify-content: center;

      color: #94a3b8;
    }

    .mobileMoreButton svg {
      width: 17px;
      height: 17px;
    }

    .mobileCardDetails {
      display: grid;

      grid-template-columns:
        repeat(
          2,
          minmax(0, 1fr)
        );

      gap: 12px;

      margin-top: 16px;
      padding-top: 14px;

      border-top: 1px solid #f0f2f5;
    }

    .mobileCardDetails > div {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .detailLabel {
      color: #a0aabb;

      font-size: 9px;
      font-weight: 650;

      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .mobileId {
      display: flex;
      align-items: center;
      gap: 7px;

      margin-top: 12px;

      color: #94a3b8;

      font-family:
        ui-monospace,
        SFMono-Regular,
        Menlo,
        Monaco,
        Consolas,
        monospace;

      font-size: 8px;
    }

    .mobileId span {
      padding: 3px 5px;

      border-radius: 5px;

      background: #f1f5f9;

      color: #64748b;

      font-family: inherit;
      font-size: 8px;
      font-weight: 700;
    }

    .mobileActions {
      display: grid;

      grid-template-columns:
        repeat(
          2,
          minmax(0, 1fr)
        );

      gap: 8px;

      margin-top: 14px;
    }

    .mobileEdit,
    .mobileDelete {
      all: unset;

      height: 36px;

      display: flex;
      align-items: center;
      justify-content: center;

      gap: 6px;

      border-radius: 8px;

      cursor: pointer;

      font-size: 10px;
      font-weight: 650;
    }

    .mobileEdit {
      background: #eff6ff;
      color: #2563eb;
    }

    .mobileDelete {
      background: #fef2f2;
      color: #ef4444;
    }

    .mobileEdit svg,
    .mobileDelete svg {
      width: 14px;
      height: 14px;
    }

    .mobileEdit:disabled,
    .mobileDelete:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .floatingRefresh {
      right: 16px;
      bottom: 16px;

      width: 40px;
      height: 40px;

      border-radius: 11px;
    }
  }

  @media (max-width: 420px) {
    .pageIntro h1 {
      font-size: 24px;
    }

    .titleIcon {
      width: 48px;
      height: 48px;
    }

    .titleIcon svg {
      width: 22px;
      height: 22px;
    }

    .departmentName {
      font-size: 12px;
    }
  }

  /* =======================================================
     ANIMATION
  ======================================================= */

  .spin {
    animation: spin 0.8s linear infinite;
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