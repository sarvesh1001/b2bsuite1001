import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import {
  listPositions,
  deletePosition,
} from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { Position } from '@b2b/shared-types';

import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiSearch,
  FiArrowLeft,
  FiBriefcase,
  FiCalendar,
  FiClock,
  FiUsers,
  FiX,
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronDown,
} from 'react-icons/fi';

export default function PositionsListScreen() {
  const router = useRouter();

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'open' | 'closed'
  >('all');

  const [deleteTarget, setDeleteTarget] =
    useState<Position | null>(null);

  const [deleting, setDeleting] = useState(false);

  // =========================================================
  // FETCH POSITIONS
  // =========================================================

  const fetchPositions = async (
    showFullLoader = true
  ) => {
    if (!accessToken || !companyId || !deviceId) {
      return;
    }

    if (showFullLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const res = await listPositions(
        companyId,
        deviceId,
        {
          limit: 100,
          offset: 0,
        },
        accessToken
      );

      setPositions(res.data?.positions || []);
    } catch (error: any) {
      console.error('Failed to load positions:', error);

      alert(
        error?.message ||
          'Failed to load positions. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, [accessToken, companyId, deviceId]);

  // =========================================================
  // DELETE POSITION
  // =========================================================

  const handleDelete = async () => {
    if (
      !deleteTarget ||
      !companyId ||
      !deviceId ||
      !accessToken
    ) {
      return;
    }

    setDeleting(true);

    try {
      await deletePosition(
        companyId,
        deviceId,
        deleteTarget.position_id,
        accessToken
      );

      setDeleteTarget(null);

      await fetchPositions(false);
    } catch (error: any) {
      console.error('Failed to delete position:', error);

      alert(
        error?.message ||
          'Failed to delete position. Please try again.'
      );
    } finally {
      setDeleting(false);
    }
  };

  // =========================================================
  // FILTER POSITIONS
  // =========================================================

  const filteredPositions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return positions.filter((position) => {
      const matchesSearch =
        !query ||
        position.title?.toLowerCase().includes(query) ||
        position.work_center_code
          ?.toLowerCase()
          .includes(query) ||
        position.department_id
          ?.toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'open' && position.is_open) ||
        (statusFilter === 'closed' && !position.is_open);

      return matchesSearch && matchesStatus;
    });
  }, [positions, searchQuery, statusFilter]);

  // =========================================================
  // COUNTS
  // =========================================================

  const openCount = positions.filter(
    (position) => position.is_open
  ).length;

  const closedCount = positions.filter(
    (position) => !position.is_open
  ).length;

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <>
        <div className="page loadingPage">
          <div className="loadingCard">
            <div className="spinner" />

            <h2>Loading Positions</h2>

            <p>
              Fetching positions from your organization...
            </p>
          </div>
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
      <div className="page">

        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="pageHeader">
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

              <div className="headerIcon">
                <FiBriefcase />
              </div>

              <div className="headerTitleBlock">

                <div className="breadcrumb">
                  <span>Administration</span>
                  <span className="breadcrumbSeparator">
                    /
                  </span>
                  <span>Positions</span>
                </div>

                <h1>Positions</h1>

                <p>
                  Manage organizational positions and
                  workforce requirements
                </p>

              </div>

            </div>

            <div className="headerActions">

              <button
                type="button"
                className="refreshButton"
                onClick={() => fetchPositions(false)}
                disabled={refreshing}
                title="Refresh positions"
              >
                <FiRefreshCw
                  className={
                    refreshing ? 'spinning' : ''
                  }
                />

                <span>Refresh</span>
              </button>

              <button
                type="button"
                className="addButton"
                onClick={() =>
                  router.push(
                    '/module/administration/create-position'
                  )
                }
              >
                <FiPlus />
                <span>Add Position</span>
              </button>

            </div>

          </div>
        </header>

        {/* ===================================================
            CONTENT
        =================================================== */}

        <main className="content">

          {/* =================================================
              SUMMARY
          ================================================= */}

          <div className="summaryGrid">

            <div className="summaryCard">
              <div className="summaryIcon blue">
                <FiBriefcase />
              </div>

              <div className="summaryContent">
                <span>Total Positions</span>
                <strong>{positions.length}</strong>
              </div>
            </div>

            <div className="summaryCard">
              <div className="summaryIcon green">
                <FiCheckCircle />
              </div>

              <div className="summaryContent">
                <span>Open Positions</span>
                <strong>{openCount}</strong>
              </div>
            </div>

            <div className="summaryCard">
              <div className="summaryIcon red">
                <FiX />
              </div>

              <div className="summaryContent">
                <span>Closed Positions</span>
                <strong>{closedCount}</strong>
              </div>
            </div>

            <div className="summaryCard">
              <div className="summaryIcon purple">
                <FiCalendar />
              </div>

              <div className="summaryContent">
                <span>Schedulable</span>
                <strong>
                  {
                    positions.filter(
                      (position) =>
                        position.is_schedulable
                    ).length
                  }
                </strong>
              </div>
            </div>

          </div>

          {/* =================================================
              TOOLBAR
          ================================================= */}

          <div className="toolbar">

            <div className="searchBox">

              <FiSearch />

              <input
                type="text"
                placeholder="Search positions..."
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
              />

              {searchQuery && (
                <button
                  type="button"
                  className="clearSearch"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <FiX />
                </button>
              )}

            </div>

            <div className="filterGroup">

              <span className="filterLabel">
                Status
              </span>

              <div className="selectWrapper">

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as
                        | 'all'
                        | 'open'
                        | 'closed'
                    )
                  }
                >
                  <option value="all">
                    All Positions
                  </option>

                  <option value="open">
                    Open
                  </option>

                  <option value="closed">
                    Closed
                  </option>
                </select>

                <FiChevronDown />
              </div>

            </div>

          </div>

          {/* =================================================
              RESULTS HEADER
          ================================================= */}

          <div className="resultsHeader">

            <div>
              <h2>All Positions</h2>

              <p>
                Showing{' '}
                <strong>
                  {filteredPositions.length}
                </strong>{' '}
                of{' '}
                <strong>{positions.length}</strong>{' '}
                positions
              </p>
            </div>

            {(searchQuery || statusFilter !== 'all') && (
              <button
                type="button"
                className="clearFilters"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Clear filters
              </button>
            )}

          </div>

          {/* =================================================
              EMPTY SEARCH RESULT
          ================================================= */}

          {filteredPositions.length === 0 &&
            positions.length > 0 && (
              <div className="emptyCard">

                <div className="emptyIcon">
                  <FiSearch />
                </div>

                <h3>No positions found</h3>

                <p>
                  Try changing your search or filter
                  criteria.
                </p>

                <button
                  type="button"
                  className="emptyAction"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                >
                  Clear Filters
                </button>

              </div>
            )}

          {/* =================================================
              DESKTOP TABLE
          ================================================= */}

          {filteredPositions.length > 0 && (
            <div className="positionsTableWrapper">

              <table className="positionsTable">

                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Department</th>
                    <th>Work Center</th>
                    <th>Status</th>
                    <th>Scheduling</th>
                    <th>Attendance</th>
                    <th className="actionsColumn">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPositions.map(
                    (position, index) => (
                      <tr
                        key={position.position_id}
                      >

                        {/* Position */}
                        <td>
                          <div className="positionCell">

                            <div className="positionAvatar">
                              {position.title
                                ?.charAt(0)
                                .toUpperCase() || 'P'}
                            </div>

                            <div className="positionInfo">

                              <span className="positionTitle">
                                {position.title}
                              </span>

                              <span className="positionNumber">
                                Position #{index + 1}
                              </span>

                            </div>

                          </div>
                        </td>

                        {/* Department */}
                        <td>
                          <span className="departmentValue">
                            {position.department_id}
                          </span>
                        </td>

                        {/* Work Center */}
                        <td>
                          {position.work_center_code ? (
                            <div className="workCenter">
                              <FiBriefcase />
                              <span>
                                {
                                  position.work_center_code
                                }
                              </span>
                            </div>
                          ) : (
                            <span className="mutedValue">
                              Not assigned
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td>
                          <StatusBadge
                            active={position.is_open}
                            activeText="Open"
                            inactiveText="Closed"
                          />
                        </td>

                        {/* Scheduling */}
                        <td>
                          <StatusBadge
                            active={
                              position.is_schedulable
                            }
                            activeText="Schedulable"
                            inactiveText="Not schedulable"
                            variant="purple"
                          />
                        </td>

                        {/* Attendance */}
                        <td>
                          <StatusBadge
                            active={
                              position.attendance_required
                            }
                            activeText="Required"
                            inactiveText="Not required"
                            variant="orange"
                          />
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="rowActions">

                            <button
                              type="button"
                              className="rowAction edit"
                              onClick={() =>
                                router.push(
                                  `/module/administration/edit-position?positionId=${position.position_id}`
                                )
                              }
                              title="Edit position"
                            >
                              <FiEdit2 />
                            </button>

                            <button
                              type="button"
                              className="rowAction delete"
                              onClick={() =>
                                setDeleteTarget(
                                  position
                                )
                              }
                              title="Delete position"
                            >
                              <FiTrash2 />
                            </button>

                          </div>
                        </td>

                      </tr>
                    )
                  )}
                </tbody>

              </table>

            </div>
          )}

          {/* =================================================
              EMPTY DATABASE
          ================================================= */}

          {positions.length === 0 && (
            <div className="emptyCard">

              <div className="emptyIcon">
                <FiBriefcase />
              </div>

              <h3>No positions yet</h3>

              <p>
                Create your first organizational position
                to get started.
              </p>

              <button
                type="button"
                className="emptyAction"
                onClick={() =>
                  router.push(
                    '/module/administration/create-position'
                  )
                }
              >
                <FiPlus />
                Create Position
              </button>

            </div>
          )}

        </main>

        {/* ===================================================
            DELETE MODAL
        =================================================== */}

        {deleteTarget && (
          <div
            className="modalOverlay"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !deleting
              ) {
                setDeleteTarget(null);
              }
            }}
          >

            <div className="deleteModal">

              <div className="deleteModalIcon">
                <FiAlertTriangle />
              </div>

              <h2>Delete Position?</h2>

              <p>
                Are you sure you want to delete{' '}
                <strong>
                  {deleteTarget.title}
                </strong>
                ? This action cannot be undone.
              </p>

              <div className="modalActions">

                <button
                  type="button"
                  className="cancelButton"
                  disabled={deleting}
                  onClick={() =>
                    setDeleteTarget(null)
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="confirmDeleteButton"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  {deleting ? (
                    <>
                      <FiRefreshCw className="spinning" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <FiTrash2 />
                      Delete Position
                    </>
                  )}
                </button>

              </div>

            </div>

          </div>
        )}

      </div>

      <style jsx>{styles}</style>
    </>
  );
}

// =========================================================
// STATUS BADGE
// =========================================================

function StatusBadge({
  active,
  activeText,
  inactiveText,
  variant = 'green',
}: {
  active: boolean;
  activeText: string;
  inactiveText: string;
  variant?: 'green' | 'purple' | 'orange';
}) {
  return (
    <span
      className={[
        'statusBadge',
        active ? `active ${variant}` : 'inactive',
      ].join(' ')}
    >
      <span className="statusDot" />
      {active ? activeText : inactiveText}
    </span>
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

  /* ========================================================
     HEADER
  ======================================================== */

  .pageHeader {
    position: sticky;
    top: 0;
    z-index: 50;

    background: rgba(255, 255, 255, 0.95);

    border-bottom: 1px solid #e7ebf1;

    box-shadow:
      0 2px 10px rgba(15, 23, 42, 0.035);

    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  .headerInner {
    width: min(1400px, calc(100% - 48px));

    min-height: 88px;

    margin: 0 auto;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 25px;
  }

  .headerLeft {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 13px;
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
      background 0.18s ease,
      border-color 0.18s ease,
      color 0.18s ease,
      transform 0.18s ease;
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

  .headerIcon {
    width: 50px;
    height: 50px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 13px;

    background: #eff6ff;
    color: #2563eb;

    border: 1px solid #dbeafe;
  }

  .headerIcon svg {
    width: 23px;
    height: 23px;
  }

  .headerTitleBlock {
    min-width: 0;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 7px;

    margin-bottom: 4px;

    color: #94a3b8;

    font-size: 10px;
    font-weight: 650;
  }

  .breadcrumbSeparator {
    color: #cbd5e1;
  }

  .headerTitleBlock h1 {
    margin: 0;

    color: #172033;

    font-size: 24px;
    line-height: 1.2;

    font-weight: 750;

    letter-spacing: -0.4px;
  }

  .headerTitleBlock p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 11px;
    font-weight: 500;
  }

  /* ========================================================
     HEADER ACTIONS
  ======================================================== */

  .headerActions {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .refreshButton,
  .addButton {
    height: 39px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 7px;

    border-radius: 9px;

    cursor: pointer;

    font-size: 12px;
    font-weight: 650;

    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      background 0.18s ease;
  }

  .refreshButton {
    padding: 0 12px;

    border: 1px solid #e2e8f0;

    background: #ffffff;

    color: #64748b;
  }

  .refreshButton:hover:not(:disabled) {
    color: #2563eb;

    border-color: #bfdbfe;

    background: #eff6ff;

    transform: translateY(-1px);
  }

  .refreshButton:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .addButton {
    padding: 0 15px;

    border: none;

    background: #2563eb;

    color: #ffffff;

    box-shadow:
      0 4px 10px rgba(37, 99, 235, 0.18);
  }

  .addButton:hover {
    background: #1d4ed8;

    transform: translateY(-1px);

    box-shadow:
      0 7px 16px rgba(37, 99, 235, 0.23);
  }

  .refreshButton svg,
  .addButton svg {
    width: 16px;
    height: 16px;
  }

  /* ========================================================
     CONTENT
  ======================================================== */

  .content {
    width: min(1400px, calc(100% - 48px));

    margin: 0 auto;

    padding: 30px 0 50px;
  }

  /* ========================================================
     SUMMARY
  ======================================================== */

  .summaryGrid {
    display: grid;

    grid-template-columns:
      repeat(
        4,
        minmax(0, 1fr)
      );

    gap: 14px;

    margin-bottom: 25px;
  }

  .summaryCard {
    min-height: 88px;

    display: flex;
    align-items: center;

    gap: 12px;

    padding: 15px 17px;

    border: 1px solid #e5eaf1;
    border-radius: 13px;

    background: #ffffff;

    box-shadow:
      0 2px 5px rgba(15, 23, 42, 0.025);
  }

  .summaryIcon {
    width: 43px;
    height: 43px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 11px;
  }

  .summaryIcon svg {
    width: 19px;
    height: 19px;
  }

  .summaryIcon.blue {
    color: #2563eb;
    background: #eff6ff;
  }

  .summaryIcon.green {
    color: #16a34a;
    background: #f0fdf4;
  }

  .summaryIcon.red {
    color: #ef4444;
    background: #fef2f2;
  }

  .summaryIcon.purple {
    color: #7c3aed;
    background: #f5f3ff;
  }

  .summaryContent {
    min-width: 0;

    display: flex;
    flex-direction: column;
  }

  .summaryContent span {
    color: #94a3b8;

    font-size: 10px;
    font-weight: 600;
  }

  .summaryContent strong {
    margin-top: 4px;

    color: #1e293b;

    font-size: 22px;
    line-height: 1;

    font-weight: 750;
  }

  /* ========================================================
     TOOLBAR
  ======================================================== */

  .toolbar {
    min-height: 68px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 15px;

    padding: 12px 14px;

    border: 1px solid #e5eaf1;
    border-radius: 13px;

    background: #ffffff;

    box-shadow:
      0 2px 5px rgba(15, 23, 42, 0.025);

    margin-bottom: 25px;
  }

  .searchBox {
    width: min(430px, 100%);

    height: 40px;

    display: flex;
    align-items: center;

    gap: 9px;

    padding: 0 12px;

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
      0 0 0 3px rgba(37, 99, 235, 0.07);
  }

  .searchBox > svg {
    width: 16px;
    height: 16px;

    flex-shrink: 0;

    color: #94a3b8;
  }

  .searchBox input {
    width: 100%;

    border: none;
    outline: none;

    background: transparent;

    color: #334155;

    font-family: inherit;

    font-size: 12px;
  }

  .searchBox input::placeholder {
    color: #a8b3c2;
  }

  .clearSearch {
    all: unset;

    width: 24px;
    height: 24px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 6px;

    color: #94a3b8;

    cursor: pointer;
  }

  .clearSearch:hover {
    background: #e2e8f0;
    color: #475569;
  }

  .clearSearch svg {
    width: 13px;
    height: 13px;
  }

  .filterGroup {
    display: flex;
    align-items: center;

    gap: 8px;
  }

  .filterLabel {
    color: #94a3b8;

    font-size: 11px;
    font-weight: 600;
  }

  .selectWrapper {
    position: relative;

    display: flex;
    align-items: center;
  }

  .selectWrapper select {
    height: 40px;

    min-width: 145px;

    padding: 0 34px 0 11px;

    appearance: none;

    border: 1px solid #e2e8f0;
    border-radius: 9px;

    outline: none;

    background: #ffffff;

    color: #475569;

    font-family: inherit;

    font-size: 11px;
    font-weight: 600;

    cursor: pointer;
  }

  .selectWrapper > svg {
    position: absolute;

    right: 10px;

    width: 14px;
    height: 14px;

    pointer-events: none;

    color: #94a3b8;
  }

  /* ========================================================
     RESULTS HEADER
  ======================================================== */

  .resultsHeader {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;

    gap: 20px;

    margin-bottom: 13px;
  }

  .resultsHeader h2 {
    margin: 0;

    color: #1e293b;

    font-size: 17px;
    font-weight: 700;
  }

  .resultsHeader p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 11px;
  }

  .resultsHeader p strong {
    color: #64748b;
  }

  .clearFilters {
    all: unset;

    color: #2563eb;

    font-size: 11px;
    font-weight: 650;

    cursor: pointer;
  }

  .clearFilters:hover {
    text-decoration: underline;
  }

  /* ========================================================
     TABLE
  ======================================================== */

  .positionsTableWrapper {
    overflow: hidden;

    border: 1px solid #e5eaf1;
    border-radius: 14px;

    background: #ffffff;

    box-shadow:
      0 2px 6px rgba(15, 23, 42, 0.025);
  }

  .positionsTable {
    width: 100%;

    border-collapse: collapse;

    table-layout: auto;
  }

  .positionsTable thead {
    background: #f8fafc;
  }

  .positionsTable th {
    height: 48px;

    padding: 0 17px;

    border-bottom: 1px solid #e5eaf1;

    color: #64748b;

    font-size: 10px;
    font-weight: 700;

    letter-spacing: 0.25px;

    text-align: left;

    white-space: nowrap;
  }

  .positionsTable td {
    height: 78px;

    padding: 12px 17px;

    border-bottom: 1px solid #eef2f6;

    color: #475569;

    font-size: 11px;

    vertical-align: middle;
  }

  .positionsTable tbody tr {
    transition:
      background 0.15s ease;
  }

  .positionsTable tbody tr:hover {
    background: #fafcff;
  }

  .positionsTable tbody tr:last-child td {
    border-bottom: none;
  }

  .actionsColumn {
    width: 90px;

    text-align: right !important;
  }

  /* ========================================================
     POSITION CELL
  ======================================================== */

  .positionCell {
    display: flex;
    align-items: center;

    gap: 11px;
  }

  .positionAvatar {
    width: 39px;
    height: 39px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;

    background: #eff6ff;

    color: #2563eb;

    font-size: 13px;
    font-weight: 750;
  }

  .positionInfo {
    min-width: 0;

    display: flex;
    flex-direction: column;
  }

  .positionTitle {
    max-width: 190px;

    overflow: hidden;

    color: #1e293b;

    font-size: 12px;
    font-weight: 700;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .positionNumber {
    margin-top: 3px;

    color: #a0aabd;

    font-size: 9px;
    font-weight: 500;
  }

  /* ========================================================
     DEPARTMENT
  ======================================================== */

  .departmentValue {
    display: inline-block;

    max-width: 160px;

    overflow: hidden;

    color: #475569;

    font-size: 11px;
    font-weight: 550;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .workCenter {
    display: flex;
    align-items: center;

    gap: 6px;

    color: #64748b;
  }

  .workCenter svg {
    width: 13px;
    height: 13px;

    color: #94a3b8;
  }

  .mutedValue {
    color: #b0bac8;

    font-size: 10px;
  }

  /* ========================================================
     STATUS BADGES
  ======================================================== */

  .statusBadge {
    display: inline-flex;
    align-items: center;

    gap: 6px;

    padding: 5px 8px;

    border-radius: 7px;

    font-size: 9px;
    line-height: 1;

    font-weight: 700;

    white-space: nowrap;
  }

  .statusDot {
    width: 5px;
    height: 5px;

    border-radius: 50%;

    background: currentColor;
  }

  .statusBadge.active.green {
    background: #f0fdf4;
    color: #15803d;
  }

  .statusBadge.active.purple {
    background: #f5f3ff;
    color: #6d28d9;
  }

  .statusBadge.active.orange {
    background: #fff7ed;
    color: #c2410c;
  }

  .statusBadge.inactive {
    background: #f1f5f9;
    color: #64748b;
  }

  /* ========================================================
     ROW ACTIONS
  ======================================================== */

  .rowActions {
    display: flex;
    align-items: center;
    justify-content: flex-end;

    gap: 5px;
  }

  .rowAction {
    all: unset;

    width: 32px;
    height: 32px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    cursor: pointer;

    transition:
      background 0.18s ease,
      color 0.18s ease,
      transform 0.18s ease;
  }

  .rowAction svg {
    width: 15px;
    height: 15px;
  }

  .rowAction.edit {
    color: #2563eb;
  }

  .rowAction.edit:hover {
    background: #eff6ff;
    transform: translateY(-1px);
  }

  .rowAction.delete {
    color: #ef4444;
  }

  .rowAction.delete:hover {
    background: #fef2f2;
    transform: translateY(-1px);
  }

  /* ========================================================
     EMPTY STATE
  ======================================================== */

  .emptyCard {
    padding: 55px 30px;

    display: flex;
    flex-direction: column;
    align-items: center;

    border: 1px solid #e5eaf1;
    border-radius: 14px;

    background: #ffffff;

    box-shadow:
      0 2px 6px rgba(15, 23, 42, 0.025);

    text-align: center;
  }

  .emptyIcon {
    width: 62px;
    height: 62px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 16px;

    background: #eff6ff;

    color: #2563eb;
  }

  .emptyIcon svg {
    width: 27px;
    height: 27px;
  }

  .emptyCard h3 {
    margin: 18px 0 0;

    color: #1e293b;

    font-size: 18px;
    font-weight: 700;
  }

  .emptyCard p {
    margin: 6px 0 0;

    color: #94a3b8;

    font-size: 12px;
    line-height: 1.6;
  }

  .emptyAction {
    margin-top: 20px;

    height: 38px;

    padding: 0 14px;

    display: flex;
    align-items: center;

    gap: 7px;

    border: none;
    border-radius: 9px;

    background: #2563eb;

    color: #ffffff;

    cursor: pointer;

    font-size: 11px;
    font-weight: 650;
  }

  .emptyAction svg {
    width: 15px;
    height: 15px;
  }

  /* ========================================================
     DELETE MODAL
  ======================================================== */

  .modalOverlay {
    position: fixed;

    inset: 0;

    z-index: 100;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 20px;

    background: rgba(15, 23, 42, 0.42);

    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .deleteModal {
    width: min(420px, 100%);

    padding: 28px;

    border: 1px solid #e5e7eb;
    border-radius: 17px;

    background: #ffffff;

    box-shadow:
      0 25px 60px rgba(15, 23, 42, 0.18);

    animation: modalIn 0.18s ease-out;
  }

  .deleteModalIcon {
    width: 50px;
    height: 50px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 13px;

    background: #fef2f2;

    color: #ef4444;
  }

  .deleteModalIcon svg {
    width: 23px;
    height: 23px;
  }

  .deleteModal h2 {
    margin: 19px 0 0;

    color: #1e293b;

    font-size: 19px;
    font-weight: 750;
  }

  .deleteModal p {
    margin: 7px 0 0;

    color: #64748b;

    font-size: 12px;
    line-height: 1.65;
  }

  .deleteModal p strong {
    color: #334155;
  }

  .modalActions {
    display: flex;
    justify-content: flex-end;

    gap: 8px;

    margin-top: 25px;
  }

  .cancelButton,
  .confirmDeleteButton {
    height: 38px;

    padding: 0 14px;

    display: flex;
    align-items: center;

    gap: 7px;

    border-radius: 9px;

    cursor: pointer;

    font-family: inherit;

    font-size: 11px;
    font-weight: 650;
  }

  .cancelButton {
    border: 1px solid #e2e8f0;

    background: #ffffff;

    color: #64748b;
  }

  .cancelButton:hover:not(:disabled) {
    background: #f8fafc;
  }

  .confirmDeleteButton {
    border: none;

    background: #ef4444;

    color: #ffffff;

    box-shadow:
      0 4px 10px rgba(239, 68, 68, 0.16);
  }

  .confirmDeleteButton:hover:not(:disabled) {
    background: #dc2626;
  }

  .cancelButton:disabled,
  .confirmDeleteButton:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .confirmDeleteButton svg,
  .cancelButton svg {
    width: 14px;
    height: 14px;
  }

  /* ========================================================
     LOADING
  ======================================================== */

  .loadingPage {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loadingCard {
    width: min(380px, calc(100% - 40px));

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

  .spinner {
    width: 39px;
    height: 39px;

    border: 3px solid #e5e7eb;
    border-top-color: #2563eb;

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

  /* ========================================================
     ANIMATIONS
  ======================================================== */

  .spinning {
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

  @keyframes modalIn {
    from {
      opacity: 0;
      transform: translateY(7px) scale(0.98);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* ========================================================
     RESPONSIVE
  ======================================================== */

  @media (max-width: 1100px) {
    .summaryGrid {
      grid-template-columns:
        repeat(
          2,
          minmax(0, 1fr)
        );
    }

    .positionsTable th,
    .positionsTable td {
      padding-left: 13px;
      padding-right: 13px;
    }

    .positionsTable th:nth-child(3),
    .positionsTable td:nth-child(3) {
      display: none;
    }
  }

  @media (max-width: 800px) {
    .headerInner,
    .content {
      width: calc(100% - 30px);
    }

    .headerInner {
      min-height: 78px;
    }

    .headerTitleBlock p {
      display: none;
    }

    .refreshButton span {
      display: none;
    }

    .refreshButton {
      width: 39px;
      padding: 0;
    }

    .summaryGrid {
      grid-template-columns:
        repeat(
          2,
          minmax(0, 1fr)
        );
    }

    .toolbar {
      align-items: stretch;
      flex-direction: column;
    }

    .searchBox {
      width: 100%;
    }

    .filterGroup {
      justify-content: space-between;
    }

    .selectWrapper {
      flex: 1;
    }

    .selectWrapper select {
      width: 100%;
    }

    .positionsTableWrapper {
      overflow-x: auto;
    }

    .positionsTable {
      min-width: 880px;
    }
  }

  @media (max-width: 560px) {
    .pageHeader {
      position: relative;
    }

    .headerInner {
      width: calc(100% - 24px);

      gap: 9px;
    }

    .backButton {
      width: 36px;
      height: 36px;
    }

    .headerIcon {
      width: 43px;
      height: 43px;
    }

    .headerTitleBlock h1 {
      font-size: 20px;
    }

    .breadcrumb {
      display: none;
    }

    .addButton span {
      display: none;
    }

    .addButton {
      width: 39px;
      padding: 0;
    }

    .content {
      width: calc(100% - 24px);

      padding-top: 20px;
    }

    .summaryGrid {
      grid-template-columns: 1fr 1fr;

      gap: 9px;
    }

    .summaryCard {
      min-height: 75px;

      padding: 11px;
    }

    .summaryIcon {
      width: 36px;
      height: 36px;
    }

    .summaryIcon svg {
      width: 16px;
      height: 16px;
    }

    .summaryContent strong {
      font-size: 19px;
    }

    .summaryContent span {
      font-size: 9px;
    }

    .resultsHeader {
      align-items: flex-start;
    }

    .positionsTableWrapper {
      border-radius: 11px;
    }

    .modalActions {
      flex-direction: column-reverse;
    }

    .cancelButton,
    .confirmDeleteButton {
      width: 100%;

      justify-content: center;
    }
  }
`;