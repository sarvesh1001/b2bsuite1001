import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { axiosInstance } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { Role } from '@b2b/shared-types';

import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiUsers,
  FiChevronRight,
  FiMoreHorizontal,
  FiAlertTriangle,
  FiX,
} from 'react-icons/fi';

export default function RolesListScreen() {
  const router = useRouter();

  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  // =======================================================
  // HELPER: REQUEST HEADERS
  // =======================================================

  const getHeaders = useCallback(() => {
    if (!accessToken || !companyId || !deviceId) {
      throw new Error('Missing authentication information');
    }
    return {
      'X-Company-ID': companyId,
      'X-Device-ID': deviceId,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };
  }, [accessToken, companyId, deviceId]);

  // =======================================================
  // FETCH ROLES
  // =======================================================

  const fetchRoles = useCallback(
    async (showRefresh = false) => {
      if (!accessToken || !companyId || !deviceId) {
        setLoading(false);
        return;
      }

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const headers = getHeaders();
        const response = await axiosInstance.get(
          `/companies/${companyId}/rbac/roles`,
          {
            headers,
            params: {
              page: 1,
              limit: 50,
            },
          }
        );

        // Parse response – adjust based on actual API structure
        const data = response.data?.data || response.data || {};
        const rolesList = data.roles || data || [];

        setRoles(rolesList);
      } catch (error: any) {
        console.error('Failed to load roles:', error);

        window.alert(
          error?.response?.data?.message ||
            error?.message ||
            'Failed to load roles'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, companyId, deviceId, getHeaders]
  );

  // =======================================================
  // INITIAL LOAD + REFRESH ON ROUTE CHANGE
  // =======================================================

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (url === router.asPath) {
        fetchRoles(true);
      }
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [fetchRoles, router]);

  // =======================================================
  // SEARCH
  // =======================================================

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return roles;
    }

    return roles.filter((role) => {
      return (
        role.role_name?.toLowerCase().includes(query) ||
        role.description?.toLowerCase().includes(query) ||
        String(role.role_level).toLowerCase().includes(query)
      );
    });
  }, [roles, search]);

  // =======================================================
  // DELETE
  // =======================================================

  const handleDelete = async () => {
    if (!deleteTarget || !companyId || !deviceId || !accessToken) {
      return;
    }

    setDeleting(true);

    try {
      const headers = getHeaders();
      await axiosInstance.delete(
        `/companies/${companyId}/rbac/roles/${deleteTarget.role_id}`,
        { headers }
      );

      setDeleteTarget(null);

      // Refresh the list
      await fetchRoles(true);
    } catch (error: any) {
      console.error('Failed to delete role:', error);

      window.alert(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to delete role'
      );
    } finally {
      setDeleting(false);
    }
  };

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <>
        <div className="rolesPage loadingPage">
          <div className="loadingContainer">
            <div className="skeletonHeader">
              <div className="skeleton skeletonSmall" />
              <div className="skeleton skeletonTitle" />
              <div className="skeleton skeletonText" />
            </div>

            <div className="skeletonToolbar">
              <div className="skeleton skeletonSearch" />
              <div className="skeleton skeletonButton" />
            </div>

            <div className="skeletonTable">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="skeletonRow">
                  <div className="skeleton skeletonAvatar" />
                  <div className="skeletonRowText">
                    <div className="skeleton skeletonRoleName" />
                    <div className="skeleton skeletonRoleDescription" />
                  </div>
                  <div className="skeleton skeletonBadge" />
                  <div className="skeleton skeletonActions" />
                </div>
              ))}
            </div>
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
      <div className="rolesPage">
        {/* =================================================
            HEADER
        ================================================= */}

        <header className="pageHeader">
          <div className="headerInner">
            <div className="breadcrumb">
              <button
                type="button"
                onClick={() => router.push('/administration')}
              >
                Administration
              </button>

              <FiChevronRight />

              <span>Roles</span>
            </div>

            <div className="headerMain">
              <div className="titleArea">
                <div className="titleIcon">
                  <FiShield />
                </div>

                <div>
                  <h1>Roles</h1>
                  <p>Manage roles and access levels across your organization.</p>
                </div>
              </div>

              <button
                type="button"
                className="addButton"
                onClick={() => router.push('/administration/roles/new')}
              >
                <FiPlus />
                <span>Add Role</span>
              </button>
            </div>
          </div>

          <div className="accentLine" />
        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="content">
          {/* =================================================
              SUMMARY
          ================================================= */}

          <div className="summaryGrid">
            <div className="summaryCard">
              <div className="summaryCardIcon blue">
                <FiShield />
              </div>
              <div>
                <span className="summaryLabel">Total Roles</span>
                <strong>{roles.length}</strong>
              </div>
            </div>

            <div className="summaryCard">
              <div className="summaryCardIcon purple">
                <FiUsers />
              </div>
              <div>
                <span className="summaryLabel">System Roles</span>
                <strong>{roles.filter((role) => role.is_system_role).length}</strong>
              </div>
            </div>

            <div className="summaryCard">
              <div className="summaryCardIcon green">
                <FiUsers />
              </div>
              <div>
                <span className="summaryLabel">Custom Roles</span>
                <strong>{roles.filter((role) => !role.is_system_role).length}</strong>
              </div>
            </div>
          </div>

          {/* =================================================
              TOOLBAR
          ================================================= */}

          <div className="toolbar">
            <div className="toolbarLeft">
              <div className="searchBox">
                <FiSearch />

                <input
                  type="text"
                  placeholder="Search roles..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />

                {search && (
                  <button
                    type="button"
                    className="clearSearch"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                  >
                    <FiX />
                  </button>
                )}
              </div>
            </div>

            <div className="toolbarRight">
              <span className="resultCount">
                {filteredRoles.length} {filteredRoles.length === 1 ? 'role' : 'roles'}
              </span>

              <button
                type="button"
                className="refreshButton"
                onClick={() => fetchRoles(true)}
                disabled={refreshing}
                title="Refresh roles"
              >
                <FiRefreshCw className={refreshing ? 'spinning' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* =================================================
              EMPTY SEARCH
          ================================================= */}

          {roles.length > 0 && filteredRoles.length === 0 && (
            <div className="emptyState">
              <div className="emptyIcon">
                <FiSearch />
              </div>

              <h2>No roles found</h2>
              <p>
                No roles match "<strong>{search}</strong>". Try a different search.
              </p>

              <button
                type="button"
                className="secondaryButton"
                onClick={() => setSearch('')}
              >
                Clear Search
              </button>
            </div>
          )}

          {/* =================================================
              NO ROLES
          ================================================= */}

          {roles.length === 0 && (
            <div className="emptyState">
              <div className="emptyIcon purpleEmpty">
                <FiShield />
              </div>

              <h2>No roles yet</h2>
              <p>Create your first role to start managing permissions and access.</p>

              <button
                type="button"
                className="addButton emptyAddButton"
                onClick={() => router.push('/administration/roles/new')}
              >
                <FiPlus />
                Create First Role
              </button>
            </div>
          )}

          {/* =================================================
              DESKTOP ROLE TABLE
          ================================================= */}

          {filteredRoles.length > 0 && (
            <div className="rolesTable">
              <div className="tableHeader">
                <span>ROLE</span>
                <span>LEVEL</span>
                <span>TYPE</span>
                <span>DESCRIPTION</span>
                <span className="actionsHeader">ACTIONS</span>
              </div>

              {filteredRoles.map((role, index) => (
                <div key={role.role_id} className="roleRow">
                  {/* ROLE */}
                  <div className="roleIdentity">
                    <div
                      className="roleAvatar"
                      style={{
                        backgroundColor: role.is_system_role ? '#f1eafe' : '#eff6ff',
                        color: role.is_system_role ? '#7c3aed' : '#2563eb',
                      }}
                    >
                      {role.role_name?.charAt(0).toUpperCase() || 'R'}
                    </div>

                    <div className="roleIdentityText">
                      <strong>{role.role_name}</strong>
                      <span>Role #{String(index + 1).padStart(2, '0')}</span>
                    </div>
                  </div>

                  {/* LEVEL */}
                  <div>
                    <span className="levelBadge">Level {role.role_level}</span>
                  </div>

                  {/* TYPE */}
                  <div>
                    <span
                      className={
                        role.is_system_role ? 'typeBadge system' : 'typeBadge custom'
                      }
                    >
                      <span className="statusDot" />
                      {role.is_system_role ? 'System Role' : 'Custom Role'}
                    </span>
                  </div>

                  {/* DESCRIPTION */}
                  <div className="descriptionCell">
                    {role.description ? (
                      <span title={role.description}>{role.description}</span>
                    ) : (
                      <span className="noDescription">No description</span>
                    )}
                  </div>

                  {/* ACTIONS */}
                  <div className="rowActions">
                    <button
                      type="button"
                      className="rowAction editAction"
                      onClick={() =>
                        router.push(`/administration/roles/edit?roleId=${role.role_id}`)
                      }
                      title="Edit role"
                    >
                      <FiEdit2 />
                    </button>

                    {!role.is_system_role && (
                      <button
                        type="button"
                        className="rowAction deleteAction"
                        onClick={() => setDeleteTarget(role)}
                        title="Delete role"
                      >
                        <FiTrash2 />
                      </button>
                    )}

                    {role.is_system_role && (
                      <span className="protectedIcon" title="System roles cannot be deleted">
                        <FiShield />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* =================================================
              MOBILE CARDS
          ================================================= */}

          {filteredRoles.length > 0 && (
            <div className="mobileRoleList">
              {filteredRoles.map((role, index) => (
                <div key={role.role_id} className="mobileRoleCard">
                  <div className="mobileRoleTop">
                    <div
                      className="roleAvatar"
                      style={{
                        backgroundColor: role.is_system_role ? '#f1eafe' : '#eff6ff',
                        color: role.is_system_role ? '#7c3aed' : '#2563eb',
                      }}
                    >
                      {role.role_name?.charAt(0).toUpperCase() || 'R'}
                    </div>

                    <div className="mobileRoleTitle">
                      <strong>{role.role_name}</strong>
                      <span>Role #{String(index + 1).padStart(2, '0')}</span>
                    </div>

                    <button type="button" className="mobileMore" title="Actions">
                      <FiMoreHorizontal />
                    </button>
                  </div>

                  <div className="mobileBadges">
                    <span className="levelBadge">Level {role.role_level}</span>

                    <span
                      className={
                        role.is_system_role ? 'typeBadge system' : 'typeBadge custom'
                      }
                    >
                      <span className="statusDot" />
                      {role.is_system_role ? 'System Role' : 'Custom Role'}
                    </span>
                  </div>

                  {role.description && <p className="mobileDescription">{role.description}</p>}

                  <div className="mobileActions">
                    <button
                      type="button"
                      className="mobileEditButton"
                      onClick={() =>
                        router.push(`/administration/roles/edit?roleId=${role.role_id}`)
                      }
                    >
                      <FiEdit2 />
                      Edit
                    </button>

                    {!role.is_system_role && (
                      <button
                        type="button"
                        className="mobileDeleteButton"
                        onClick={() => setDeleteTarget(role)}
                      >
                        <FiTrash2 />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* =================================================
            DELETE MODAL
        ================================================= */}

        {deleteTarget && (
          <div
            className="modalBackdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !deleting) {
                setDeleteTarget(null);
              }
            }}
          >
            <div className="deleteModal">
              <div className="deleteModalIcon">
                <FiAlertTriangle />
              </div>

              <button
                type="button"
                className="modalClose"
                onClick={() => !deleting && setDeleteTarget(null)}
                disabled={deleting}
              >
                <FiX />
              </button>

              <h2>Delete role?</h2>

              <p>
                You are about to permanently delete <strong>{deleteTarget.role_name}</strong>.
                This action cannot be undone.
              </p>

              <div className="deleteModalActions">
                <button
                  type="button"
                  className="cancelDelete"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="confirmDelete"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <span className="buttonSpinner" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <FiTrash2 />
                      Delete Role
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
// STYLES (unchanged from original)
// =========================================================

const styles = `
  * {
    box-sizing: border-box;
  }

  .rolesPage {
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

    padding-bottom: 60px;
  }

  /* =======================================================
     PAGE HEADER
  ======================================================= */

  .pageHeader {
    position: relative;

    background: rgba(255, 255, 255, 0.96);

    border-bottom: 1px solid #e7ebf1;

    box-shadow:
      0 2px 10px rgba(15, 23, 42, 0.035);
  }

  .headerInner {
    width: min(1400px, calc(100% - 48px));

    margin: 0 auto;

    padding: 24px 0 26px;
  }

  .accentLine {
    position: absolute;

    bottom: 0;
    left: 0;

    width: 100%;
    height: 3px;

    background: #2563eb;
  }

  .breadcrumb {
    display: flex;
    align-items: center;

    gap: 5px;

    margin-bottom: 19px;

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

  .headerMain {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 25px;
  }

  .titleArea {
    display: flex;
    align-items: center;

    gap: 15px;
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
    width: 26px;
    height: 26px;
  }

  .titleArea h1 {
    margin: 0;

    color: #172033;

    font-size: 29px;
    line-height: 1.15;

    font-weight: 750;

    letter-spacing: -0.6px;
  }

  .titleArea p {
    margin: 6px 0 0;

    color: #64748b;

    font-size: 13px;
    line-height: 1.4;

    font-weight: 500;
  }

  /* =======================================================
     ADD BUTTON
  ======================================================= */

  .addButton {
    all: unset;

    padding: 11px 16px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 8px;

    border-radius: 10px;

    background: #2563eb;
    color: #ffffff;

    cursor: pointer;

    font-size: 12px;
    font-weight: 700;

    box-shadow:
      0 5px 12px rgba(37, 99, 235, 0.18);

    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      background 0.18s ease;
  }

  .addButton:hover {
    background: #1d4ed8;

    transform: translateY(-1px);

    box-shadow:
      0 8px 17px rgba(37, 99, 235, 0.23);
  }

  .addButton svg {
    width: 16px;
    height: 16px;
  }

  /* =======================================================
     CONTENT
  ======================================================= */

  .content {
    width: min(1400px, calc(100% - 48px));

    margin: 0 auto;

    padding: 30px 0 50px;
  }

  /* =======================================================
     SUMMARY CARDS
  ======================================================= */

  .summaryGrid {
    display: grid;

    grid-template-columns:
      repeat(
        3,
        minmax(0, 1fr)
      );

    gap: 15px;

    margin-bottom: 27px;
  }

  .summaryCard {
    min-height: 88px;

    display: flex;
    align-items: center;

    gap: 13px;

    padding: 15px 17px;

    border: 1px solid #e5eaf1;
    border-radius: 13px;

    background: #ffffff;

    box-shadow:
      0 2px 6px rgba(15,23,42,0.025);
  }

  .summaryCardIcon {
    width: 43px;
    height: 43px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 11px;
  }

  .summaryCardIcon svg {
    width: 19px;
    height: 19px;
  }

  .summaryCardIcon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .summaryCardIcon.purple {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .summaryCardIcon.green {
    background: #ecfdf5;
    color: #10b981;
  }

  .summaryCard > div:last-child {
    display: flex;
    flex-direction: column;
  }

  .summaryLabel {
    color: #94a3b8;

    font-size: 10px;
    line-height: 1.2;

    font-weight: 650;
  }

  .summaryCard strong {
    margin-top: 4px;

    color: #1e293b;

    font-size: 22px;
    line-height: 1;

    font-weight: 750;
  }

  /* =======================================================
     TOOLBAR
  ======================================================= */

  .toolbar {
    min-height: 56px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 15px;

    margin-bottom: 13px;
  }

  .toolbarLeft,
  .toolbarRight {
    display: flex;
    align-items: center;

    gap: 10px;
  }

  .searchBox {
    width: 300px;
    height: 40px;

    display: flex;
    align-items: center;

    gap: 9px;

    padding: 0 11px;

    border: 1px solid #dfe5ed;
    border-radius: 9px;

    background: #ffffff;

    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease;
  }

  .searchBox:focus-within {
    border-color: #93c5fd;

    box-shadow:
      0 0 0 3px rgba(37,99,235,0.08);
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

    font-size: 12px;
  }

  .searchBox input::placeholder {
    color: #a1acba;
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
  }

  .clearSearch:hover {
    background: #f1f5f9;
    color: #475569;
  }

  .clearSearch svg {
    width: 13px;
    height: 13px;
  }

  .resultCount {
    color: #94a3b8;

    font-size: 11px;
    font-weight: 600;
  }

  .refreshButton {
    all: unset;

    height: 38px;

    display: flex;
    align-items: center;

    gap: 7px;

    padding: 0 11px;

    border: 1px solid #dfe5ed;
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

  .refreshButton:hover:not(:disabled) {
    color: #2563eb;
    border-color: #bfdbfe;
    background: #eff6ff;
  }

  .refreshButton:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .refreshButton svg {
    width: 15px;
    height: 15px;
  }

  .spinning {
    animation: spin 0.8s linear infinite;
  }

  /* =======================================================
     TABLE
  ======================================================= */

  .rolesTable {
    overflow: hidden;

    border: 1px solid #e4e9f0;
    border-radius: 14px;

    background: #ffffff;

    box-shadow:
      0 3px 9px rgba(15,23,42,0.025);
  }

  .tableHeader,
  .roleRow {
    display: grid;

    grid-template-columns:
      minmax(230px, 1.5fr)
      110px
      145px
      minmax(220px, 1.5fr)
      105px;

    align-items: center;
  }

  .tableHeader {
    min-height: 45px;

    padding: 0 20px;

    border-bottom: 1px solid #edf0f4;

    background: #f8fafc;

    color: #94a3b8;

    font-size: 9px;
    font-weight: 750;

    letter-spacing: 0.6px;
  }

  .actionsHeader {
    text-align: right;
  }

  .roleRow {
    min-height: 82px;

    padding: 12px 20px;

    border-bottom: 1px solid #eef1f5;

    transition:
      background 0.18s ease;
  }

  .roleRow:last-child {
    border-bottom: none;
  }

  .roleRow:hover {
    background: #fbfcfe;
  }

  /* =======================================================
     ROLE IDENTITY
  ======================================================= */

  .roleIdentity {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 12px;
  }

  .roleAvatar {
    width: 41px;
    height: 41px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 11px;

    font-size: 15px;
    font-weight: 750;
  }

  .roleIdentityText {
    min-width: 0;

    display: flex;
    flex-direction: column;
  }

  .roleIdentityText strong {
    overflow: hidden;

    color: #1e293b;

    font-size: 13px;
    line-height: 1.3;

    font-weight: 700;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .roleIdentityText span {
    margin-top: 4px;

    color: #a1acba;

    font-size: 9px;
    font-weight: 600;
  }

  /* =======================================================
     BADGES
  ======================================================= */

  .levelBadge {
    display: inline-flex;
    align-items: center;

    padding: 5px 8px;

    border: 1px solid #e2e8f0;
    border-radius: 7px;

    background: #f8fafc;

    color: #64748b;

    font-size: 10px;
    font-weight: 650;
  }

  .typeBadge {
    display: inline-flex;
    align-items: center;

    gap: 6px;

    padding: 5px 8px;

    border-radius: 7px;

    font-size: 9px;
    font-weight: 700;
  }

  .typeBadge.system {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .typeBadge.custom {
    background: #ecfdf5;
    color: #059669;
  }

  .statusDot {
    width: 5px;
    height: 5px;

    border-radius: 50%;

    background: currentColor;
  }

  /* =======================================================
     DESCRIPTION
  ======================================================= */

  .descriptionCell {
    min-width: 0;

    padding-right: 15px;
  }

  .descriptionCell > span {
    display: block;

    overflow: hidden;

    color: #64748b;

    font-size: 11px;
    line-height: 1.4;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .noDescription {
    color: #c0c7d1 !important;

    font-style: italic;
  }

  /* =======================================================
     ACTIONS
  ======================================================= */

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
      color 0.18s ease;
  }

  .rowAction svg {
    width: 15px;
    height: 15px;
  }

  .editAction {
    color: #2563eb;
  }

  .editAction:hover {
    background: #eff6ff;
  }

  .deleteAction {
    color: #ef4444;
  }

  .deleteAction:hover {
    background: #fef2f2;
  }

  .protectedIcon {
    width: 32px;
    height: 32px;

    display: flex;
    align-items: center;
    justify-content: center;

    color: #cbd5e1;
  }

  .protectedIcon svg {
    width: 15px;
    height: 15px;
  }

  /* =======================================================
     MOBILE ROLE LIST
  ======================================================= */

  .mobileRoleList {
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

    border: 1px solid #e5eaf1;
    border-radius: 15px;

    background: #ffffff;

    text-align: center;

    box-shadow:
      0 3px 9px rgba(15,23,42,0.025);
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
  }

  .purpleEmpty {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .emptyIcon svg {
    width: 27px;
    height: 27px;
  }

  .emptyState h2 {
    margin: 19px 0 0;

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

  .emptyState p strong {
    color: #334155;
  }

  .secondaryButton {
    all: unset;

    margin-top: 21px;

    padding: 9px 14px;

    border: 1px solid #e2e8f0;
    border-radius: 9px;

    background: #ffffff;

    color: #475569;

    cursor: pointer;

    font-size: 11px;
    font-weight: 650;
  }

  .secondaryButton:hover {
    background: #f8fafc;
  }

  .emptyAddButton {
    margin-top: 21px;
  }

  /* =======================================================
     DELETE MODAL
  ======================================================= */

  .modalBackdrop {
    position: fixed;

    inset: 0;

    z-index: 100;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 20px;

    background: rgba(15, 23, 42, 0.42);

    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
  }

  .deleteModal {
    position: relative;

    width: min(410px, 100%);

    padding: 31px;

    border: 1px solid #e5e7eb;
    border-radius: 17px;

    background: #ffffff;

    box-shadow:
      0 25px 70px rgba(15,23,42,0.2);
  }

  .deleteModalIcon {
    width: 46px;
    height: 46px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 12px;

    background: #fef2f2;
    color: #ef4444;
  }

  .deleteModalIcon svg {
    width: 22px;
    height: 22px;
  }

  .modalClose {
    all: unset;

    position: absolute;

    top: 18px;
    right: 18px;

    width: 30px;
    height: 30px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 7px;

    color: #94a3b8;

    cursor: pointer;
  }

  .modalClose:hover {
    background: #f1f5f9;
    color: #475569;
  }

  .modalClose svg {
    width: 16px;
    height: 16px;
  }

  .deleteModal h2 {
    margin: 19px 0 0;

    color: #1e293b;

    font-size: 19px;
    font-weight: 750;
  }

  .deleteModal p {
    margin: 8px 0 0;

    color: #64748b;

    font-size: 12px;
    line-height: 1.65;
  }

  .deleteModal p strong {
    color: #334155;
  }

  .deleteModalActions {
    display: flex;
    justify-content: flex-end;

    gap: 9px;

    margin-top: 26px;
  }

  .cancelDelete,
  .confirmDelete {
    all: unset;

    min-height: 38px;

    padding: 0 14px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 7px;

    border-radius: 9px;

    cursor: pointer;

    font-size: 11px;
    font-weight: 700;
  }

  .cancelDelete {
    border: 1px solid #e2e8f0;

    background: #ffffff;

    color: #475569;
  }

  .cancelDelete:hover {
    background: #f8fafc;
  }

  .confirmDelete {
    background: #ef4444;
    color: #ffffff;
  }

  .confirmDelete:hover:not(:disabled) {
    background: #dc2626;
  }

  .cancelDelete:disabled,
  .confirmDelete:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .confirmDelete svg {
    width: 14px;
    height: 14px;
  }

  .buttonSpinner {
    width: 13px;
    height: 13px;

    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #ffffff;

    border-radius: 50%;

    animation: spin 0.7s linear infinite;
  }

  /* =======================================================
     LOADING SKELETON
  ======================================================= */

  .loadingPage {
    padding-top: 30px;
  }

  .loadingContainer {
    width: min(1400px, calc(100% - 48px));

    margin: 0 auto;
  }

  .skeleton {
    background:
      linear-gradient(
        90deg,
        #edf1f5 25%,
        #f7f9fb 50%,
        #edf1f5 75%
      );

    background-size: 200% 100%;

    animation: shimmer 1.3s infinite;
  }

  .skeletonHeader {
    height: 135px;

    margin-bottom: 25px;

    display: flex;
    flex-direction: column;

    gap: 10px;
  }

  .skeletonSmall {
    width: 100px;
    height: 11px;

    border-radius: 5px;
  }

  .skeletonTitle {
    width: 180px;
    height: 30px;

    border-radius: 7px;
  }

  .skeletonText {
    width: 280px;
    height: 12px;

    border-radius: 5px;
  }

  .skeletonToolbar {
    height: 50px;

    display: flex;
    justify-content: space-between;

    margin-bottom: 13px;
  }

  .skeletonSearch {
    width: 300px;
    height: 40px;

    border-radius: 9px;
  }

  .skeletonButton {
    width: 85px;
    height: 38px;

    border-radius: 9px;
  }

  .skeletonTable {
    overflow: hidden;

    border: 1px solid #e5eaf1;
    border-radius: 14px;

    background: #ffffff;
  }

  .skeletonRow {
    min-height: 82px;

    padding: 15px 20px;

    display: flex;
    align-items: center;

    gap: 14px;

    border-bottom: 1px solid #eef1f5;
  }

  .skeletonAvatar {
    width: 41px;
    height: 41px;

    flex-shrink: 0;

    border-radius: 11px;
  }

  .skeletonRowText {
    flex: 1;
  }

  .skeletonRoleName {
    width: 120px;
    height: 11px;

    border-radius: 5px;
  }

  .skeletonRoleDescription {
    width: 80px;
    height: 8px;

    margin-top: 7px;

    border-radius: 4px;
  }

  .skeletonBadge {
    width: 75px;
    height: 24px;

    border-radius: 7px;
  }

  .skeletonActions {
    width: 65px;
    height: 30px;

    border-radius: 7px;
  }

  /* =======================================================
     RESPONSIVE
  ======================================================= */

  @media (max-width: 1100px) {
    .tableHeader,
    .roleRow {
      grid-template-columns:
        minmax(200px, 1.5fr)
        100px
        130px
        minmax(170px, 1fr)
        90px;
    }
  }

  @media (max-width: 900px) {
    .summaryGrid {
      grid-template-columns: repeat(3, 1fr);
    }

    .descriptionCell {
      display: none;
    }

    .tableHeader,
    .roleRow {
      grid-template-columns:
        minmax(220px, 1fr)
        110px
        140px
        90px;
    }

    .tableHeader span:nth-child(4) {
      display: none;
    }
  }

  @media (max-width: 700px) {
    .headerInner,
    .content {
      width: calc(100% - 28px);
    }

    .headerInner {
      padding: 19px 0 21px;
    }

    .headerMain {
      align-items: flex-end;
    }

    .titleIcon {
      width: 50px;
      height: 50px;
    }

    .titleIcon svg {
      width: 22px;
      height: 22px;
    }

    .titleArea h1 {
      font-size: 24px;
    }

    .titleArea p {
      font-size: 11px;
    }

    .addButton span {
      display: none;
    }

    .addButton {
      width: 40px;
      height: 40px;

      padding: 0;
    }

    .addButton svg {
      width: 18px;
      height: 18px;
    }

    .summaryGrid {
      grid-template-columns: 1fr;
      gap: 9px;
    }

    .summaryCard {
      min-height: 72px;
    }

    .toolbar {
      align-items: stretch;
      flex-direction: column;
    }

    .toolbarLeft {
      width: 100%;
    }

    .searchBox {
      width: 100%;
    }

    .toolbarRight {
      justify-content: space-between;
    }

    .rolesTable {
      display: none;
    }

    .mobileRoleList {
      display: flex;

      flex-direction: column;

      gap: 10px;
    }

    .mobileRoleCard {
      padding: 16px;

      border: 1px solid #e5eaf1;
      border-radius: 13px;

      background: #ffffff;

      box-shadow:
        0 2px 6px rgba(15,23,42,0.025);
    }

    .mobileRoleTop {
      display: flex;
      align-items: center;

      gap: 11px;
    }

    .mobileRoleTitle {
      min-width: 0;

      flex: 1;

      display: flex;
      flex-direction: column;
    }

    .mobileRoleTitle strong {
      overflow: hidden;

      color: #1e293b;

      font-size: 13px;
      font-weight: 700;

      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mobileRoleTitle span {
      margin-top: 3px;

      color: #a1acba;

      font-size: 9px;
      font-weight: 600;
    }

    .mobileMore {
      all: unset;

      width: 30px;
      height: 30px;

      display: flex;
      align-items: center;
      justify-content: center;

      color: #94a3b8;
    }

    .mobileMore svg {
      width: 18px;
      height: 18px;
    }

    .mobileBadges {
      display: flex;

      flex-wrap: wrap;

      gap: 7px;

      margin-top: 14px;
    }

    .mobileDescription {
      margin: 12px 0 0;

      color: #64748b;

      font-size: 11px;
      line-height: 1.55;
    }

    .mobileActions {
      display: flex;

      gap: 8px;

      margin-top: 14px;

      padding-top: 12px;

      border-top: 1px solid #eef1f5;
    }

    .mobileEditButton,
    .mobileDeleteButton {
      all: unset;

      flex: 1;

      min-height: 35px;

      display: flex;
      align-items: center;
      justify-content: center;

      gap: 6px;

      border-radius: 8px;

      cursor: pointer;

      font-size: 11px;
      font-weight: 650;
    }

    .mobileEditButton {
      background: #eff6ff;
      color: #2563eb;
    }

    .mobileDeleteButton {
      background: #fef2f2;
      color: #ef4444;
    }

    .mobileEditButton svg,
    .mobileDeleteButton svg {
      width: 14px;
      height: 14px;
    }

    .loadingContainer {
      width: calc(100% - 28px);
    }

    .skeletonSearch {
      width: 100%;
    }
  }

  @media (max-width: 420px) {
    .breadcrumb {
      margin-bottom: 14px;
    }

    .titleArea {
      gap: 10px;
    }

    .titleIcon {
      width: 45px;
      height: 45px;

      border-radius: 12px;
    }

    .titleArea h1 {
      font-size: 21px;
    }

    .titleArea p {
      display: none;
    }

    .content {
      padding-top: 22px;
    }

    .deleteModal {
      padding: 25px 20px;
    }

    .deleteModalActions {
      flex-direction: column-reverse;
    }

    .cancelDelete,
    .confirmDelete {
      width: 100%;
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

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }

    100% {
      background-position: -200% 0;
    }
  }
`;