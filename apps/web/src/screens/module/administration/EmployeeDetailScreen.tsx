import React from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { getEmployeeDetails } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { UserAvatar } from '../../../components/UserAvatar';
import { useAvatar } from '../../../hooks/useAvatar';

import {
  FiArrowLeft,
  FiBriefcase,
  FiCalendar,
  FiChevronRight,
  FiHash,
  FiHome,
  FiShield,
  FiUser,
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiPhone, // <-- phone icon added
} from 'react-icons/fi';

// =========================================================
// DETAIL ITEM
// =========================================================

interface DetailItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  accentColor?: string;
}

const DetailItem: React.FC<DetailItemProps> = ({
  icon,
  label,
  value,
  accentColor = '#64748B',
}) => {
  return (
    <div className="detailItem">
      <div
        className="detailIcon"
        style={{
          color: accentColor,
          backgroundColor: `${accentColor}12`,
        }}
      >
        {icon}
      </div>

      <div className="detailContent">
        <span className="detailLabel">{label}</span>

        <span className="detailValue">
          {value || '-'}
        </span>
      </div>
    </div>
  );
};

// =========================================================
// SECTION
// =========================================================

interface InfoSectionProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const InfoSection: React.FC<InfoSectionProps> = ({
  icon,
  title,
  subtitle,
  children,
}) => {
  return (
    <section className="infoSection">
      <div className="sectionTitle">
        <div className="sectionTitleIcon">
          {icon}
        </div>

        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="detailsGrid">
        {children}
      </div>
    </section>
  );
};

// =========================================================
// LOADING SKELETON
// =========================================================

function EmployeeLoading() {
  return (
    <>
      <div className="employeePage">
        <header className="pageHeader">
          <div className="headerInner">
            <div className="skeleton skeletonBack" />

            <div className="skeletonBreadcrumb">
              <div className="skeleton skeletonSmall" />
              <div className="skeleton skeletonTiny" />
              <div className="skeleton skeletonMedium" />
            </div>
          </div>
        </header>

        <main className="employeeContent">
          <div className="profileCard">
            <div className="profileMain">
              <div className="skeleton skeletonAvatar" />

              <div className="profileSkeletonText">
                <div className="skeleton skeletonName" />
                <div className="skeleton skeletonUsername" />
                <div className="skeleton skeletonStatus" />
              </div>
            </div>
          </div>

          <div className="skeletonSection">
            <div className="skeleton skeletonSectionTitle" />

            <div className="skeletonDetails">
              <div className="skeleton skeletonDetail" />
              <div className="skeleton skeletonDetail" />
              <div className="skeleton skeletonDetail" />
              <div className="skeleton skeletonDetail" />
            </div>
          </div>
        </main>
      </div>

      <style jsx>{styles}</style>
    </>
  );
}

// =========================================================
// ERROR STATE
// =========================================================

function EmployeeError({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <>
      <div className="employeePage statePage">
        <div className="stateCard">
          <div className="stateIcon">
            <FiUser />
          </div>

          <h2>Employee Not Found</h2>

          <p>
            We couldn't load the employee information.
            The employee may no longer exist or you may
            not have permission to view this profile.
          </p>

          <button
            type="button"
            className="primaryButton"
            onClick={onBack}
          >
            <FiArrowLeft />
            Go Back
          </button>
        </div>
      </div>

      <style jsx>{styles}</style>
    </>
  );
}

// =========================================================
// MAIN COMPONENT
// =========================================================

export default function EmployeeDetailScreen() {
  const router = useRouter();

  const { userId } = router.query;

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  // -------------------------------------------------------
  // Invalid ID
  // -------------------------------------------------------

  if (!userId || typeof userId !== 'string') {
    return (
      <>
        <div className="employeePage statePage">
          <div className="stateCard">
            <div className="stateIcon">
              <FiUser />
            </div>

            <h2>Invalid Employee</h2>

            <p>
              No valid employee ID was provided.
            </p>

            <button
              type="button"
              className="primaryButton"
              onClick={() => router.back()}
            >
              <FiArrowLeft />
              Go Back
            </button>
          </div>
        </div>

        <style jsx>{styles}</style>
      </>
    );
  }

  // -------------------------------------------------------
  // Employee query
  // -------------------------------------------------------

  const {
    data: employee,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['employee', userId],

    queryFn: () =>
      getEmployeeDetails(
        companyId!,
        userId,
        deviceId!,
        accessToken!
      ),

    enabled:
      !!userId &&
      !!accessToken &&
      !!companyId &&
      !!deviceId,
  });

  // -------------------------------------------------------
  // Avatar
  // -------------------------------------------------------

  const {
    avatarUrl,
    isLoading: avatarLoading,
  } = useAvatar(userId);

  // -------------------------------------------------------
  // Loading
  // -------------------------------------------------------

  if (isLoading) {
    return <EmployeeLoading />;
  }

  // -------------------------------------------------------
  // Error
  // -------------------------------------------------------

  if (error || !employee) {
    return (
      <EmployeeError
        onBack={() => router.back()}
      />
    );
  }

  // -------------------------------------------------------
  // Values
  // -------------------------------------------------------

  const fullName =
    employee.full_name || 'Unnamed Employee';

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((name: string) => name[0])
    .join('')
    .toUpperCase();

  const hireDate = employee.hire_date
    ? new Date(employee.hire_date).toLocaleDateString(
        'en-IN',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }
      )
    : null;

  // -------------------------------------------------------
  // Main
  // -------------------------------------------------------

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
              onClick={() => router.back()}
              aria-label="Go back"
            >
              <FiArrowLeft />
            </button>

            <div className="breadcrumb">
              <span>Modules</span>

              <FiChevronRight />

              <span>Employees</span>

              <FiChevronRight />

              <strong>{fullName}</strong>
            </div>

          </div>

          <div className="headerAccent" />
        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <main className="employeeContent">

          {/* =================================================
              PROFILE CARD
          ================================================= */}

          <section className="profileCard">

            <div className="profileTopLine" />

            <div className="profileMain">

              {/* Avatar */}
              <div className="avatarWrapper">

                <UserAvatar
                  userId={userId}
                  username={employee.username}
                  fullName={employee.full_name}
                  avatarUrl={avatarUrl}
                  loading={avatarLoading}
                  size={104}
                />

                <div
                  className={`avatarStatus ${
                    employee.is_active
                      ? 'statusActive'
                      : 'statusInactive'
                  }`}
                />
              </div>

              {/* Identity */}
              <div className="profileIdentity">

                <div className="profileNameRow">

                  <div>
                    <h1>{fullName}</h1>

                    {employee.username && (
                      <p className="username">
                        @{employee.username}
                      </p>
                    )}
                  </div>

                  <div
                    className={`statusBadge ${
                      employee.is_active
                        ? 'activeBadge'
                        : 'inactiveBadge'
                    }`}
                  >
                    {employee.is_active ? (
                      <FiCheckCircle />
                    ) : (
                      <FiXCircle />
                    )}

                    <span>
                      {employee.is_active
                        ? 'Active'
                        : 'Inactive'}
                    </span>
                  </div>

                </div>

                <div className="profileMeta">

                  {employee.employee_id && (
                    <div className="metaItem">
                      <FiHash />
                      <span>
                        {employee.employee_id}
                      </span>
                    </div>
                  )}

                  {employee.department_name && (
                    <div className="metaItem">
                      <FiUsers />
                      <span>
                        {employee.department_name}
                      </span>
                    </div>
                  )}

                  {employee.position_title && (
                    <div className="metaItem">
                      <FiBriefcase />
                      <span>
                        {employee.position_title}
                      </span>
                    </div>
                  )}

                </div>

              </div>

            </div>

          </section>

          {/* =================================================
              EMPLOYMENT
          ================================================= */}

          <InfoSection
            icon={<FiBriefcase />}
            title="Employment Information"
            subtitle="Your role and position within the organization"
          >

            <DetailItem
              icon={<FiHash />}
              label="Employee ID"
              value={employee.employee_id}
              accentColor="#2563EB"
            />

            <DetailItem
              icon={<FiShield />}
              label="Role"
              value={employee.role_name}
              accentColor="#7C3AED"
            />

            <DetailItem
              icon={<FiBriefcase />}
              label="Position"
              value={employee.position_title}
              accentColor="#0EA5E9"
            />

            <DetailItem
              icon={<FiCalendar />}
              label="Hire Date"
              value={hireDate}
              accentColor="#10B981"
            />

          </InfoSection>

          {/* =================================================
              ORGANIZATION
          ================================================= */}

          <InfoSection
            icon={<FiUsers />}
            title="Organization"
            subtitle="Where you work within the company structure"
          >

            <DetailItem
              icon={<FiUsers />}
              label="Department"
              value={employee.department_name}
              accentColor="#7C3AED"
            />

            {/* Phone field added as per new API */}
            <DetailItem
              icon={<FiPhone />}
              label="Phone"
              value={employee.phone}
              accentColor="#F97316"
            />

            <DetailItem
              icon={<FiHome />}
              label="Company"
              value={employee.company_id}
              accentColor="#2563EB"
            />

            <DetailItem
              icon={<FiShield />}
              label="Account Status"
              value={
                employee.is_active
                  ? 'Active'
                  : 'Inactive'
              }
              accentColor={
                employee.is_active
                  ? '#10B981'
                  : '#EF4444'
              }
            />

          </InfoSection>

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="pageFooter">

            <button
              type="button"
              className="footerBackButton"
              onClick={() => router.back()}
            >
              <FiArrowLeft />
              Back to Employees
            </button>

            <span>
              Employee profile
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

  .employeePage {
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
    position: relative;

    background: rgba(255, 255, 255, 0.96);

    border-bottom: 1px solid #e7ebf1;

    box-shadow:
      0 2px 10px rgba(15, 23, 42, 0.035);
  }

  .headerInner {
    width: min(1200px, calc(100% - 48px));

    min-height: 72px;

    margin: 0 auto;

    display: flex;
    align-items: center;

    gap: 14px;
  }

  .headerAccent {
    position: absolute;

    left: 0;
    bottom: 0;

    width: 100%;
    height: 3px;

    background: #2563eb;
  }

  .backButton {
    all: unset;

    width: 40px;
    height: 40px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border: 1px solid #e1e6ee;
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
    width: 19px;
    height: 19px;
  }

  .backButton:hover {
    color: #2563eb;

    background: #eff6ff;

    border-color: #bfdbfe;

    transform: translateX(-2px);
  }

  .breadcrumb {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 6px;

    color: #94a3b8;

    font-size: 12px;
    font-weight: 550;
  }

  .breadcrumb svg {
    width: 13px;
    height: 13px;

    flex-shrink: 0;
  }

  .breadcrumb strong {
    overflow: hidden;

    color: #334155;

    font-weight: 650;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* =======================================================
     CONTENT
  ======================================================= */

  .employeeContent {
    width: min(1200px, calc(100% - 48px));

    margin: 0 auto;

    padding: 32px 0 50px;
  }

  /* =======================================================
     PROFILE CARD
  ======================================================= */

  .profileCard {
    position: relative;

    overflow: hidden;

    margin-bottom: 24px;

    border: 1px solid #e3e8ef;
    border-radius: 18px;

    background: #ffffff;

    box-shadow:
      0 5px 18px rgba(15, 23, 42, 0.045);
  }

  .profileTopLine {
    width: 100%;
    height: 4px;

    background:
      linear-gradient(
        90deg,
        #2563eb,
        #7c3aed
      );
  }

  .profileMain {
    min-height: 190px;

    display: flex;
    align-items: center;

    gap: 25px;

    padding: 30px 34px;
  }

  /* =======================================================
     AVATAR
  ======================================================= */

  .avatarWrapper {
    position: relative;

    width: 104px;
    height: 104px;

    flex-shrink: 0;
  }

  .avatarStatus {
    position: absolute;

    right: 4px;
    bottom: 4px;

    width: 18px;
    height: 18px;

    border: 3px solid #ffffff;

    border-radius: 50%;
  }

  .statusActive {
    background: #22c55e;
  }

  .statusInactive {
    background: #ef4444;
  }

  /* =======================================================
     PROFILE IDENTITY
  ======================================================= */

  .profileIdentity {
    min-width: 0;
    flex: 1;
  }

  .profileNameRow {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;

    gap: 20px;
  }

  .profileNameRow h1 {
    margin: 0;

    color: #172033;

    font-size: 29px;
    line-height: 1.2;

    font-weight: 750;

    letter-spacing: -0.5px;
  }

  .username {
    margin: 6px 0 0;

    color: #94a3b8;

    font-size: 13px;
    font-weight: 500;
  }

  /* =======================================================
     STATUS
  ======================================================= */

  .statusBadge {
    flex-shrink: 0;

    display: flex;
    align-items: center;

    gap: 6px;

    padding: 7px 11px;

    border-radius: 8px;

    font-size: 11px;
    font-weight: 700;
  }

  .statusBadge svg {
    width: 14px;
    height: 14px;
  }

  .activeBadge {
    background: #ecfdf3;
    color: #15803d;

    border: 1px solid #bbf7d0;
  }

  .inactiveBadge {
    background: #fef2f2;
    color: #dc2626;

    border: 1px solid #fecaca;
  }

  /* =======================================================
     META
  ======================================================= */

  .profileMeta {
    display: flex;
    flex-wrap: wrap;

    gap: 8px;

    margin-top: 22px;
  }

  .metaItem {
    display: flex;
    align-items: center;

    gap: 6px;

    padding: 7px 10px;

    border: 1px solid #e8edf3;
    border-radius: 8px;

    background: #f8fafc;

    color: #64748b;

    font-size: 11px;
    font-weight: 600;
  }

  .metaItem svg {
    width: 13px;
    height: 13px;

    color: #94a3b8;
  }

  /* =======================================================
     INFORMATION SECTIONS
  ======================================================= */

  .infoSection {
    margin-top: 18px;

    padding: 25px;

    border: 1px solid #e3e8ef;
    border-radius: 16px;

    background: #ffffff;

    box-shadow:
      0 3px 12px rgba(15, 23, 42, 0.025);
  }

  .sectionTitle {
    display: flex;
    align-items: center;

    gap: 12px;

    padding-bottom: 20px;

    border-bottom: 1px solid #edf0f4;
  }

  .sectionTitleIcon {
    width: 40px;
    height: 40px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 10px;

    background: #eff6ff;
    color: #2563eb;
  }

  .sectionTitleIcon svg {
    width: 18px;
    height: 18px;
  }

  .sectionTitle h2 {
    margin: 0;

    color: #1e293b;

    font-size: 16px;
    line-height: 1.3;

    font-weight: 700;
  }

  .sectionTitle p {
    margin: 4px 0 0;

    color: #94a3b8;

    font-size: 11px;
    line-height: 1.3;

    font-weight: 500;
  }

  /* =======================================================
     DETAIL GRID
  ======================================================= */

  .detailsGrid {
    display: grid;

    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );

    column-gap: 45px;
  }

  .detailItem {
    min-width: 0;

    display: flex;
    align-items: center;

    gap: 12px;

    min-height: 78px;

    border-bottom: 1px solid #f0f2f5;
  }

  .detailIcon {
    width: 36px;
    height: 36px;

    flex-shrink: 0;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 9px;
  }

  .detailIcon svg {
    width: 16px;
    height: 16px;
  }

  .detailContent {
    min-width: 0;

    display: flex;
    flex-direction: column;

    gap: 4px;
  }

  .detailLabel {
    color: #94a3b8;

    font-size: 10px;
    line-height: 1.2;

    font-weight: 650;

    text-transform: uppercase;

    letter-spacing: 0.45px;
  }

  .detailValue {
    overflow: hidden;

    color: #334155;

    font-size: 13px;
    line-height: 1.4;

    font-weight: 650;

    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* =======================================================
     FOOTER
  ======================================================= */

  .pageFooter {
    display: flex;
    align-items: center;
    justify-content: space-between;

    margin-top: 25px;
  }

  .footerBackButton {
    all: unset;

    display: flex;
    align-items: center;

    gap: 7px;

    padding: 9px 13px;

    border: 1px solid #e2e8f0;
    border-radius: 9px;

    background: #ffffff;

    color: #64748b;

    cursor: pointer;

    font-size: 11px;
    font-weight: 650;

    transition:
      color 0.18s ease,
      border-color 0.18s ease,
      background 0.18s ease;
  }

  .footerBackButton:hover {
    color: #2563eb;

    border-color: #bfdbfe;

    background: #eff6ff;
  }

  .footerBackButton svg {
    width: 15px;
    height: 15px;
  }

  .pageFooter > span {
    color: #cbd5e1;

    font-size: 10px;
    font-weight: 550;
  }

  /* =======================================================
     STATE
  ======================================================= */

  .statePage {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stateCard {
    width: min(440px, calc(100% - 40px));

    padding: 42px 30px;

    display: flex;
    flex-direction: column;
    align-items: center;

    border: 1px solid #e3e8ef;
    border-radius: 18px;

    background: #ffffff;

    box-shadow:
      0 12px 35px rgba(15, 23, 42, 0.06);

    text-align: center;
  }

  .stateIcon {
    width: 68px;
    height: 68px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 18px;

    background: #eff6ff;
    color: #2563eb;
  }

  .stateIcon svg {
    width: 30px;
    height: 30px;
  }

  .stateCard h2 {
    margin: 20px 0 0;

    color: #1e293b;

    font-size: 21px;
    font-weight: 700;
  }

  .stateCard p {
    max-width: 360px;

    margin: 8px 0 0;

    color: #64748b;

    font-size: 13px;
    line-height: 1.65;
  }

  .primaryButton {
    all: unset;

    margin-top: 24px;

    padding: 10px 16px;

    display: flex;
    align-items: center;

    gap: 7px;

    border-radius: 9px;

    background: #2563eb;
    color: #ffffff;

    cursor: pointer;

    font-size: 12px;
    font-weight: 650;

    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease;
  }

  .primaryButton:hover {
    transform: translateY(-1px);

    box-shadow:
      0 6px 16px rgba(37, 99, 235, 0.22);
  }

  .primaryButton svg {
    width: 15px;
    height: 15px;
  }

  /* =======================================================
     LOADING SKELETON
  ======================================================= */

  .skeleton {
    background:
      linear-gradient(
        90deg,
        #eef1f5 25%,
        #f7f8fa 50%,
        #eef1f5 75%
      );

    background-size: 200% 100%;

    animation: skeletonLoading 1.4s ease infinite;

    border-radius: 7px;
  }

  .skeletonBack {
    width: 40px;
    height: 40px;
  }

  .skeletonBreadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .skeletonSmall {
    width: 55px;
    height: 12px;
  }

  .skeletonTiny {
    width: 8px;
    height: 12px;
  }

  .skeletonMedium {
    width: 120px;
    height: 12px;
  }

  .skeletonAvatar {
    width: 104px;
    height: 104px;

    flex-shrink: 0;

    border-radius: 50%;
  }

  .profileSkeletonText {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .skeletonName {
    width: 230px;
    height: 27px;
  }

  .skeletonUsername {
    width: 120px;
    height: 13px;
  }

  .skeletonStatus {
    width: 65px;
    height: 27px;
  }

  .skeletonSection {
    margin-top: 18px;

    padding: 25px;

    border: 1px solid #e3e8ef;
    border-radius: 16px;

    background: #ffffff;
  }

  .skeletonSectionTitle {
    width: 200px;
    height: 22px;

    margin-bottom: 25px;
  }

  .skeletonDetails {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }

  .skeletonDetail {
    height: 50px;
  }

  @keyframes skeletonLoading {
    0% {
      background-position: 200% 0;
    }

    100% {
      background-position: -200% 0;
    }
  }

  /* =======================================================
     RESPONSIVE
  ======================================================= */

  @media (max-width: 800px) {
    .profileMain {
      align-items: flex-start;
    }

    .profileNameRow {
      flex-direction: column;
      gap: 12px;
    }

    .detailsGrid {
      grid-template-columns: 1fr;
      column-gap: 0;
    }
  }

  @media (max-width: 600px) {
    .headerInner,
    .employeeContent {
      width: calc(100% - 28px);
    }

    .breadcrumb span:nth-of-type(1),
    .breadcrumb svg:nth-of-type(1) {
      display: none;
    }

    .profileMain {
      flex-direction: column;

      align-items: center;

      padding: 28px 20px;

      text-align: center;
    }

    .profileIdentity {
      width: 100%;
    }

    .profileNameRow {
      align-items: center;
    }

    .profileMeta {
      justify-content: center;
    }

    .profileNameRow h1 {
      font-size: 24px;
    }

    .infoSection {
      padding: 20px;
    }

    .sectionTitle {
      align-items: flex-start;
    }

    .pageFooter {
      align-items: flex-start;

      flex-direction: column;

      gap: 12px;
    }
  }

  @media (max-width: 420px) {
    .headerInner {
      min-height: 65px;
    }

    .breadcrumb {
      font-size: 11px;
    }

    .profileMeta {
      flex-direction: column;
      align-items: stretch;
    }

    .metaItem {
      justify-content: center;
    }

    .detailItem {
      min-height: 70px;
    }
  }
`;