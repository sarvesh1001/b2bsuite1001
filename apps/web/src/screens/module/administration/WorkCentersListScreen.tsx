import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

// ✅ Use axiosInstance directly – no idempotent wrappers
import { axiosInstance } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';

import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiSearch,
  FiX,
  FiArrowLeft,
  FiChevronRight,
  FiTool,
  FiCheckCircle,
  FiXCircle,
  FiMoreVertical,
  FiInbox,
} from 'react-icons/fi';

type WorkCenter = {
  work_center_code: string;
  name: string;
  description?: string;
  is_active: boolean;
};

export default function WorkCentersListScreen() {
  const router = useRouter();

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [filteredCenters, setFilteredCenters] = useState<WorkCenter[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  // Helper to get headers
  const getHeaders = () => ({
    'X-Company-ID': companyId!,
    'X-Device-ID': deviceId!,
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken!}`,
  });

  // =========================================================
  // FETCH WORK CENTERS
  // =========================================================

  const fetchWorkCenters = async (
    showRefresh = false
  ) => {
    if (!accessToken || !companyId || !deviceId) {
      console.warn('Missing authentication information');
      setLoading(false);
      return;
    }

    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await axiosInstance.get(
        `/companies/${companyId}/attendance/work-centers`,
        {
          headers: getHeaders(),
          params: {
            page: 1,
            page_size: 100,
          },
        }
      );

      const data: WorkCenter[] = response.data?.data || response.data || [];

      setWorkCenters(data);
      setFilteredCenters(data);
    } catch (error: any) {
      console.error('Failed to load work centers:', error);

      alert(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to load work centers'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorkCenters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, companyId, deviceId]);

  // =========================================================
  // SEARCH
  // =========================================================

  const performSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredCenters(workCenters);
      return;
    }

    if (!accessToken || !companyId || !deviceId) {
      return;
    }

    setSearching(true);

    try {
      const response = await axiosInstance.get(
        `/companies/${companyId}/attendance/work-centers/search`,
        {
          headers: getHeaders(),
          params: {
            name: query,
            page: 1,
            page_size: 100,
          },
        }
      );

      const data = response.data?.data || response.data || [];
      setFilteredCenters(data);
    } catch (error) {
      // Local fallback
      const normalizedQuery =
        query.toLowerCase().trim();

      const filtered = workCenters.filter(
        (wc) =>
          wc.name
            .toLowerCase()
            .includes(normalizedQuery) ||
          wc.work_center_code
            .toLowerCase()
            .includes(normalizedQuery)
      );

      setFilteredCenters(filtered);
    } finally {
      setSearching(false);
    }
  };

  // =========================================================
  // CLEAR SEARCH
  // =========================================================

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredCenters(workCenters);
  };

  // =========================================================
  // DELETE – OPTIMISTIC UPDATE (mobile‑style)
  // =========================================================

  const handleDelete = async (code: string) => {
    const workCenter = workCenters.find(
      (wc) => wc.work_center_code === code
    );

    const confirmed = window.confirm(
      `Are you sure you want to delete "${workCenter?.name || code}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    if (!accessToken || !companyId || !deviceId) {
      alert(
        'Missing authentication information. Please log in again.'
      );
      return;
    }

    setDeletingCode(code);

    try {
      await axiosInstance.delete(
        `/companies/${companyId}/attendance/work-centers/${code}`,
        { headers: getHeaders() }
      );

      // ✅ Optimistic update – remove from both lists immediately
      setWorkCenters((prev) =>
        prev.filter((wc) => wc.work_center_code !== code)
      );
      setFilteredCenters((prev) =>
        prev.filter((wc) => wc.work_center_code !== code)
      );

      // Optional: show a success toast here if you have a toast system
      // toast.success('Work center deleted');
    } catch (error: any) {
      console.error(
        'Failed to delete work center:',
        error
      );

      alert(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to delete work center'
      );
      // ❌ On error, we do NOT revert because the item was never removed from state
      // (the filter only ran after the successful delete)
    } finally {
      setDeletingCode(null);
    }
  };

  // =========================================================
  // STATS
  // =========================================================

  const totalCount = workCenters.length;

  const activeCount = useMemo(
    () =>
      workCenters.filter(
        (wc) => wc.is_active
      ).length,
    [workCenters]
  );

  const inactiveCount =
    totalCount - activeCount;

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <>
        <div className="page loadingPage">
          <div className="loadingCard">
            <div className="loadingSpinner" />

            <h2>Loading Work Centers</h2>

            <p>
              Fetching your manufacturing work
              centers...
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
                  router.push('/administration')
                }
                aria-label="Back to Administration"
              >
                <FiArrowLeft />
              </button>

              <div className="headerIcon">
                <FiTool />
              </div>

              <div className="headerTitleArea">

                <div className="breadcrumb">
                  <span>Administration</span>
                  <FiChevronRight />
                  <span>Work Centers</span>
                </div>

                <h1>Work Centers</h1>

                <p>
                  Manage production work centers
                  and their operational status.
                </p>

              </div>
            </div>

            <button
              type="button"
              className="addButton"
              onClick={() =>
                router.push('/administration/work-centers/new')
              }
            >
              <FiPlus />
              <span>Add Work Center</span>
            </button>

          </div>
        </header>

        {/* ===================================================
            CONTENT
        =================================================== */}

        <main className="content">

          {/* =================================================
              STATISTICS
          ================================================= */}

          <div className="statsGrid">

            <div className="statCard">

              <div className="statIcon totalStat">
                <FiTool />
              </div>

              <div className="statInfo">
                <span>Total Work Centers</span>
                <strong>{totalCount}</strong>
              </div>

            </div>

            <div className="statCard">

              <div className="statIcon activeStat">
                <FiCheckCircle />
              </div>

              <div className="statInfo">
                <span>Active</span>
                <strong>{activeCount}</strong>
              </div>

            </div>

            <div className="statCard">

              <div className="statIcon inactiveStat">
                <FiXCircle />
              </div>

              <div className="statInfo">
                <span>Inactive</span>
                <strong>{inactiveCount}</strong>
              </div>

            </div>

          </div>

          {/* =================================================
              LIST CONTAINER
          ================================================= */}

          <section className="listSection">

            {/* List header */}

            <div className="listHeader">

              <div>
                <h2>All Work Centers</h2>

                <p>
                  {searchQuery
                    ? `${filteredCenters.length} result${
                        filteredCenters.length === 1
                          ? ''
                          : 's'
                      } found`
                    : `${totalCount} work center${
                        totalCount === 1
                          ? ''
                          : 's'
                      }`}
                </p>
              </div>

              <button
                type="button"
                className="refreshButton"
                onClick={() =>
                  fetchWorkCenters(true)
                }
                disabled={refreshing}
                title="Refresh"
              >
                <FiRefreshCw
                  className={
                    refreshing
                      ? 'spin'
                      : ''
                  }
                />

                <span>Refresh</span>
              </button>

            </div>

            {/* =================================================
                SEARCH
            ================================================= */}

            <div className="searchWrapper">

              <FiSearch className="searchIcon" />

              <input
                type="text"
                placeholder="Search by work center name or code..."
                value={searchQuery}
                onChange={(e) =>
                  performSearch(
                    e.target.value
                  )
                }
              />

              {searching && (
                <div className="searchSpinner" />
              )}

              {!searching &&
                searchQuery && (
                  <button
                    type="button"
                    className="clearSearch"
                    onClick={clearSearch}
                    aria-label="Clear search"
                  >
                    <FiX />
                  </button>
                )}

            </div>

            {/* =================================================
                EMPTY STATE
            ================================================= */}

            {filteredCenters.length === 0 ? (
              <div className="emptyState">

                <div className="emptyIcon">
                  <FiInbox />
                </div>

                <h3>
                  {searchQuery
                    ? 'No Work Centers Found'
                    : 'No Work Centers Yet'}
                </h3>

                <p>
                  {searchQuery
                    ? `We couldn't find a work center matching "${searchQuery}".`
                    : 'Create your first work center to start managing your production operations.'}
                </p>

                {searchQuery ? (
                  <button
                    type="button"
                    className="emptySecondaryButton"
                    onClick={clearSearch}
                  >
                    Clear Search
                  </button>
                ) : (
                  <button
                    type="button"
                    className="emptyPrimaryButton"
                    onClick={() =>
                      router.push('/administration/work-centers/new')
                    }
                  >
                    <FiPlus />
                    Create Work Center
                  </button>
                )}

              </div>
            ) : (

              /* =================================================
                 DESKTOP TABLE
              ================================================= */

              <div className="tableWrapper">

                <table className="workCenterTable">

                  <thead>
                    <tr>
                      <th>Work Center</th>
                      <th>Code</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th className="actionsHeader">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>

                    {filteredCenters.map(
                      (wc, index) => (
                        <tr
                          key={
                            wc.work_center_code
                          }
                        >

                          {/* Work center */}

                          <td>
                            <div className="workCenterCell">

                              <div className="rowIcon">
                                <FiTool />
                              </div>

                              <div className="workCenterName">
                                <strong>
                                  {wc.name}
                                </strong>

                                <span>
                                  Work Center{' '}
                                  {String(
                                    index + 1
                                  ).padStart(
                                    2,
                                    '0'
                                  )}
                                </span>
                              </div>

                            </div>
                          </td>

                          {/* Code */}

                          <td>
                            <span className="codeBadge">
                              {wc.work_center_code}
                            </span>
                          </td>

                          {/* Description */}

                          <td>
                            <span className="description">
                              {wc.description ||
                                'No description provided'}
                            </span>
                          </td>

                          {/* Status */}

                          <td>
                            <span
                              className={`statusBadge ${
                                wc.is_active
                                  ? 'statusActive'
                                  : 'statusInactive'
                              }`}
                            >
                              <span className="statusDot" />

                              {wc.is_active
                                ? 'Active'
                                : 'Inactive'}
                            </span>
                          </td>

                          {/* Actions */}

                          <td>

                            <div className="rowActions">

                              <button
                                type="button"
                                className="editButton"
                                onClick={() =>
                                  router.push(
                                    `/administration/work-centers/edit?code=${encodeURIComponent(
                                      wc.work_center_code
                                    )}`
                                  )
                                }
                                title="Edit Work Center"
                              >
                                <FiEdit2 />
                              </button>

                              <button
                                type="button"
                                className="deleteButton"
                                onClick={() =>
                                  handleDelete(
                                    wc.work_center_code
                                  )
                                }
                                disabled={
                                  deletingCode ===
                                  wc.work_center_code
                                }
                                title="Delete Work Center"
                              >
                                {deletingCode ===
                                wc.work_center_code ? (
                                  <FiRefreshCw className="spin" />
                                ) : (
                                  <FiTrash2 />
                                )}
                              </button>

                              <button
                                type="button"
                                className="moreButton"
                                title="More options"
                              >
                                <FiMoreVertical />
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

          </section>

        </main>

      </div>

      <style jsx>{styles}</style>
    </>
  );
}

// =========================================================
// STYLES (unchanged – same as original)
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
    position: sticky;
    top: 0;
    z-index: 50;

    background: rgba(255,255,255,0.95);

    border-bottom: 1px solid #e6eaf0;

    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);

    box-shadow:
      0 2px 10px rgba(15,23,42,0.035);
  }

  .headerInner {
    width: min(1400px, calc(100% - 48px));

    min-height: 94px;

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

  /* =======================================================
     BACK
  ======================================================= */

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

  /* =======================================================
     PAGE ICON
  ======================================================= */

  .headerIcon {
    width: 52px;
    height: 52px;

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
    width: 24px;
    height: 24px;

    stroke-width: 1.8;
  }

  /* =======================================================
     TITLE
  ======================================================= */

  .headerTitleArea {
    min-width: 0;
  }

  .breadcrumb {
    display: flex;
    align-items: center;

    gap: 4px;

    margin-bottom: 4px;

    color: #94a3b8;

    font-size: 10px;
    font-weight: 650;
  }

  .breadcrumb svg {
    width: 12px;
    height: 12px;
  }

  .headerTitleArea h1 {
    margin: 0;

    color: #172033;

    font-size: 23px;
    line-height: 1.2;

    font-weight: 750;

    letter-spacing: -0.45px;
  }

  .headerTitleArea p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 11px;
    font-weight: 500;

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* =======================================================
     ADD BUTTON
  ======================================================= */

  .addButton {
    all: unset;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 8px;

    padding: 11px 16px;

    border-radius: 10px;

    background: #2563eb;

    color: #ffffff;

    cursor: pointer;

    font-size: 12px;
    font-weight: 650;

    box-shadow:
      0 5px 12px rgba(37,99,235,0.18);

    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      background 0.18s ease;
  }

  .addButton svg {
    width: 16px;
    height: 16px;
  }

  .addButton:hover {
    background: #1d4ed8;

    transform: translateY(-1px);

    box-shadow:
      0 8px 18px rgba(37,99,235,0.24);
  }

  /* =======================================================
     CONTENT
  ======================================================= */

  .content {
    width: min(1400px, calc(100% - 48px));

    margin: 0 auto;

    padding-top: 30px;
  }

  /* =======================================================
     STATS
  ======================================================= */

  .statsGrid {
    display: grid;

    grid-template-columns:
      repeat(3, minmax(0, 1fr));

    gap: 15px;

    margin-bottom: 22px;
  }

  .statCard {
    min-height: 92px;

    display: flex;
    align-items: center;

    gap: 13px;

    padding: 17px;

    border: 1px solid #e5eaf1;
    border-radius: 14px;

    background: #ffffff;

    box-shadow:
      0 2px 6px rgba(15,23,42,0.025);
  }

  .statIcon {
    width: 46px;
    height: 46px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 12px;
  }

  .statIcon svg {
    width: 21px;
    height: 21px;
  }

  .totalStat {
    background: #eff6ff;
    color: #2563eb;
  }

  .activeStat {
    background: #ecfdf5;
    color: #10b981;
  }

  .inactiveStat {
    background: #fef2f2;
    color: #ef4444;
  }

  .statInfo {
    display: flex;
    flex-direction: column;
  }

  .statInfo span {
    color: #94a3b8;

    font-size: 11px;
    font-weight: 600;
  }

  .statInfo strong {
    margin-top: 4px;

    color: #1e293b;

    font-size: 23px;
    line-height: 1;

    font-weight: 750;
  }

  /* =======================================================
     LIST SECTION
  ======================================================= */

  .listSection {
    overflow: hidden;

    border: 1px solid #e5eaf1;
    border-radius: 16px;

    background: #ffffff;

    box-shadow:
      0 3px 12px rgba(15,23,42,0.03);
  }

  .listHeader {
    min-height: 72px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;

    padding: 17px 20px;

    border-bottom: 1px solid #edf0f4;
  }

  .listHeader h2 {
    margin: 0;

    color: #1e293b;

    font-size: 16px;
    line-height: 1.3;

    font-weight: 700;
  }

  .listHeader p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 11px;
    font-weight: 500;
  }

  .refreshButton {
    all: unset;

    display: flex;
    align-items: center;

    gap: 7px;

    padding: 8px 11px;

    border: 1px solid #e2e8f0;
    border-radius: 8px;

    color: #64748b;

    cursor: pointer;

    font-size: 11px;
    font-weight: 600;

    transition:
      color 0.18s ease,
      background 0.18s ease,
      border-color 0.18s ease;
  }

  .refreshButton svg {
    width: 15px;
    height: 15px;
  }

  .refreshButton:hover:not(:disabled) {
    color: #2563eb;

    background: #eff6ff;

    border-color: #bfdbfe;
  }

  .refreshButton:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* =======================================================
     SEARCH
  ======================================================= */

  .searchWrapper {
    position: relative;

    margin: 17px 20px;

    height: 44px;

    display: flex;
    align-items: center;

    border: 1px solid #e1e6ee;
    border-radius: 10px;

    background: #f8fafc;

    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease,
      background 0.18s ease;
  }

  .searchWrapper:focus-within {
    background: #ffffff;

    border-color: #93c5fd;

    box-shadow:
      0 0 0 3px rgba(37,99,235,0.08);
  }

  .searchIcon {
    width: 17px;
    height: 17px;

    margin-left: 13px;

    flex-shrink: 0;

    color: #94a3b8;
  }

  .searchWrapper input {
    width: 100%;
    height: 100%;

    padding: 0 42px 0 10px;

    border: none;
    outline: none;

    background: transparent;

    color: #1e293b;

    font-family: inherit;

    font-size: 12px;
  }

  .searchWrapper input::placeholder {
    color: #a1aaba;
  }

  .clearSearch {
    all: unset;

    position: absolute;

    right: 11px;

    width: 25px;
    height: 25px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 6px;

    color: #94a3b8;

    cursor: pointer;
  }

  .clearSearch:hover {
    background: #f1f5f9;
    color: #475569;
  }

  .clearSearch svg {
    width: 15px;
    height: 15px;
  }

  .searchSpinner {
    position: absolute;

    right: 13px;

    width: 16px;
    height: 16px;

    border: 2px solid #dbeafe;
    border-top-color: #2563eb;

    border-radius: 50%;

    animation: spin 0.7s linear infinite;
  }

  /* =======================================================
     TABLE
  ======================================================= */

  .tableWrapper {
    width: 100%;

    overflow-x: auto;

    border-top: 1px solid #edf0f4;
  }

  .workCenterTable {
    width: 100%;

    border-collapse: collapse;

    table-layout: fixed;
  }

  .workCenterTable th {
    padding: 12px 18px;

    background: #f8fafc;

    border-bottom: 1px solid #e8ecf1;

    color: #64748b;

    font-size: 10px;
    line-height: 1.2;

    font-weight: 700;

    text-align: left;

    text-transform: uppercase;

    letter-spacing: 0.45px;
  }

  .workCenterTable th:nth-child(1) {
    width: 25%;
  }

  .workCenterTable th:nth-child(2) {
    width: 16%;
  }

  .workCenterTable th:nth-child(3) {
    width: 29%;
  }

  .workCenterTable th:nth-child(4) {
    width: 14%;
  }

  .workCenterTable th:nth-child(5) {
    width: 16%;
  }

  .workCenterTable td {
    padding: 14px 18px;

    border-bottom: 1px solid #eef1f5;

    vertical-align: middle;
  }

  .workCenterTable tbody tr {
    transition:
      background 0.15s ease;
  }

  .workCenterTable tbody tr:hover {
    background: #fafcff;
  }

  .workCenterTable tbody tr:last-child td {
    border-bottom: none;
  }

  /* =======================================================
     WORK CENTER CELL
  ======================================================= */

  .workCenterCell {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 11px;
  }

  .rowIcon {
    width: 38px;
    height: 38px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;

    background: #eff6ff;
    color: #2563eb;
  }

  .rowIcon svg {
    width: 17px;
    height: 17px;
  }

  .workCenterName {
    min-width: 0;

    display: flex;
    flex-direction: column;
  }

  .workCenterName strong {
    overflow: hidden;

    color: #1e293b;

    font-size: 12px;
    line-height: 1.35;

    font-weight: 700;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .workCenterName span {
    margin-top: 3px;

    color: #a1aaba;

    font-size: 9px;
    font-weight: 500;
  }

  /* =======================================================
     CODE
  ======================================================= */

  .codeBadge {
    display: inline-flex;

    padding: 5px 8px;

    border: 1px solid #e2e8f0;
    border-radius: 6px;

    background: #f8fafc;

    color: #475569;

    font-family:
      ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      monospace;

    font-size: 10px;

    font-weight: 600;

    letter-spacing: 0.1px;
  }

  /* =======================================================
     DESCRIPTION
  ======================================================= */

  .description {
    display: block;

    overflow: hidden;

    color: #64748b;

    font-size: 11px;
    line-height: 1.45;

    text-overflow: ellipsis;
    white-space: nowrap;
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

    font-size: 10px;
    font-weight: 650;
  }

  .statusActive {
    background: #ecfdf5;
    color: #059669;
  }

  .statusInactive {
    background: #fef2f2;
    color: #dc2626;
  }

  .statusDot {
    width: 6px;
    height: 6px;

    border-radius: 50%;

    background: currentColor;
  }

  /* =======================================================
     ACTIONS
  ======================================================= */

  .actionsHeader {
    text-align: right !important;
  }

  .rowActions {
    display: flex;
    align-items: center;
    justify-content: flex-end;

    gap: 5px;
  }

  .editButton,
  .deleteButton,
  .moreButton {
    all: unset;

    width: 32px;
    height: 32px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    cursor: pointer;

    transition:
      background 0.16s ease,
      color 0.16s ease;
  }

  .editButton {
    color: #2563eb;
  }

  .editButton:hover {
    background: #eff6ff;
  }

  .deleteButton {
    color: #ef4444;
  }

  .deleteButton:hover:not(:disabled) {
    background: #fef2f2;
  }

  .moreButton {
    color: #94a3b8;
  }

  .moreButton:hover {
    background: #f1f5f9;
    color: #475569;
  }

  .editButton svg,
  .deleteButton svg,
  .moreButton svg {
    width: 15px;
    height: 15px;
  }

  .deleteButton:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* =======================================================
     EMPTY
  ======================================================= */

  .emptyState {
    padding: 65px 30px;

    display: flex;
    flex-direction: column;
    align-items: center;

    text-align: center;

    border-top: 1px solid #edf0f4;
  }

  .emptyIcon {
    width: 66px;
    height: 66px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 17px;

    background: #eff6ff;
    color: #2563eb;
  }

  .emptyIcon svg {
    width: 28px;
    height: 28px;
  }

  .emptyState h3 {
    margin: 19px 0 0;

    color: #1e293b;

    font-size: 18px;
    font-weight: 700;
  }

  .emptyState p {
    max-width: 440px;

    margin: 7px 0 0;

    color: #94a3b8;

    font-size: 12px;
    line-height: 1.65;
  }

  .emptyPrimaryButton,
  .emptySecondaryButton {
    all: unset;

    margin-top: 22px;

    display: flex;
    align-items: center;

    gap: 7px;

    padding: 10px 14px;

    border-radius: 9px;

    cursor: pointer;

    font-size: 11px;
    font-weight: 650;
  }

  .emptyPrimaryButton {
    background: #2563eb;
    color: #ffffff;

    box-shadow:
      0 5px 12px rgba(37,99,235,0.18);
  }

  .emptySecondaryButton {
    border: 1px solid #e2e8f0;
    color: #475569;
    background: #ffffff;
  }

  .emptyPrimaryButton svg {
    width: 15px;
    height: 15px;
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

  .loadingSpinner {
    width: 40px;
    height: 40px;

    border: 3px solid #dbeafe;
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

  /* =======================================================
     ANIMATION
  ======================================================= */

  .spin {
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  /* =======================================================
     TABLET
  ======================================================= */

  @media (max-width: 900px) {

    .statsGrid {
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
    }

    .workCenterTable th:nth-child(3),
    .workCenterTable td:nth-child(3) {
      display: none;
    }

    .workCenterTable th:nth-child(1) {
      width: 34%;
    }

    .workCenterTable th:nth-child(2) {
      width: 23%;
    }

    .workCenterTable th:nth-child(4) {
      width: 20%;
    }

    .workCenterTable th:nth-child(5) {
      width: 23%;
    }
  }

  /* =======================================================
     MOBILE
  ======================================================= */

  @media (max-width: 650px) {

    .headerInner,
    .content {
      width: calc(100% - 28px);
    }

    .headerInner {
      min-height: 82px;
    }

    .headerIcon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
    }

    .headerIcon svg {
      width: 20px;
      height: 20px;
    }

    .headerTitleArea h1 {
      font-size: 19px;
    }

    .headerTitleArea p {
      display: none;
    }

    .breadcrumb {
      display: none;
    }

    .addButton {
      padding: 10px;

      width: 40px;
      height: 40px;
    }

    .addButton span {
      display: none;
    }

    .addButton svg {
      width: 19px;
      height: 19px;
    }

    .content {
      padding-top: 20px;
    }

    .statsGrid {
      grid-template-columns: 1fr;

      gap: 10px;

      margin-bottom: 15px;
    }

    .statCard {
      min-height: 70px;
    }

    .statIcon {
      width: 40px;
      height: 40px;
    }

    .statInfo strong {
      font-size: 20px;
    }

    .listHeader {
      padding: 15px;
    }

    .listHeader h2 {
      font-size: 15px;
    }

    .refreshButton span {
      display: none;
    }

    .refreshButton {
      width: 34px;
      height: 34px;

      padding: 0;

      justify-content: center;
    }

    .searchWrapper {
      margin: 13px 15px;
    }

    /*
      Turn table into a mobile-friendly
      stacked list.
    */

    .tableWrapper {
      overflow: visible;
    }

    .workCenterTable,
    .workCenterTable tbody {
      display: block;
      width: 100%;
    }

    .workCenterTable thead {
      display: none;
    }

    .workCenterTable tr {
      display: grid;

      grid-template-columns:
        1fr auto;

      gap: 8px;

      padding: 16px;

      border-bottom: 1px solid #edf0f4;
    }

    .workCenterTable tr:last-child {
      border-bottom: none;
    }

    .workCenterTable td {
      display: block;

      padding: 0;

      border: none;
    }

    .workCenterTable td:nth-child(1) {
      grid-column: 1 / 2;
    }

    .workCenterTable td:nth-child(2) {
      grid-column: 1 / 2;
    }

    .workCenterTable td:nth-child(3) {
      display: block;

      grid-column: 1 / 3;
    }

    .workCenterTable td:nth-child(4) {
      grid-column: 1 / 2;
    }

    .workCenterTable td:nth-child(5) {
      grid-column: 2 / 3;
      grid-row: 1 / 5;

      align-self: center;
    }

    .workCenterCell {
      padding-right: 10px;
    }

    .description {
      margin-top: 2px;

      max-width: 100%;
    }

    .rowActions {
      flex-direction: column;
    }

    .moreButton {
      display: none;
    }
  }

  @media (max-width: 420px) {

    .backButton {
      width: 36px;
      height: 36px;
    }

    .headerIcon {
      width: 40px;
      height: 40px;
    }

    .headerLeft {
      gap: 9px;
    }

    .headerTitleArea h1 {
      font-size: 17px;
    }
  }
`;