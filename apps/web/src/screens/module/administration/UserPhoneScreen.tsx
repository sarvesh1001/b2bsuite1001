import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  getUserPhone,
  findEmployeeByUsername,
} from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { UserAvatar } from '../../../components/UserAvatar';

import {
  FiSearch,
  FiX,
  FiPhone,
  FiMessageSquare,
  FiUser,
  FiArrowLeft,
  FiArrowRight,
  FiShield,
  FiCopy,
  FiCheck,
  FiAlertCircle,
} from 'react-icons/fi';

export default function UserPhoneScreen() {
  const router = useRouter();

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [selectedUserId, setSelectedUserId] =
    useState<string>();

  const [selectedUserName, setSelectedUserName] =
    useState<string>();

  const [phone, setPhone] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [copied, setCopied] =
    useState(false);

  // =======================================================
  // INITIAL USER FROM QUERY
  // =======================================================

  useEffect(() => {
    if (!router.isReady) return;

    const userId =
      typeof router.query.userId === 'string'
        ? router.query.userId
        : undefined;

    const userName =
      typeof router.query.userName === 'string'
        ? router.query.userName
        : undefined;

    if (userId) {
      setSelectedUserId(userId);
      setSelectedUserName(userName);
    }
  }, [
    router.isReady,
    router.query.userId,
    router.query.userName,
  ]);

  // =======================================================
  // FETCH PHONE
  // =======================================================

  useEffect(() => {
    const fetchPhone = async () => {
      if (
        !selectedUserId ||
        !accessToken ||
        !companyId ||
        !deviceId
      ) {
        return;
      }

      setLoading(true);
      setError(null);
      setPhone(null);

      try {
        const phoneNumber = await getUserPhone(
          companyId,
          selectedUserId,
          deviceId,
          accessToken
        );

        if (phoneNumber) {
          setPhone(phoneNumber);
        } else {
          setPhone(null);
          setError(
            'No phone number is available for this employee.'
          );
        }
      } catch (err) {
        console.error(
          'Failed to fetch phone:',
          err
        );

        setPhone(null);
        setError(
          'We could not retrieve the phone number. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPhone();
  }, [
    selectedUserId,
    accessToken,
    companyId,
    deviceId,
  ]);

  // =======================================================
  // SEARCH EMPLOYEE
  // =======================================================

  const handleSearch = async () => {
    const username = searchTerm.trim();

    if (
      !username ||
      !accessToken ||
      !companyId ||
      !deviceId
    ) {
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response =
        await findEmployeeByUsername(
          companyId,
          deviceId,
          username,
          accessToken
        );

      const employee =
        (response.data as any)?.employee || null;

      if (!employee) {
        setError(
          `No employee found with username "${username}".`
        );
        return;
      }

      setSelectedUserId(employee.user_id);

      setSelectedUserName(
        employee.full_name ||
          employee.username ||
          username
      );

      setPhone(null);
      setSearchTerm('');
    } catch (err) {
      console.error(
        'Failed to search employee:',
        err
      );

      setError(
        'Unable to search for this employee. Please try again.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  // =======================================================
  // CLEAR SELECTION
  // =======================================================

  const handleClearSelection = () => {
    setSelectedUserId(undefined);
    setSelectedUserName(undefined);
    setPhone(null);
    setError(null);
    setCopied(false);
  };

  // =======================================================
  // COPY PHONE
  // =======================================================

  const handleCopyPhone = async () => {
    if (!phone) return;

    try {
      await navigator.clipboard.writeText(phone);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (err) {
      console.error(
        'Unable to copy phone number:',
        err
      );
    }
  };

  // =======================================================
  // PHONE VALIDATION
  // =======================================================

  const isPhoneValid =
    !!phone &&
    phone.trim().length > 0;

  // =======================================================
  // SEARCH SCREEN
  // =======================================================

  if (!selectedUserId) {
    return (
      <>
        <div className="phonePage">

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

              <div className="headerTitleArea">

                <div className="headerIcon">
                  <FiPhone />
                </div>

                <div>
                  <div className="breadcrumb">
                    Modules
                    <FiArrowRight />
                    Administration
                    <FiArrowRight />
                    User Phone
                  </div>

                  <h1>User Phone</h1>

                  <p>
                    Find an employee and view their
                    contact number.
                  </p>
                </div>

              </div>

            </div>
          </header>

          {/* =================================================
              SEARCH CONTENT
          ================================================= */}

          <main className="searchMain">

            <div className="searchCard">

              <div className="searchIllustration">
                <div className="searchIllustrationIcon">
                  <FiSearch />
                </div>
              </div>

              <div className="searchHeading">
                <h2>Find an Employee</h2>

                <p>
                  Search using the employee's exact
                  username to view their contact
                  information.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="errorMessage">
                  <FiAlertCircle />

                  <span>{error}</span>

                  <button
                    type="button"
                    onClick={() =>
                      setError(null)
                    }
                    aria-label="Dismiss error"
                  >
                    <FiX />
                  </button>
                </div>
              )}

              {/* Search */}
              <div className="searchBox">

                <FiUser className="searchInputIcon" />

                <input
                  type="text"
                  placeholder="Enter employee username"
                  value={searchTerm}
                  autoComplete="off"
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Enter'
                    ) {
                      handleSearch();
                    }
                  }}
                />

                {searchTerm && (
                  <button
                    type="button"
                    className="clearSearchButton"
                    onClick={() =>
                      setSearchTerm('')
                    }
                    aria-label="Clear search"
                  >
                    <FiX />
                  </button>
                )}

                <button
                  type="button"
                  className="searchButton"
                  onClick={handleSearch}
                  disabled={
                    isSearching ||
                    !searchTerm.trim()
                  }
                >
                  {isSearching ? (
                    <span className="buttonSpinner" />
                  ) : (
                    <>
                      <FiSearch />
                      <span>Search</span>
                    </>
                  )}
                </button>

              </div>

              <div className="searchHint">
                <FiShield />

                <span>
                  Employee contact information is
                  available according to your access
                  permissions.
                </span>
              </div>

            </div>

          </main>
        </div>

        <style jsx>{styles}</style>
      </>
    );
  }

  // =======================================================
  // LOADING SCREEN
  // =======================================================

  if (loading) {
    return (
      <>
        <div className="phonePage">

          <header className="pageHeader">
            <div className="headerInner">

              <button
                type="button"
                className="backButton"
                onClick={handleClearSelection}
              >
                <FiArrowLeft />
              </button>

              <div className="headerTitleArea">

                <div className="headerIcon">
                  <FiPhone />
                </div>

                <div>
                  <div className="breadcrumb">
                    Modules
                    <FiArrowRight />
                    Administration
                    <FiArrowRight />
                    User Phone
                  </div>

                  <h1>User Phone</h1>
                </div>

              </div>

            </div>
          </header>

          <main className="loadingMain">

            <div className="loadingCard">

              <div className="largeSpinner" />

              <h2>Loading contact information</h2>

              <p>
                Retrieving phone number for{' '}
                <strong>
                  {selectedUserName ||
                    'this employee'}
                </strong>
                ...
              </p>

            </div>

          </main>
        </div>

        <style jsx>{styles}</style>
      </>
    );
  }

  // =======================================================
  // USER PHONE SCREEN
  // =======================================================

  return (
    <>
      <div className="phonePage">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="pageHeader">
          <div className="headerInner">

            <button
              type="button"
              className="backButton"
              onClick={handleClearSelection}
              aria-label="Back to employee search"
            >
              <FiArrowLeft />
            </button>

            <div className="headerTitleArea">

              <div className="headerIcon">
                <FiPhone />
              </div>

              <div>

                <div className="breadcrumb">
                  Modules
                  <FiArrowRight />
                  Administration
                  <FiArrowRight />
                  User Phone
                </div>

                <h1>Employee Contact</h1>

                <p>
                  Contact information for the selected
                  employee.
                </p>

              </div>

            </div>

          </div>
        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="profileMain">

          <div className="profileCard">

            {/* =================================================
                PROFILE HEADER
            ================================================= */}

            <div className="profileTop">

              <div className="avatarWrapper">

                <UserAvatar
                  userId={selectedUserId}
                  username={selectedUserName}
                  fullName={selectedUserName}
                  size={88}
                  className="profileAvatar"
                />

                <span className="onlineIndicator" />

              </div>

              <div className="profileInfo">

                <span className="employeeLabel">
                  EMPLOYEE
                </span>

                <h2>
                  {selectedUserName ||
                    'Unknown User'}
                </h2>

                <p>
                  Contact information
                </p>

              </div>

              <button
                type="button"
                className="changeUserButton"
                onClick={
                  handleClearSelection
                }
              >
                <FiSearch />
                Change
              </button>

            </div>

            {/* =================================================
                DIVIDER
            ================================================= */}

            <div className="profileDivider" />

            {/* =================================================
                PHONE SECTION
            ================================================= */}

            <div className="contactSection">

              <div className="contactLabel">
                <div className="contactLabelIcon">
                  <FiPhone />
                </div>

                <div>
                  <span>Phone Number</span>

                  <small>
                    Primary contact number
                  </small>
                </div>
              </div>

              {isPhoneValid ? (
                <div className="phoneDisplay">

                  <span className="phoneNumber">
                    {phone}
                  </span>

                  <button
                    type="button"
                    className="copyButton"
                    onClick={
                      handleCopyPhone
                    }
                    title="Copy phone number"
                  >
                    {copied ? (
                      <FiCheck />
                    ) : (
                      <FiCopy />
                    )}

                    <span>
                      {copied
                        ? 'Copied'
                        : 'Copy'}
                    </span>
                  </button>

                </div>
              ) : (
                <div className="noPhone">

                  <FiPhone />

                  <span>
                    {error ||
                      'No phone number available'}
                  </span>

                </div>
              )}

            </div>

            {/* =================================================
                ACTIONS
            ================================================= */}

            <div className="contactActions">

              <button
                type="button"
                className="callButton"
                disabled={!isPhoneValid}
                onClick={() =>
                  window.location.href =
                    `tel:${phone}`
                }
              >
                <span className="actionIcon">
                  <FiPhone />
                </span>

                <span className="actionText">
                  <strong>Call Employee</strong>
                  <small>
                    Start a phone call
                  </small>
                </span>

                <FiArrowRight className="actionArrow" />
              </button>

              <button
                type="button"
                className="messageButton"
                disabled={!isPhoneValid}
                onClick={() =>
                  window.location.href =
                    `sms:${phone}`
                }
              >
                <span className="actionIcon">
                  <FiMessageSquare />
                </span>

                <span className="actionText">
                  <strong>Send Message</strong>
                  <small>
                    Send an SMS
                  </small>
                </span>

                <FiArrowRight className="actionArrow" />
              </button>

            </div>

            {/* =================================================
                FOOTER
            ================================================= */}

            <div className="profileFooter">

              <FiShield />

              <span>
                Contact information is displayed based
                on your employee permissions.
              </span>

            </div>

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

  .phonePage {
    min-height: 100vh;

    background:
      radial-gradient(
        circle at 0% 0%,
        rgba(37, 99, 235, 0.045),
        transparent 28%
      ),
      radial-gradient(
        circle at 100% 10%,
        rgba(123, 47, 190, 0.035),
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
  }

  /* =======================================================
     HEADER
  ======================================================= */

  .pageHeader {
    position: sticky;
    top: 0;
    z-index: 20;

    background: rgba(255, 255, 255, 0.95);

    border-bottom: 1px solid #e7ebf1;

    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);

    box-shadow:
      0 2px 10px rgba(15, 23, 42, 0.035);
  }

  .headerInner {
    width: min(1200px, calc(100% - 48px));

    min-height: 94px;

    margin: 0 auto;

    display: flex;
    align-items: center;

    gap: 15px;
  }

  .backButton {
    all: unset;

    width: 42px;
    height: 42px;

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
      color 0.18s ease,
      background 0.18s ease,
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

  .headerTitleArea {
    display: flex;
    align-items: center;
    gap: 13px;

    min-width: 0;
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
    border: 1px solid #dbeafe;

    color: #2563eb;
  }

  .headerIcon svg {
    width: 22px;
    height: 22px;
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
    width: 11px;
    height: 11px;
  }

  .headerTitleArea h1 {
    margin: 0;

    color: #172033;

    font-size: 22px;
    line-height: 1.2;

    font-weight: 750;

    letter-spacing: -0.35px;
  }

  .headerTitleArea p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 11px;
    line-height: 1.4;

    font-weight: 500;
  }

  /* =======================================================
     SEARCH MAIN
  ======================================================= */

  .searchMain {
    width: min(720px, calc(100% - 48px));

    margin: 0 auto;

    padding: 70px 0 80px;
  }

  .searchCard {
    padding: 42px;

    border: 1px solid #e5eaf1;
    border-radius: 20px;

    background: #ffffff;

    box-shadow:
      0 12px 35px rgba(15, 23, 42, 0.055);
  }

  .searchIllustration {
    display: flex;
    justify-content: center;
  }

  .searchIllustrationIcon {
    width: 70px;
    height: 70px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 19px;

    background: #eff6ff;
    border: 1px solid #dbeafe;

    color: #2563eb;
  }

  .searchIllustrationIcon svg {
    width: 30px;
    height: 30px;
  }

  .searchHeading {
    margin-top: 22px;

    text-align: center;
  }

  .searchHeading h2 {
    margin: 0;

    color: #1e293b;

    font-size: 24px;
    font-weight: 750;

    letter-spacing: -0.4px;
  }

  .searchHeading p {
    max-width: 500px;

    margin: 8px auto 0;

    color: #64748b;

    font-size: 13px;
    line-height: 1.65;
  }

  /* =======================================================
     SEARCH BOX
  ======================================================= */

  .searchBox {
    position: relative;

    height: 54px;

    display: flex;
    align-items: center;

    margin-top: 28px;

    border: 1px solid #dfe5ed;
    border-radius: 12px;

    background: #ffffff;

    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease;
  }

  .searchBox:focus-within {
    border-color: #93c5fd;

    box-shadow:
      0 0 0 3px rgba(37, 99, 235, 0.08);
  }

  .searchInputIcon {
    width: 19px;
    height: 19px;

    flex-shrink: 0;

    margin-left: 16px;

    color: #94a3b8;
  }

  .searchBox input {
    min-width: 0;

    flex: 1;

    height: 100%;

    padding: 0 10px;

    border: none;
    outline: none;

    background: transparent;

    color: #1e293b;

    font-size: 14px;
    font-weight: 500;
  }

  .searchBox input::placeholder {
    color: #a8b2c1;
  }

  .clearSearchButton {
    all: unset;

    width: 30px;
    height: 30px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    color: #94a3b8;

    cursor: pointer;
  }

  .clearSearchButton:hover {
    color: #475569;
    background: #f1f5f9;
  }

  .clearSearchButton svg {
    width: 16px;
    height: 16px;
  }

  .searchButton {
    height: 42px;

    margin-right: 6px;
    padding: 0 17px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 7px;

    border: none;
    border-radius: 9px;

    background: #2563eb;
    color: #ffffff;

    cursor: pointer;

    font-size: 12px;
    font-weight: 650;

    transition:
      background 0.18s ease,
      transform 0.18s ease;
  }

  .searchButton:hover:not(:disabled) {
    background: #1d4ed8;
    transform: translateY(-1px);
  }

  .searchButton:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .searchButton svg {
    width: 16px;
    height: 16px;
  }

  .buttonSpinner {
    width: 16px;
    height: 16px;

    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #ffffff;

    border-radius: 50%;

    animation: spin 0.7s linear infinite;
  }

  /* =======================================================
     SEARCH HINT
  ======================================================= */

  .searchHint {
    margin-top: 17px;

    display: flex;
    align-items: flex-start;

    gap: 8px;

    padding: 11px 13px;

    border-radius: 9px;

    background: #f8fafc;

    color: #94a3b8;

    font-size: 10px;
    line-height: 1.5;
  }

  .searchHint svg {
    width: 14px;
    height: 14px;

    flex-shrink: 0;

    margin-top: 1px;

    color: #64748b;
  }

  /* =======================================================
     ERROR
  ======================================================= */

  .errorMessage {
    margin-top: 20px;

    display: flex;
    align-items: center;

    gap: 9px;

    padding: 11px 12px;

    border: 1px solid #fecaca;
    border-radius: 10px;

    background: #fef2f2;

    color: #b91c1c;

    font-size: 11px;
    font-weight: 550;
  }

  .errorMessage > svg {
    width: 16px;
    height: 16px;

    flex-shrink: 0;
  }

  .errorMessage span {
    flex: 1;
  }

  .errorMessage button {
    all: unset;

    width: 25px;
    height: 25px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 6px;

    cursor: pointer;
  }

  .errorMessage button:hover {
    background: rgba(185, 28, 28, 0.08);
  }

  .errorMessage button svg {
    width: 14px;
    height: 14px;
  }

  /* =======================================================
     LOADING
  ======================================================= */

  .loadingMain {
    min-height: calc(100vh - 94px);

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 40px;
  }

  .loadingCard {
    width: min(400px, 100%);

    padding: 38px 30px;

    display: flex;
    flex-direction: column;
    align-items: center;

    border: 1px solid #e5eaf1;
    border-radius: 18px;

    background: #ffffff;

    box-shadow:
      0 12px 35px rgba(15,23,42,0.055);

    text-align: center;
  }

  .largeSpinner {
    width: 42px;
    height: 42px;

    border: 3px solid #e5e7eb;
    border-top-color: #2563eb;

    border-radius: 50%;

    animation: spin 0.75s linear infinite;
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
    line-height: 1.5;
  }

  /* =======================================================
     PROFILE MAIN
  ======================================================= */

  .profileMain {
    width: min(760px, calc(100% - 48px));

    margin: 0 auto;

    padding: 55px 0 80px;
  }

  .profileCard {
    overflow: hidden;

    border: 1px solid #e5eaf1;
    border-radius: 20px;

    background: #ffffff;

    box-shadow:
      0 12px 35px rgba(15, 23, 42, 0.055);
  }

  /* =======================================================
     PROFILE TOP
  ======================================================= */

  .profileTop {
    position: relative;

    display: flex;
    align-items: center;

    gap: 19px;

    padding: 32px 34px;
  }

  .avatarWrapper {
    position: relative;

    flex-shrink: 0;
  }

  .profileAvatar {
    border-radius: 17px;
  }

  .onlineIndicator {
    position: absolute;

    right: 2px;
    bottom: 2px;

    width: 15px;
    height: 15px;

    border: 3px solid #ffffff;
    border-radius: 50%;

    background: #22c55e;
  }

  .profileInfo {
    min-width: 0;

    flex: 1;

    display: flex;
    flex-direction: column;
  }

  .employeeLabel {
    color: #2563eb;

    font-size: 9px;
    line-height: 1;

    font-weight: 750;

    letter-spacing: 1px;
  }

  .profileInfo h2 {
    overflow: hidden;

    margin: 6px 0 0;

    color: #172033;

    font-size: 23px;
    line-height: 1.2;

    font-weight: 750;

    letter-spacing: -0.4px;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profileInfo p {
    margin: 5px 0 0;

    color: #94a3b8;

    font-size: 11px;
  }

  .changeUserButton {
    all: unset;

    flex-shrink: 0;

    display: flex;
    align-items: center;

    gap: 6px;

    padding: 8px 11px;

    border: 1px solid #e2e8f0;
    border-radius: 8px;

    background: #ffffff;

    color: #64748b;

    cursor: pointer;

    font-size: 11px;
    font-weight: 650;

    transition:
      color 0.18s ease,
      background 0.18s ease,
      border-color 0.18s ease;
  }

  .changeUserButton:hover {
    color: #2563eb;

    background: #eff6ff;
    border-color: #bfdbfe;
  }

  .changeUserButton svg {
    width: 14px;
    height: 14px;
  }

  /* =======================================================
     DIVIDER
  ======================================================= */

  .profileDivider {
    height: 1px;

    background: #edf0f4;

    margin: 0 34px;
  }

  /* =======================================================
     CONTACT SECTION
  ======================================================= */

  .contactSection {
    padding: 28px 34px 30px;
  }

  .contactLabel {
    display: flex;
    align-items: center;

    gap: 11px;
  }

  .contactLabelIcon {
    width: 39px;
    height: 39px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;

    background: #eff6ff;

    color: #2563eb;
  }

  .contactLabelIcon svg {
    width: 18px;
    height: 18px;
  }

  .contactLabel > div:last-child {
    display: flex;
    flex-direction: column;
  }

  .contactLabel span {
    color: #334155;

    font-size: 12px;
    font-weight: 700;
  }

  .contactLabel small {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 10px;
  }

  .phoneDisplay {
    margin-top: 17px;

    min-height: 66px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 15px;

    padding: 13px 15px;

    border: 1px solid #e2e8f0;
    border-radius: 12px;

    background: #f8fafc;
  }

  .phoneNumber {
    color: #172033;

    font-size: 23px;
    line-height: 1.2;

    font-weight: 700;

    letter-spacing: 0.2px;
  }

  .copyButton {
    all: unset;

    display: flex;
    align-items: center;

    gap: 6px;

    padding: 8px 10px;

    border-radius: 8px;

    color: #64748b;

    cursor: pointer;

    font-size: 10px;
    font-weight: 650;

    transition:
      color 0.18s ease,
      background 0.18s ease;
  }

  .copyButton:hover {
    color: #2563eb;
    background: #eff6ff;
  }

  .copyButton svg {
    width: 15px;
    height: 15px;
  }

  .noPhone {
    margin-top: 17px;

    min-height: 66px;

    display: flex;
    align-items: center;

    gap: 9px;

    padding: 13px 15px;

    border: 1px solid #fee2e2;
    border-radius: 12px;

    background: #fef2f2;

    color: #b91c1c;

    font-size: 12px;
    font-weight: 550;
  }

  .noPhone svg {
    width: 18px;
    height: 18px;
  }

  /* =======================================================
     ACTIONS
  ======================================================= */

  .contactActions {
    display: grid;

    grid-template-columns: 1fr 1fr;

    gap: 12px;

    padding: 0 34px 30px;
  }

  .callButton,
  .messageButton {
    all: unset;

    min-height: 68px;

    display: flex;
    align-items: center;

    gap: 11px;

    padding: 10px 13px;

    border-radius: 12px;

    cursor: pointer;

    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      background 0.18s ease;
  }

  .callButton {
    background: #2563eb;
    color: #ffffff;

    box-shadow:
      0 5px 14px rgba(37, 99, 235, 0.17);
  }

  .messageButton {
    border: 1px solid #dbeafe;

    background: #eff6ff;

    color: #2563eb;
  }

  .callButton:hover:not(:disabled) {
    background: #1d4ed8;

    transform: translateY(-2px);

    box-shadow:
      0 8px 19px rgba(37, 99, 235, 0.23);
  }

  .messageButton:hover:not(:disabled) {
    background: #dbeafe;

    transform: translateY(-2px);
  }

  .callButton:disabled,
  .messageButton:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }

  .actionIcon {
    width: 38px;
    height: 38px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;

    background: rgba(255,255,255,0.14);
  }

  .messageButton .actionIcon {
    background: rgba(37,99,235,0.08);
  }

  .actionIcon svg {
    width: 18px;
    height: 18px;
  }

  .actionText {
    min-width: 0;

    flex: 1;

    display: flex;
    flex-direction: column;

    text-align: left;
  }

  .actionText strong {
    font-size: 12px;
    line-height: 1.3;
    font-weight: 700;
  }

  .actionText small {
    margin-top: 3px;

    color: rgba(255,255,255,0.68);

    font-size: 9px;
    line-height: 1.3;
  }

  .messageButton .actionText small {
    color: #64748b;
  }

  .actionArrow {
    width: 15px;
    height: 15px;

    flex-shrink: 0;

    opacity: 0.7;
  }

  /* =======================================================
     FOOTER
  ======================================================= */

  .profileFooter {
    min-height: 45px;

    display: flex;
    align-items: center;

    gap: 8px;

    padding: 0 34px;

    border-top: 1px solid #edf0f4;

    background: #fafbfc;

    color: #94a3b8;

    font-size: 9px;
    line-height: 1.4;
  }

  .profileFooter svg {
    width: 13px;
    height: 13px;

    flex-shrink: 0;
  }

  /* =======================================================
     RESPONSIVE
  ======================================================= */

  @media (max-width: 650px) {
    .headerInner {
      width: calc(100% - 28px);

      min-height: 78px;
    }

    .breadcrumb {
      display: none;
    }

    .headerIcon {
      width: 43px;
      height: 43px;
    }

    .headerTitleArea h1 {
      font-size: 19px;
    }

    .headerTitleArea p {
      display: none;
    }

    .searchMain,
    .profileMain {
      width: calc(100% - 28px);

      padding-top: 30px;
    }

    .searchCard {
      padding: 28px 20px;
    }

    .searchHeading h2 {
      font-size: 21px;
    }

    .searchBox {
      height: auto;

      min-height: 52px;

      flex-wrap: wrap;

      padding: 5px;
    }

    .searchInputIcon {
      margin-left: 10px;
    }

    .searchBox input {
      min-width: 120px;
    }

    .searchButton {
      height: 42px;
    }

    .profileTop {
      padding: 25px 20px;

      flex-wrap: wrap;
    }

    .changeUserButton {
      margin-left: auto;
    }

    .profileInfo {
      max-width: calc(100% - 120px);
    }

    .profileInfo h2 {
      font-size: 20px;
    }

    .profileDivider {
      margin: 0 20px;
    }

    .contactSection {
      padding: 25px 20px;
    }

    .phoneDisplay {
      align-items: flex-start;

      flex-direction: column;
    }

    .phoneNumber {
      font-size: 21px;
    }

    .contactActions {
      grid-template-columns: 1fr;

      padding: 0 20px 25px;
    }

    .profileFooter {
      padding: 10px 20px;
    }
  }

  @media (max-width: 420px) {
    .profileTop {
      align-items: flex-start;
    }

    .changeUserButton {
      width: 100%;

      justify-content: center;

      margin-left: 0;
      margin-top: 3px;
    }

    .profileInfo {
      max-width: calc(100% - 75px);
    }

    .phoneNumber {
      font-size: 19px;
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