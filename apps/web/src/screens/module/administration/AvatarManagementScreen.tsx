import React, { useState, useRef } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import {
  FiPlus,
  FiStar,
  FiTrash2,
  FiRefreshCw,
  FiUpload,
  FiX,
  FiArrowLeft,
  FiChevronRight,
  FiImage,
  FiCheck,
  FiShield,
} from 'react-icons/fi';

import {
  listMyAvatars,
  listInactiveAvatars,
  generateAvatarUploadUrl,
  uploadAvatarFile,
  confirmAvatarUpload,
  setAvatarPrimary,
  deleteAvatar,
  reactivateAvatar,
  getAvatarUrl,
} from '@b2b/api-client';

import { useUserAuthStore } from '../../../store/userAuthStore';

type ViewMode = 'active' | 'deleted';

export default function AvatarManagementScreen() {
  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewMode, setViewMode] =
    useState<ViewMode>('active');

  const [uploading, setUploading] =
    useState(false);

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    avatarId: string | null;
  }>({
    open: false,
    avatarId: null,
  });

  // =========================================================
  // QUERIES
  // =========================================================

  const {
    data: activeAvatars = [],
    isLoading: activeLoading,
    refetch: refetchActive,
  } = useQuery({
    queryKey: ['myAvatars', 'active'],

    queryFn: () =>
      listMyAvatars(
        deviceId!,
        accessToken!,
        companyId!
      ),

    enabled:
      !!accessToken &&
      !!deviceId &&
      !!companyId,
  });

  const {
    data: inactiveAvatars = [],
    isLoading: inactiveLoading,
    refetch: refetchInactive,
  } = useQuery({
    queryKey: ['myAvatars', 'inactive'],

    queryFn: () =>
      listInactiveAvatars(
        deviceId!,
        accessToken!,
        companyId!
      ),

    enabled:
      !!accessToken &&
      !!deviceId &&
      !!companyId,
  });

  const isLoading =
    viewMode === 'active'
      ? activeLoading
      : inactiveLoading;

  const avatars =
    viewMode === 'active'
      ? activeAvatars
      : inactiveAvatars;

  const refetch =
    viewMode === 'active'
      ? refetchActive
      : refetchInactive;

  // =========================================================
  // MUTATIONS
  // =========================================================

  const setPrimaryMutation = useMutation({
    mutationFn: ({
      avatarId,
      idempotencyKey,
    }: {
      avatarId: string;
      idempotencyKey: string;
    }) =>
      setAvatarPrimary(
        avatarId,
        deviceId!,
        accessToken!,
        idempotencyKey,
        companyId!
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['myAvatars'],
      });

      alert('Primary avatar updated');
    },

    onError: (error: any) => {
      alert(
        error?.message ||
          'Failed to set primary avatar'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({
      avatarId,
      idempotencyKey,
    }: {
      avatarId: string;
      idempotencyKey: string;
    }) =>
      deleteAvatar(
        avatarId,
        deviceId!,
        accessToken!,
        idempotencyKey,
        companyId!
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['myAvatars'],
      });

      setDeleteDialog({
        open: false,
        avatarId: null,
      });

      alert('Avatar deleted');
    },

    onError: (error: any) => {
      alert(
        error?.message ||
          'Failed to delete avatar'
      );
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: ({
      avatarId,
      idempotencyKey,
      setPrimary,
    }: {
      avatarId: string;
      idempotencyKey: string;
      setPrimary: boolean;
    }) =>
      reactivateAvatar(
        avatarId,
        deviceId!,
        accessToken!,
        idempotencyKey,
        companyId!,
        setPrimary
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['myAvatars'],
      });

      alert('Avatar restored');
    },

    onError: (error: any) => {
      alert(
        error?.message ||
          'Failed to restore avatar'
      );
    },
  });

  // =========================================================
  // UPLOAD
  // =========================================================

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploading(true);

    try {
      const {
        uploadUrl,
        fileKey,
      } = await generateAvatarUploadUrl(
        file.type || 'image/jpeg',
        deviceId!,
        accessToken!,
        companyId!
      );

      await uploadAvatarFile(
        uploadUrl,
        fileKey,
        URL.createObjectURL(file),
        file.name,
        file.type,
        accessToken!,
        companyId!
      );

      const idempotencyKey =
        `confirm-${Date.now()}`;

      await confirmAvatarUpload(
        fileKey,
        file.type,
        true,
        deviceId!,
        accessToken!,
        idempotencyKey,
        companyId!
      );

      await queryClient.invalidateQueries({
        queryKey: ['myAvatars'],
      });

      alert(
        'Avatar uploaded and set as primary.'
      );
    } catch (error: any) {
      alert(
        error?.message ||
          'Upload failed'
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // =========================================================
  // HANDLERS
  // =========================================================

  const handleSetPrimary = (
    avatarId: string
  ) => {
    const idempotencyKey =
      `set-primary-${Date.now()}`;

    setPrimaryMutation.mutate({
      avatarId,
      idempotencyKey,
    });
  };

  const handleDelete = (
    avatarId: string
  ) => {
    setDeleteDialog({
      open: true,
      avatarId,
    });
  };

  const confirmDelete = () => {
    if (!deleteDialog.avatarId) return;

    const idempotencyKey =
      `delete-${Date.now()}`;

    deleteMutation.mutate({
      avatarId:
        deleteDialog.avatarId,
      idempotencyKey,
    });
  };

  const handleReactivate = (
    avatarId: string,
    setPrimary = false
  ) => {
    const idempotencyKey =
      `reactivate-${Date.now()}`;

    reactivateMutation.mutate({
      avatarId,
      idempotencyKey,
      setPrimary,
    });
  };

  // =========================================================
  // AUTH
  // =========================================================

  if (
    !accessToken ||
    !deviceId ||
    !companyId
  ) {
    return (
      <>
        <div className="avatarPage authPage">
          <div className="stateCard">
            <div className="stateIcon">
              <FiShield />
            </div>

            <h2>
              Authentication Required
            </h2>

            <p>
              Please sign in again to manage
              your avatars.
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
      <div className="avatarPage">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="pageHeader">

          <div className="headerInner">

            <button
              type="button"
              className="backButton"
              onClick={() =>
                window.history.back()
              }
              aria-label="Go back"
            >
              <FiArrowLeft />
            </button>

            <div className="headerIcon">
              <FiImage />
            </div>

            <div className="headerTitleArea">

              <div className="breadcrumb">
                <span>Profile</span>
                <FiChevronRight />
                <span>Avatars</span>
              </div>

              <h1>
                My Avatars
              </h1>

              <p>
                Manage your profile pictures
              </p>

            </div>

          </div>

          <div className="headerAccent" />

        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="content">

          {/* =================================================
              HERO
          ================================================= */}

          <section className="hero">

            <div className="heroText">

              <span className="eyebrow">
                PROFILE CUSTOMIZATION
              </span>

              <h2>
                Choose your identity
              </h2>

              <p>
                Keep your profile looking the way
                you want. Upload multiple avatars
                and choose one as your primary image.
              </p>

            </div>

            <div className="heroStats">

              <div className="stat">
                <strong>
                  {activeAvatars.length}
                </strong>

                <span>
                  Active
                </span>
              </div>

              <div className="statDivider" />

              <div className="stat">
                <strong>
                  {inactiveAvatars.length}
                </strong>

                <span>
                  Deleted
                </span>
              </div>

            </div>

          </section>

          {/* =================================================
              TOOLBAR
          ================================================= */}

          <section className="toolbar">

            <div className="tabs">

              <button
                type="button"
                className={
                  viewMode === 'active'
                    ? 'tab active'
                    : 'tab'
                }
                onClick={() =>
                  setViewMode('active')
                }
              >
                <span>
                  Active
                </span>

                <b>
                  {activeAvatars.length}
                </b>
              </button>

              <button
                type="button"
                className={
                  viewMode === 'deleted'
                    ? 'tab active deletedTab'
                    : 'tab'
                }
                onClick={() =>
                  setViewMode('deleted')
                }
              >
                <span>
                  Deleted
                </span>

                <b>
                  {inactiveAvatars.length}
                </b>
              </button>

            </div>

            <button
              type="button"
              className="refreshButton"
              onClick={() => refetch()}
              disabled={isLoading}
              title="Refresh"
            >
              <FiRefreshCw
                className={
                  isLoading
                    ? 'refreshing'
                    : ''
                }
              />

              <span>
                Refresh
              </span>
            </button>

          </section>

          {/* =================================================
              AVATARS
          ================================================= */}

          {isLoading ? (

            <div className="loadingArea">

              <div className="loadingSpinner" />

              <h3>
                Loading avatars
              </h3>

              <p>
                Please wait...
              </p>

            </div>

          ) : avatars.length === 0 ? (

            <div className="emptyState">

              <div className="emptyIcon">
                {viewMode === 'active'
                  ? <FiImage />
                  : <FiTrash2 />}
              </div>

              <h3>
                {viewMode === 'active'
                  ? 'No avatars yet'
                  : 'No deleted avatars'}
              </h3>

              <p>
                {viewMode === 'active'
                  ? 'Upload your first avatar to personalize your profile.'
                  : 'Deleted avatars will appear here.'}
              </p>

              {viewMode === 'active' && (
                <button
                  type="button"
                  className="uploadEmptyButton"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >
                  <FiUpload />
                  Upload Avatar
                </button>
              )}

            </div>

          ) : (

            <div className="avatarGrid">

              {avatars.map(
                (avatar: any, index: number) => {

                  const imageUrl =
                    getAvatarUrl(
                      avatar,
                      'medium'
                    );

                  const isPrimary =
                    avatar.isPrimary;

                  const isActive =
                    avatar.isActive;

                  return (
                    <article
                      key={avatar.id}
                      className={
                        isPrimary
                          ? 'avatarCard primaryCard'
                          : 'avatarCard'
                      }
                    >

                      {/* Primary badge */}

                      {isPrimary &&
                        isActive && (
                          <div className="primaryBadge">
                            <FiStar />
                            Primary
                          </div>
                        )}

                      {/* Card number */}

                      <span className="cardNumber">
                        {String(index + 1)
                          .padStart(2, '0')}
                      </span>

                      {/* Image */}

                      <div className="avatarImageWrapper">

                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={`${avatar.type || 'Avatar'}`}
                            className="avatarImage"
                          />
                        ) : (
                          <div className="imagePlaceholder">
                            <FiImage />
                          </div>
                        )}

                        {!isActive && (
                          <div className="deletedOverlay">
                            <FiTrash2 />
                          </div>
                        )}

                      </div>

                      {/* Info */}

                      <div className="avatarInfo">

                        <h3>
                          {avatar.type
                            ? avatar.type
                                .charAt(0)
                                .toUpperCase() +
                              avatar.type.slice(1)
                            : 'Avatar'}
                        </h3>

                        <p>
                          Uploaded{' '}
                          {new Date(
                            avatar.createdAt
                          ).toLocaleDateString(
                            undefined,
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            }
                          )}
                        </p>

                        {!isActive && (
                          <span className="deletedLabel">
                            Deleted
                          </span>
                        )}

                      </div>

                      {/* Actions */}

                      <div className="avatarActions">

                        {isActive ? (
                          <>

                            {!isPrimary && (
                              <button
                                type="button"
                                className="cardAction primaryAction"
                                onClick={() =>
                                  handleSetPrimary(
                                    avatar.id
                                  )
                                }
                                disabled={
                                  setPrimaryMutation.isPending
                                }
                                title="Set as primary"
                              >
                                <FiStar />

                                <span>
                                  Make Primary
                                </span>
                              </button>
                            )}

                            <button
                              type="button"
                              className="cardAction deleteAction"
                              onClick={() =>
                                handleDelete(
                                  avatar.id
                                )
                              }
                              disabled={
                                deleteMutation.isPending
                              }
                              title="Delete avatar"
                            >
                              <FiTrash2 />
                            </button>

                          </>
                        ) : (
                          <>

                            <button
                              type="button"
                              className="cardAction restoreAction"
                              onClick={() =>
                                handleReactivate(
                                  avatar.id,
                                  false
                                )
                              }
                              disabled={
                                reactivateMutation.isPending
                              }
                            >
                              <FiRefreshCw />

                              <span>
                                Restore
                              </span>
                            </button>

                            <button
                              type="button"
                              className="cardAction restorePrimaryAction"
                              onClick={() =>
                                handleReactivate(
                                  avatar.id,
                                  true
                                )
                              }
                              disabled={
                                reactivateMutation.isPending
                              }
                              title="Restore and make primary"
                            >
                              <FiStar />
                            </button>

                          </>
                        )}

                      </div>

                    </article>
                  );
                }
              )}

            </div>

          )}

        </main>

        {/* =================================================
            UPLOAD
        ================================================= */}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hiddenInput"
        />

        {viewMode === 'active' && (
          <button
            type="button"
            className="uploadButton"
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={uploading}
          >

            <div className="uploadButtonIcon">

              {uploading ? (
                <div className="buttonSpinner" />
              ) : (
                <FiPlus />
              )}

            </div>

            <div className="uploadButtonText">

              <strong>
                {uploading
                  ? 'Uploading...'
                  : 'Add Avatar'}
              </strong>

              <span>
                JPG, PNG, WEBP or GIF
              </span>

            </div>

          </button>
        )}

        {/* =================================================
            DELETE MODAL
        ================================================= */}

        {deleteDialog.open && (

          <div
            className="modalBackdrop"
            onClick={() =>
              setDeleteDialog({
                open: false,
                avatarId: null,
              })
            }
          >

            <div
              className="deleteModal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <button
                type="button"
                className="modalClose"
                onClick={() =>
                  setDeleteDialog({
                    open: false,
                    avatarId: null,
                  })
                }
              >
                <FiX />
              </button>

              <div className="deleteModalIcon">
                <FiTrash2 />
              </div>

              <h2>
                Delete this avatar?
              </h2>

              <p>
                This avatar will be moved to
                Deleted avatars. You can restore
                it later.
              </p>

              <div className="modalActions">

                <button
                  type="button"
                  className="cancelButton"
                  onClick={() =>
                    setDeleteDialog({
                      open: false,
                      avatarId: null,
                    })
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="confirmDeleteButton"
                  onClick={confirmDelete}
                  disabled={
                    deleteMutation.isPending
                  }
                >
                  {deleteMutation.isPending
                    ? 'Deleting...'
                    : 'Delete Avatar'}
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
// STYLES
// =========================================================

const styles = `
  * {
    box-sizing: border-box;
  }

  .avatarPage {
    min-height: 100vh;

    background:
      radial-gradient(
        circle at 0% 0%,
        rgba(123, 47, 190, 0.055),
        transparent 28%
      ),
      radial-gradient(
        circle at 100% 10%,
        rgba(0, 180, 219, 0.04),
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

    padding-bottom: 110px;
  }

  /* =======================================================
     HEADER
  ======================================================= */

  .pageHeader {
    position: relative;

    background: rgba(255,255,255,0.96);

    border-bottom: 1px solid #e7ebf1;

    box-shadow:
      0 2px 10px rgba(15,23,42,0.035);
  }

  .headerInner {
    width: min(1180px, calc(100% - 48px));

    min-height: 116px;

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

    background:
      linear-gradient(
        90deg,
        #00b4db,
        #7b2fbe
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

    border: 1px solid #e2e8f0;
    border-radius: 10px;

    background: #ffffff;
    color: #64748b;

    cursor: pointer;

    transition:
      transform .18s ease,
      color .18s ease,
      background .18s ease;
  }

  .backButton:hover {
    color: #7b2fbe;
    background: #f7f2ff;

    transform: translateX(-2px);
  }

  .backButton svg {
    width: 19px;
    height: 19px;
  }

  .headerIcon {
    width: 57px;
    height: 57px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 15px;

    background: #f1eafe;
    color: #7b2fbe;

    border: 1px solid #e7d9fb;
  }

  .headerIcon svg {
    width: 25px;
    height: 25px;
  }

  .headerTitleArea {
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
    width: 12px;
    height: 12px;
  }

  .headerTitleArea h1 {
    margin: 0;

    color: #172033;

    font-size: 28px;
    line-height: 1.15;

    font-weight: 750;

    letter-spacing: -.6px;
  }

  .headerTitleArea p {
    margin: 5px 0 0;

    color: #64748b;

    font-size: 12px;
    font-weight: 500;
  }

  /* =======================================================
     CONTENT
  ======================================================= */

  .content {
    width: min(1180px, calc(100% - 48px));

    margin: 0 auto;

    padding: 32px 0 50px;
  }

  /* =======================================================
     HERO
  ======================================================= */

  .hero {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 30px;

    padding: 26px 0 30px;
  }

  .heroText {
    max-width: 680px;
  }

  .eyebrow {
    color: #7b2fbe;

    font-size: 10px;
    font-weight: 750;

    letter-spacing: 1px;
  }

  .heroText h2 {
    margin: 7px 0 0;

    color: #172033;

    font-size: 29px;
    line-height: 1.2;

    font-weight: 750;

    letter-spacing: -.6px;
  }

  .heroText p {
    max-width: 620px;

    margin: 9px 0 0;

    color: #64748b;

    font-size: 13px;
    line-height: 1.65;

    font-weight: 500;
  }

  .heroStats {
    display: flex;
    align-items: center;

    min-width: 190px;

    padding: 15px 18px;

    border: 1px solid #e5eaf1;
    border-radius: 14px;

    background: rgba(255,255,255,.82);

    box-shadow:
      0 3px 10px rgba(15,23,42,.025);
  }

  .stat {
    min-width: 70px;

    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat strong {
    color: #1e293b;

    font-size: 22px;
    line-height: 1;

    font-weight: 750;
  }

  .stat span {
    margin-top: 5px;

    color: #94a3b8;

    font-size: 10px;
    font-weight: 600;
  }

  .statDivider {
    width: 1px;
    height: 34px;

    margin: 0 8px;

    background: #e5eaf1;
  }

  /* =======================================================
     TOOLBAR
  ======================================================= */

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 15px;

    margin-bottom: 19px;
  }

  .tabs {
    display: inline-flex;

    padding: 4px;

    border: 1px solid #e2e8f0;
    border-radius: 11px;

    background: #ffffff;
  }

  .tab {
    all: unset;

    min-width: 105px;

    padding: 8px 13px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 8px;

    border-radius: 8px;

    color: #64748b;

    font-size: 12px;
    font-weight: 650;

    cursor: pointer;

    transition:
      background .18s ease,
      color .18s ease;
  }

  .tab b {
    min-width: 20px;
    height: 20px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 6px;

    background: #f1f5f9;

    color: #64748b;

    font-size: 10px;
  }

  .tab:hover {
    background: #f8fafc;
  }

  .tab.active {
    background: #7b2fbe;
    color: #ffffff;

    box-shadow:
      0 3px 8px rgba(123,47,190,.2);
  }

  .tab.active b {
    background: rgba(255,255,255,.17);
    color: #ffffff;
  }

  .tab.active.deletedTab {
    background: #ef4444;
  }

  .refreshButton {
    all: unset;

    padding: 8px 12px;

    display: flex;
    align-items: center;

    gap: 7px;

    border: 1px solid #e2e8f0;
    border-radius: 9px;

    background: #ffffff;

    color: #64748b;

    cursor: pointer;

    font-size: 11px;
    font-weight: 650;

    transition:
      color .18s ease,
      background .18s ease;
  }

  .refreshButton:hover {
    color: #7b2fbe;
    background: #faf7ff;
  }

  .refreshButton:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .refreshButton svg {
    width: 15px;
    height: 15px;
  }

  .refreshing {
    animation: spin .8s linear infinite;
  }

  /* =======================================================
     AVATAR GRID
  ======================================================= */

  .avatarGrid {
    display: grid;

    grid-template-columns:
      repeat(
        3,
        minmax(0, 1fr)
      );

    gap: 18px;
  }

  /* =======================================================
     AVATAR CARD
  ======================================================= */

  .avatarCard {
    position: relative;

    min-width: 0;

    padding: 22px;

    display: flex;
    flex-direction: column;
    align-items: center;

    border: 1px solid #e5eaf1;
    border-radius: 17px;

    background: #ffffff;

    box-shadow:
      0 2px 5px rgba(15,23,42,.025);

    overflow: hidden;

    transition:
      transform .2s ease,
      box-shadow .2s ease,
      border-color .2s ease;
  }

  .avatarCard:hover {
    transform: translateY(-3px);

    border-color: #ddd3ec;

    box-shadow:
      0 12px 28px rgba(15,23,42,.08);
  }

  .primaryCard {
    border-color: #d9c7ee;

    background:
      linear-gradient(
        180deg,
        #fdfbff 0%,
        #ffffff 45%
      );
  }

  .cardNumber {
    position: absolute;

    top: 17px;
    right: 18px;

    color: #cbd5e1;

    font-size: 10px;
    font-weight: 750;

    letter-spacing: .6px;
  }

  /* =======================================================
     PRIMARY BADGE
  ======================================================= */

  .primaryBadge {
    position: absolute;

    top: 16px;
    left: 16px;

    padding: 5px 8px;

    display: flex;
    align-items: center;

    gap: 4px;

    border-radius: 7px;

    background: #fff7d6;

    color: #a16207;

    font-size: 9px;
    font-weight: 750;
  }

  .primaryBadge svg {
    width: 11px;
    height: 11px;

    fill: currentColor;
  }

  /* =======================================================
     IMAGE
  ======================================================= */

  .avatarImageWrapper {
    position: relative;

    width: 112px;
    height: 112px;

    margin-top: 12px;

    border-radius: 50%;

    padding: 4px;

    background:
      linear-gradient(
        135deg,
        #00b4db,
        #7b2fbe
      );

    box-shadow:
      0 7px 20px rgba(123,47,190,.15);
  }

  .primaryCard .avatarImageWrapper {
    background:
      linear-gradient(
        135deg,
        #f59e0b,
        #7b2fbe
      );
  }

  .avatarImage,
  .imagePlaceholder {
    width: 100%;
    height: 100%;

    border-radius: 50%;
  }

  .avatarImage {
    display: block;

    object-fit: cover;

    background: #f1f5f9;
  }

  .imagePlaceholder {
    display: flex;
    align-items: center;
    justify-content: center;

    background: #f1f5f9;

    color: #94a3b8;
  }

  .imagePlaceholder svg {
    width: 30px;
    height: 30px;
  }

  .deletedOverlay {
    position: absolute;

    inset: 4px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 50%;

    background: rgba(127,29,29,.68);

    color: #ffffff;
  }

  .deletedOverlay svg {
    width: 27px;
    height: 27px;
  }

  /* =======================================================
     INFO
  ======================================================= */

  .avatarInfo {
    width: 100%;

    margin-top: 17px;

    text-align: center;
  }

  .avatarInfo h3 {
    margin: 0;

    color: #1e293b;

    font-size: 15px;
    line-height: 1.3;

    font-weight: 700;
  }

  .avatarInfo p {
    margin: 5px 0 0;

    color: #94a3b8;

    font-size: 10px;
    line-height: 1.4;

    font-weight: 500;
  }

  .deletedLabel {
    display: inline-flex;

    margin-top: 7px;

    padding: 4px 7px;

    border-radius: 6px;

    background: #fef2f2;

    color: #dc2626;

    font-size: 9px;
    font-weight: 700;
  }

  /* =======================================================
     ACTIONS
  ======================================================= */

  .avatarActions {
    width: 100%;

    display: flex;
    align-items: center;

    gap: 7px;

    margin-top: 18px;
  }

  .cardAction {
    all: unset;

    min-height: 34px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 6px;

    border-radius: 8px;

    cursor: pointer;

    font-size: 10px;
    font-weight: 650;

    transition:
      background .18s ease,
      color .18s ease,
      transform .18s ease;
  }

  .cardAction:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .cardAction:disabled {
    opacity: .5;
    cursor: not-allowed;
  }

  .cardAction svg {
    width: 14px;
    height: 14px;
  }

  .primaryAction {
    flex: 1;

    background: #f5f0fb;
    color: #7b2fbe;
  }

  .primaryAction:hover:not(:disabled) {
    background: #ede4f8;
  }

  .deleteAction {
    width: 34px;

    border: 1px solid #fee2e2;

    background: #fffafa;

    color: #ef4444;
  }

  .deleteAction:hover:not(:disabled) {
    background: #fef2f2;
  }

  .restoreAction {
    flex: 1;

    background: #ecfdf5;

    color: #059669;
  }

  .restoreAction:hover:not(:disabled) {
    background: #d1fae5;
  }

  .restorePrimaryAction {
    width: 34px;

    background: #eff6ff;

    color: #2563eb;
  }

  .restorePrimaryAction:hover:not(:disabled) {
    background: #dbeafe;
  }

  /* =======================================================
     UPLOAD BUTTON
  ======================================================= */

  .hiddenInput {
    display: none;
  }

  .uploadButton {
    position: fixed;

    right: 28px;
    bottom: 27px;

    z-index: 40;

    min-width: 210px;

    display: flex;
    align-items: center;

    gap: 10px;

    padding: 10px 12px;

    border: none;
    border-radius: 14px;

    background:
      linear-gradient(
        135deg,
        #7b2fbe,
        #6230a5
      );

    color: #ffffff;

    cursor: pointer;

    box-shadow:
      0 10px 28px rgba(91,42,151,.28);

    transition:
      transform .2s ease,
      box-shadow .2s ease;
  }

  .uploadButton:hover:not(:disabled) {
    transform: translateY(-3px);

    box-shadow:
      0 15px 34px rgba(91,42,151,.34);
  }

  .uploadButton:disabled {
    opacity: .72;
    cursor: not-allowed;
  }

  .uploadButtonIcon {
    width: 38px;
    height: 38px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;

    background: rgba(255,255,255,.15);
  }

  .uploadButtonIcon svg {
    width: 19px;
    height: 19px;
  }

  .uploadButtonText {
    display: flex;
    flex-direction: column;

    text-align: left;
  }

  .uploadButtonText strong {
    font-size: 12px;
    line-height: 1.3;
  }

  .uploadButtonText span {
    margin-top: 2px;

    color: rgba(255,255,255,.68);

    font-size: 9px;
    font-weight: 500;
  }

  .buttonSpinner {
    width: 17px;
    height: 17px;

    border: 2px solid rgba(255,255,255,.35);
    border-top-color: #ffffff;

    border-radius: 50%;

    animation: spin .8s linear infinite;
  }

  /* =======================================================
     LOADING
  ======================================================= */

  .loadingArea {
    min-height: 360px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .loadingSpinner {
    width: 39px;
    height: 39px;

    border: 3px solid #e5e7eb;
    border-top-color: #7b2fbe;

    border-radius: 50%;

    animation: spin .8s linear infinite;
  }

  .loadingArea h3 {
    margin: 17px 0 0;

    color: #334155;

    font-size: 15px;
    font-weight: 700;
  }

  .loadingArea p {
    margin: 5px 0 0;

    color: #94a3b8;

    font-size: 11px;
  }

  /* =======================================================
     EMPTY
  ======================================================= */

  .emptyState {
    min-height: 360px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    padding: 40px;

    border: 1px dashed #dbe2ea;
    border-radius: 17px;

    background: rgba(255,255,255,.6);

    text-align: center;
  }

  .emptyIcon {
    width: 66px;
    height: 66px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 18px;

    background: #f1eafe;
    color: #7b2fbe;
  }

  .emptyIcon svg {
    width: 29px;
    height: 29px;
  }

  .emptyState h3 {
    margin: 18px 0 0;

    color: #1e293b;

    font-size: 18px;
    font-weight: 700;
  }

  .emptyState p {
    max-width: 390px;

    margin: 7px 0 0;

    color: #64748b;

    font-size: 12px;
    line-height: 1.6;
  }

  .uploadEmptyButton {
    all: unset;

    margin-top: 20px;

    padding: 10px 15px;

    display: flex;
    align-items: center;
    gap: 7px;

    border-radius: 9px;

    background: #7b2fbe;

    color: #ffffff;

    cursor: pointer;

    font-size: 11px;
    font-weight: 650;
  }

  .uploadEmptyButton svg {
    width: 15px;
    height: 15px;
  }

  /* =======================================================
     MODAL
  ======================================================= */

  .modalBackdrop {
    position: fixed;

    inset: 0;

    z-index: 100;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 20px;

    background: rgba(15,23,42,.48);

    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);

    animation: fadeIn .16s ease;
  }

  .deleteModal {
    position: relative;

    width: min(390px, 100%);

    padding: 30px;

    border: 1px solid #e5eaf1;
    border-radius: 18px;

    background: #ffffff;

    box-shadow:
      0 25px 70px rgba(15,23,42,.22);

    text-align: center;

    animation: modalIn .18s ease;
  }

  .modalClose {
    all: unset;

    position: absolute;

    top: 13px;
    right: 13px;

    width: 30px;
    height: 30px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

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

  .deleteModalIcon {
    width: 57px;
    height: 57px;

    margin: 0 auto;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 15px;

    background: #fef2f2;
    color: #ef4444;
  }

  .deleteModalIcon svg {
    width: 24px;
    height: 24px;
  }

  .deleteModal h2 {
    margin: 17px 0 0;

    color: #1e293b;

    font-size: 19px;
    font-weight: 750;
  }

  .deleteModal p {
    margin: 7px auto 0;

    max-width: 300px;

    color: #64748b;

    font-size: 12px;
    line-height: 1.6;
  }

  .modalActions {
    display: flex;

    gap: 9px;

    margin-top: 24px;
  }

  .cancelButton,
  .confirmDeleteButton {
    all: unset;

    flex: 1;

    padding: 10px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;

    cursor: pointer;

    font-size: 11px;
    font-weight: 650;
  }

  .cancelButton {
    border: 1px solid #e2e8f0;

    color: #64748b;

    background: #ffffff;
  }

  .cancelButton:hover {
    background: #f8fafc;
  }

  .confirmDeleteButton {
    background: #ef4444;

    color: #ffffff;
  }

  .confirmDeleteButton:hover:not(:disabled) {
    background: #dc2626;
  }

  .confirmDeleteButton:disabled {
    opacity: .6;
    cursor: not-allowed;
  }

  /* =======================================================
     AUTH STATE
  ======================================================= */

  .authPage {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stateCard {
    width: min(400px, calc(100% - 40px));

    padding: 40px 30px;

    display: flex;
    flex-direction: column;
    align-items: center;

    border: 1px solid #e5eaf1;
    border-radius: 18px;

    background: #ffffff;

    box-shadow:
      0 12px 35px rgba(15,23,42,.06);

    text-align: center;
  }

  .stateIcon {
    width: 64px;
    height: 64px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 17px;

    background: #f1eafe;
    color: #7b2fbe;
  }

  .stateIcon svg {
    width: 28px;
    height: 28px;
  }

  .stateCard h2 {
    margin: 18px 0 0;

    color: #1e293b;

    font-size: 19px;
    font-weight: 700;
  }

  .stateCard p {
    margin: 7px 0 0;

    color: #64748b;

    font-size: 12px;
  }

  /* =======================================================
     RESPONSIVE
  ======================================================= */

  @media (max-width: 1000px) {
    .avatarGrid {
      grid-template-columns:
        repeat(
          2,
          minmax(0, 1fr)
        );
    }
  }

  @media (max-width: 700px) {
    .headerInner,
    .content {
      width: calc(100% - 28px);
    }

    .headerInner {
      min-height: 95px;
    }

    .headerIcon {
      width: 49px;
      height: 49px;
    }

    .headerTitleArea h1 {
      font-size: 23px;
    }

    .breadcrumb {
      display: none;
    }

    .hero {
      flex-direction: column;
      align-items: flex-start;

      padding-top: 25px;
    }

    .heroText h2 {
      font-size: 25px;
    }

    .heroStats {
      width: 100%;
    }

    .toolbar {
      align-items: stretch;
    }

    .refreshButton span {
      display: none;
    }

    .refreshButton {
      width: 37px;
      padding: 0;

      justify-content: center;
    }
  }

  @media (max-width: 560px) {
    .avatarGrid {
      grid-template-columns: 1fr;
    }

    .avatarCard {
      min-height: 0;
    }

    .uploadButton {
      right: 14px;
      bottom: 14px;
      left: 14px;

      width: auto;

      justify-content: center;
    }

    .content {
      padding-top: 20px;
    }

    .tabs {
      width: 100%;
    }

    .tab {
      flex: 1;
    }

    .toolbar {
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

  @keyframes fadeIn {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes modalIn {
    from {
      opacity: 0;
      transform: translateY(8px) scale(.98);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;