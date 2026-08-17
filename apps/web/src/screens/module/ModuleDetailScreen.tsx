import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import { FEATURES_CONFIG } from '../../config/moduleFeatures';

import {
  FiBox,
  FiTool,
  FiHome,
  FiKey,
  FiUsers,
  FiUser,
  FiSearch,
  FiPhone,
  FiArrowLeft,
  FiArrowRight,
  FiChevronRight,
  FiGrid,
  FiX,
  FiCommand,
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
// FEATURE ICONS
// =========================================================

const iconMap: Record<string, React.ReactNode> = {
  factory: <FiTool />,
  'office-building': <FiHome />,
  'account-key': <FiKey />,
  'badge-account': <FiUsers />,
  'account-multiple': <FiUsers />,
  'account-search': <FiSearch />,
  'account-circle': <FiUser />,
  phone: <FiPhone />,
};

const defaultIcon = <FiBox />;

// =========================================================
// COMPONENT
// =========================================================

export default function ModuleDetailScreen() {
  const router = useRouter();

  const { moduleName } = router.query;

  const [search, setSearch] = useState('');

  // -------------------------------------------------------
  // Invalid module
  // -------------------------------------------------------

  if (!moduleName || typeof moduleName !== 'string') {
    return (
      <>
        <div className="modulePage">
          <div className="stateCard">
            <div className="stateIcon">
              <FiBox />
            </div>

            <h2>Invalid Module</h2>

            <p>
              The module you are trying to access could not be
              found.
            </p>

            <button
              type="button"
              className="primaryButton"
              onClick={() => router.push('/web/dashboard')}
            >
              <FiArrowLeft />
              Back to Dashboard
            </button>
          </div>
        </div>

        <style jsx>{styles}</style>
      </>
    );
  }

  // -------------------------------------------------------
  // Module information
  // -------------------------------------------------------

  const features = FEATURES_CONFIG[moduleName] || [];

  const moduleConfig = MODULE_CONFIG[moduleName];

  const accentColor = moduleConfig?.color || '#2563EB';

  const moduleLabel =
    moduleConfig?.label ||
    moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

  // -------------------------------------------------------
  // Filter features
  // -------------------------------------------------------

  const filteredFeatures = useMemo(() => {
    if (!search.trim()) {
      return features;
    }

    const query = search.toLowerCase().trim();

    return features.filter((feature: any) =>
      feature.label.toLowerCase().includes(query)
    );
  }, [features, search]);

  // -------------------------------------------------------
  // Main
  // -------------------------------------------------------

  return (
    <>
      <div
        className="modulePage"
        style={
          {
            '--accent': accentColor,
            '--accent-soft': `${accentColor}12`,
            '--accent-soft-strong': `${accentColor}20`,
            '--accent-border': `${accentColor}32`,
          } as React.CSSProperties
        }
      >
        {/* =================================================
            TOP NAVIGATION
        ================================================= */}

        <header className="topHeader">
          <div className="topHeaderInner">

            {/* Brand */}

            <button
              type="button"
              className="brand"
              onClick={() =>
                router.push('/web/dashboard')
              }
            >
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
            </button>

            {/* Current location */}

            <div className="topLocation">
              <FiChevronRight />

              <span>Modules</span>

              <FiChevronRight />

              <strong>{moduleLabel}</strong>
            </div>

            {/* Back */}

            <button
              type="button"
              className="backTopButton"
              onClick={() =>
                router.push('/web/dashboard')
              }
            >
              <FiArrowLeft />
              <span>All Modules</span>
            </button>

          </div>
        </header>

        {/* =================================================
            MAIN
        ================================================= */}

        <main className="mainContent">

          {/* =================================================
              MODULE HERO
          ================================================= */}

          <section className="moduleHero">

            <div className="heroLeft">

              {/* Back mobile */}

              <button
                type="button"
                className="mobileBack"
                onClick={() =>
                  router.push('/web/dashboard')
                }
              >
                <FiArrowLeft />
                Back to Modules
              </button>

              <div className="heroIdentity">

                {/* Module icon */}

                <div className="heroIcon">
                  <span>
                    {moduleConfig?.icon || '📦'}
                  </span>
                </div>

                {/* Module title */}

                <div className="heroText">

                  <div className="heroEyebrow">
                    MODULE
                  </div>

                  <h1>{moduleLabel}</h1>

                  <p>
                    Manage and access everything related
                    to {moduleLabel.toLowerCase()}.
                  </p>

                </div>

              </div>

            </div>

            {/* Module statistics */}

            <div className="heroStats">

              <div className="heroStat">
                <div
                  className="statIcon"
                  style={{
                    color: accentColor,
                    background: `${accentColor}12`,
                  }}
                >
                  <FiGrid />
                </div>

                <div className="statText">
                  <strong>{features.length}</strong>

                  <span>
                    {features.length === 1
                      ? 'Feature'
                      : 'Features'}
                  </span>
                </div>
              </div>

              <div className="statDivider" />

              <div className="heroStat">
                <div
                  className="statusDot"
                  style={{
                    backgroundColor: accentColor,
                  }}
                />

                <div className="statText">
                  <strong>Active</strong>

                  <span>Module status</span>
                </div>
              </div>

            </div>

          </section>

          {/* =================================================
              FEATURE SECTION
          ================================================= */}

          {features.length > 0 && (
            <section className="featuresSection">

              {/* Section heading */}

              <div className="sectionHeader">

                <div className="sectionTitle">

                  <h2>Features</h2>

                  <p>
                    Select a feature to open its workspace
                  </p>

                </div>

                <div className="sectionActions">

                  {/* Search */}

                  {features.length >= 5 && (
                    <div className="searchBox">

                      <FiSearch />

                      <input
                        type="text"
                        placeholder="Search features..."
                        value={search}
                        onChange={(e) =>
                          setSearch(e.target.value)
                        }
                        aria-label="Search features"
                      />

                      {search && (
                        <button
                          type="button"
                          className="clearSearch"
                          onClick={() =>
                            setSearch('')
                          }
                          aria-label="Clear search"
                        >
                          <FiX />
                        </button>
                      )}

                      {!search && (
                        <span className="searchShortcut">
                          <FiCommand />
                          K
                        </span>
                      )}

                    </div>
                  )}

                  <div className="featureCount">
                    {filteredFeatures.length}
                    {' '}
                    {filteredFeatures.length === 1
                      ? 'available'
                      : 'available'}
                  </div>

                </div>

              </div>

              {/* =================================================
                  FEATURE GRID
              ================================================= */}

              {filteredFeatures.length > 0 ? (
                <div className="featureGrid">

                  {filteredFeatures.map(
                    (feature: any, index: number) => (
                      <button
                        type="button"
                        key={feature.key}
                        className="featureCard"
                        onClick={() =>
                          router.push(feature.path)
                        }
                      >

                        {/* Accent */}

                        <span className="cardAccent" />

                        {/* Number */}

                        <span className="cardNumber">
                          {String(index + 1).padStart(
                            2,
                            '0'
                          )}
                        </span>

                        {/* Icon */}

                        <div
                          className="featureIcon"
                          style={{
                            color: accentColor,
                            backgroundColor:
                              `${accentColor}12`,
                          }}
                        >
                          {iconMap[feature.icon] ||
                            defaultIcon}
                        </div>

                        {/* Text */}

                        <div className="featureContent">

                          <span className="featureTitle">
                            {feature.label}
                          </span>

                          <span className="featureDescription">
                            Open{' '}
                            {feature.label.toLowerCase()}
                          </span>

                        </div>

                        {/* Arrow */}

                        <div
                          className="featureArrow"
                          style={{
                            color: accentColor,
                            backgroundColor:
                              `${accentColor}10`,
                          }}
                        >
                          <FiArrowRight />
                        </div>

                      </button>
                    )
                  )}

                </div>
              ) : (
                <div className="noSearchResults">

                  <div
                    className="noResultsIcon"
                    style={{
                      color: accentColor,
                      background: `${accentColor}12`,
                    }}
                  >
                    <FiSearch />
                  </div>

                  <h3>No features found</h3>

                  <p>
                    No features match "{search}".
                  </p>

                  <button
                    type="button"
                    onClick={() => setSearch('')}
                  >
                    Clear search
                  </button>

                </div>
              )}

            </section>
          )}

          {/* =================================================
              NO FEATURES
          ================================================= */}

          {features.length === 0 && (
            <section className="emptyFeatures">

              <div
                className="emptyFeatureIcon"
                style={{
                  color: accentColor,
                  background: `${accentColor}12`,
                }}
              >
                <FiBox />
              </div>

              <h2>No Features Yet</h2>

              <p>
                There are currently no features available
                inside the {moduleLabel} module.
              </p>

              <button
                type="button"
                className="primaryButton"
                onClick={() =>
                  router.push('/web/dashboard')
                }
              >
                <FiArrowLeft />
                Back to Dashboard
              </button>

            </section>
          )}

        </main>

        {/* =================================================
            ACCENT FOOTER LINE
        ================================================= */}

        <div
          className="pageAccent"
          style={{
            backgroundColor: accentColor,
          }}
        />
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

  /* =======================================================
     PAGE
  ======================================================= */

  .modulePage {
    min-height: 100vh;

    background:
      radial-gradient(
        circle at 0% 0%,
        var(--accent-soft),
        transparent 28%
      ),
      radial-gradient(
        circle at 100% 15%,
        rgba(0, 180, 219, 0.025),
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

    padding-bottom: 40px;
  }

  /* =======================================================
     TOP HEADER
  ======================================================= */

  .topHeader {
    position: sticky;

    top: 0;

    z-index: 50;

    background: rgba(255,255,255,0.94);

    border-bottom: 1px solid #e7ebf1;

    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);

    box-shadow:
      0 2px 10px rgba(15,23,42,0.035);
  }

  .topHeaderInner {
    width: min(1400px, calc(100% - 48px));

    min-height: 70px;

    margin: 0 auto;

    display: flex;

    align-items: center;

    gap: 20px;
  }

  /* =======================================================
     BRAND
  ======================================================= */

  .brand {
    all: unset;

    flex-shrink: 0;

    display: flex;

    align-items: center;

    gap: 10px;

    cursor: pointer;
  }

  .brandMark {
    width: 38px;
    height: 38px;

    display: flex;

    align-items: center;
    justify-content: center;

    border-radius: 10px;

    background:
      linear-gradient(
        135deg,
        #00b4db,
        #7b2fbe
      );

    color: #ffffff;

    font-size: 19px;

    font-weight: 800;

    box-shadow:
      0 5px 13px rgba(123,47,190,0.2);
  }

  .brandText {
    display: flex;
    flex-direction: column;
  }

  .brandName {
    color: #172033;

    font-size: 16px;

    line-height: 1.1;

    font-weight: 750;
  }

  .brandSubtitle {
    margin-top: 3px;

    color: #94a3b8;

    font-size: 9px;

    line-height: 1;

    font-weight: 600;
  }

  /* =======================================================
     LOCATION
  ======================================================= */

  .topLocation {
    flex: 1;

    display: flex;

    align-items: center;

    gap: 5px;

    min-width: 0;

    color: #94a3b8;

    font-size: 11px;

    font-weight: 600;
  }

  .topLocation svg {
    width: 13px;
    height: 13px;
  }

  .topLocation strong {
    overflow: hidden;

    color: #475569;

    font-weight: 650;

    text-overflow: ellipsis;

    white-space: nowrap;
  }

  .backTopButton {
    all: unset;

    flex-shrink: 0;

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
      background 0.18s ease,
      color 0.18s ease,
      border-color 0.18s ease;
  }

  .backTopButton:hover {
    color: var(--accent);

    border-color: var(--accent-border);

    background: var(--accent-soft);
  }

  .backTopButton svg {
    width: 15px;
    height: 15px;
  }

  /* =======================================================
     MAIN
  ======================================================= */

  .mainContent {
    width: min(1400px, calc(100% - 48px));

    margin: 0 auto;
  }

  /* =======================================================
     HERO
  ======================================================= */

  .moduleHero {
    min-height: 215px;

    display: flex;

    align-items: center;

    justify-content: space-between;

    gap: 40px;

    padding: 43px 0 38px;
  }

  .heroLeft {
    min-width: 0;
  }

  .heroIdentity {
    display: flex;

    align-items: center;

    gap: 20px;
  }

  /* =======================================================
     HERO ICON
  ======================================================= */

  .heroIcon {
    width: 78px;
    height: 78px;

    flex-shrink: 0;

    display: flex;

    align-items: center;
    justify-content: center;

    border-radius: 20px;

    background: var(--accent-soft);

    border: 1px solid var(--accent-border);

    box-shadow:
      0 8px 22px rgba(15,23,42,0.045),
      inset 0 0 0 1px rgba(255,255,255,0.7);

    transition:
      transform 0.2s ease;
  }

  .heroIcon span {
    font-size: 37px;

    line-height: 1;
  }

  .heroIcon:hover {
    transform: translateY(-2px);
  }

  /* =======================================================
     HERO TEXT
  ======================================================= */

  .heroText {
    min-width: 0;
  }

  .heroEyebrow {
    margin-bottom: 7px;

    color: var(--accent);

    font-size: 10px;

    line-height: 1;

    font-weight: 750;

    letter-spacing: 1.1px;
  }

  .heroText h1 {
    margin: 0;

    color: #172033;

    font-size: 34px;

    line-height: 1.15;

    font-weight: 750;

    letter-spacing: -0.8px;
  }

  .heroText p {
    max-width: 560px;

    margin: 8px 0 0;

    color: #64748b;

    font-size: 13px;

    line-height: 1.55;

    font-weight: 500;
  }

  /* =======================================================
     HERO STATS
  ======================================================= */

  .heroStats {
    flex-shrink: 0;

    display: flex;

    align-items: center;

    padding: 12px 16px;

    border: 1px solid #e5eaf1;

    border-radius: 14px;

    background: rgba(255,255,255,0.8);

    box-shadow:
      0 3px 12px rgba(15,23,42,0.025);
  }

  .heroStat {
    display: flex;

    align-items: center;

    gap: 10px;
  }

  .statIcon {
    width: 40px;
    height: 40px;

    display: flex;

    align-items: center;
    justify-content: center;

    border-radius: 10px;
  }

  .statIcon svg {
    width: 18px;
    height: 18px;
  }

  .statText {
    display: flex;

    flex-direction: column;
  }

  .statText strong {
    color: #1e293b;

    font-size: 16px;

    line-height: 1.1;

    font-weight: 750;
  }

  .statText span {
    margin-top: 4px;

    color: #94a3b8;

    font-size: 9px;

    line-height: 1;

    font-weight: 600;
  }

  .statDivider {
    width: 1px;
    height: 34px;

    margin: 0 16px;

    background: #e5eaf1;
  }

  .statusDot {
    width: 9px;
    height: 9px;

    border-radius: 50%;

    box-shadow:
      0 0 0 4px var(--accent-soft);
  }

  /* =======================================================
     MOBILE BACK
  ======================================================= */

  .mobileBack {
    display: none;
  }

  /* =======================================================
     FEATURES SECTION
  ======================================================= */

  .featuresSection {
    padding-bottom: 45px;
  }

  .sectionHeader {
    display: flex;

    align-items: flex-end;

    justify-content: space-between;

    gap: 20px;

    margin-bottom: 20px;
  }

  .sectionTitle h2 {
    margin: 0;

    color: #1e293b;

    font-size: 19px;

    line-height: 1.3;

    font-weight: 700;

    letter-spacing: -0.2px;
  }

  .sectionTitle p {
    margin: 5px 0 0;

    color: #94a3b8;

    font-size: 12px;

    font-weight: 500;
  }

  .sectionActions {
    display: flex;

    align-items: center;

    gap: 9px;
  }

  /* =======================================================
     SEARCH
  ======================================================= */

  .searchBox {
    width: 230px;
    height: 36px;

    display: flex;

    align-items: center;

    gap: 8px;

    padding: 0 9px 0 11px;

    border: 1px solid #e2e8f0;

    border-radius: 9px;

    background: #ffffff;

    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease;
  }

  .searchBox:focus-within {
    border-color: var(--accent-border);

    box-shadow:
      0 0 0 3px var(--accent-soft);
  }

  .searchBox > svg {
    flex-shrink: 0;

    width: 15px;
    height: 15px;

    color: #94a3b8;
  }

  .searchBox input {
    min-width: 0;

    flex: 1;

    border: none;
    outline: none;

    background: transparent;

    color: #334155;

    font-family: inherit;

    font-size: 11px;
  }

  .searchBox input::placeholder {
    color: #a3adba;
  }

  .clearSearch {
    all: unset;

    width: 22px;
    height: 22px;

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

  .searchShortcut {
    display: flex;

    align-items: center;

    gap: 2px;

    padding: 3px 5px;

    border: 1px solid #e5e7eb;

    border-radius: 5px;

    background: #f8fafc;

    color: #a1aab7;

    font-size: 9px;

    font-weight: 650;
  }

  .searchShortcut svg {
    width: 9px;
    height: 9px;
  }

  .featureCount {
    padding: 7px 10px;

    border: 1px solid #e2e8f0;

    border-radius: 8px;

    background: #ffffff;

    color: #64748b;

    font-size: 10px;

    font-weight: 650;

    white-space: nowrap;
  }

  /* =======================================================
     FEATURE GRID
  ======================================================= */

  .featureGrid {
    display: grid;

    grid-template-columns:
      repeat(
        4,
        minmax(0, 1fr)
      );

    gap: 17px;
  }

  /* =======================================================
     FEATURE CARD
  ======================================================= */

  .featureCard {
    all: unset;

    position: relative;

    min-width: 0;

    min-height: 165px;

    padding: 21px;

    display: flex;

    flex-direction: column;

    border: 1px solid #e5eaf1;

    border-radius: 15px;

    background: #ffffff;

    cursor: pointer;

    overflow: hidden;

    box-shadow:
      0 2px 5px rgba(15,23,42,0.025);

    transition:
      transform 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .featureCard:hover {
    transform: translateY(-4px);

    border-color: var(--accent-border);

    box-shadow:
      0 12px 28px rgba(15,23,42,0.085);
  }

  .featureCard:focus-visible {
    outline: 3px solid var(--accent-soft);

    outline-offset: 2px;
  }

  .cardAccent {
    position: absolute;

    top: 0;
    left: 0;

    width: 100%;
    height: 3px;

    background: var(--accent);

    opacity: 0;

    transition:
      opacity 0.2s ease;
  }

  .featureCard:hover .cardAccent {
    opacity: 1;
  }

  /* =======================================================
     CARD NUMBER
  ======================================================= */

  .cardNumber {
    position: absolute;

    top: 18px;
    right: 18px;

    color: #cbd5e1;

    font-size: 10px;

    font-weight: 750;

    letter-spacing: 0.6px;
  }

  /* =======================================================
     FEATURE ICON
  ======================================================= */

  .featureIcon {
    width: 50px;
    height: 50px;

    display: flex;

    align-items: center;
    justify-content: center;

    border-radius: 13px;

    transition:
      transform 0.2s ease;
  }

  .featureIcon svg {
    width: 22px;
    height: 22px;

    stroke-width: 1.8;
  }

  .featureCard:hover .featureIcon {
    transform: scale(1.06);
  }

  /* =======================================================
     FEATURE CONTENT
  ======================================================= */

  .featureContent {
    min-width: 0;

    display: flex;

    flex-direction: column;

    margin-top: 17px;

    padding-right: 38px;
  }

  .featureTitle {
    overflow: hidden;

    color: #1e293b;

    font-size: 15px;

    line-height: 1.3;

    font-weight: 700;

    text-align: left;

    text-overflow: ellipsis;

    white-space: nowrap;
  }

  .featureDescription {
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
     ARROW
  ======================================================= */

  .featureArrow {
    position: absolute;

    right: 17px;
    bottom: 17px;

    width: 30px;
    height: 30px;

    display: flex;

    align-items: center;
    justify-content: center;

    border-radius: 8px;

    transition:
      transform 0.2s ease;
  }

  .featureArrow svg {
    width: 15px;
    height: 15px;
  }

  .featureCard:hover .featureArrow {
    transform: translateX(3px);
  }

  /* =======================================================
     NO SEARCH RESULTS
  ======================================================= */

  .noSearchResults {
    padding: 60px 20px;

    display: flex;

    flex-direction: column;

    align-items: center;

    justify-content: center;

    border: 1px dashed #dce2ea;

    border-radius: 15px;

    background: rgba(255,255,255,0.65);

    text-align: center;
  }

  .noResultsIcon {
    width: 55px;
    height: 55px;

    display: flex;

    align-items: center;
    justify-content: center;

    border-radius: 15px;
  }

  .noResultsIcon svg {
    width: 22px;
    height: 22px;
  }

  .noSearchResults h3 {
    margin: 16px 0 0;

    color: #334155;

    font-size: 16px;

    font-weight: 700;
  }

  .noSearchResults p {
    margin: 5px 0 0;

    color: #94a3b8;

    font-size: 12px;
  }

  .noSearchResults button {
    all: unset;

    margin-top: 15px;

    color: var(--accent);

    cursor: pointer;

    font-size: 11px;

    font-weight: 700;
  }

  /* =======================================================
     EMPTY FEATURES
  ======================================================= */

  .emptyFeatures {
    min-height: 330px;

    display: flex;

    flex-direction: column;

    align-items: center;

    justify-content: center;

    border: 1px dashed #dce2ea;

    border-radius: 17px;

    background: rgba(255,255,255,0.7);

    text-align: center;
  }

  .emptyFeatureIcon {
    width: 68px;
    height: 68px;

    display: flex;

    align-items: center;
    justify-content: center;

    border-radius: 18px;
  }

  .emptyFeatureIcon svg {
    width: 29px;
    height: 29px;
  }

  .emptyFeatures h2 {
    margin: 18px 0 0;

    color: #1e293b;

    font-size: 20px;

    font-weight: 700;
  }

  .emptyFeatures p {
    max-width: 420px;

    margin: 7px 0 0;

    color: #64748b;

    font-size: 12px;

    line-height: 1.6;
  }

  /* =======================================================
     BUTTON
  ======================================================= */

  .primaryButton {
    all: unset;

    margin-top: 23px;

    padding: 10px 15px;

    display: flex;

    align-items: center;

    gap: 7px;

    border-radius: 9px;

    background: var(--accent);

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
      0 7px 16px var(--accent-soft);
  }

  .primaryButton svg {
    width: 15px;
    height: 15px;
  }

  /* =======================================================
     INVALID STATE
  ======================================================= */

  .stateCard {
    width: min(430px, calc(100% - 40px));

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

    background: #f1eafe;

    color: #7b2fbe;
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
    margin: 8px 0 0;

    color: #64748b;

    font-size: 13px;

    line-height: 1.6;
  }

  /* =======================================================
     ACCENT FOOTER
  ======================================================= */

  .pageAccent {
    position: fixed;

    bottom: 0;
    left: 0;

    width: 100%;
    height: 3px;

    opacity: 0.85;
  }

  /* =======================================================
     RESPONSIVE
  ======================================================= */

  @media (max-width: 1150px) {

    .featureGrid {
      grid-template-columns:
        repeat(
          3,
          minmax(0, 1fr)
        );
    }

  }

  @media (max-width: 900px) {

    .heroStats {
      display: none;
    }

    .featureGrid {
      grid-template-columns:
        repeat(
          2,
          minmax(0, 1fr)
        );
    }

  }

  @media (max-width: 650px) {

    .topHeaderInner,
    .mainContent {
      width: calc(100% - 28px);
    }

    .topHeaderInner {
      min-height: 64px;
    }

    .brandSubtitle {
      display: none;
    }

    .topLocation {
      display: none;
    }

    .backTopButton span {
      display: none;
    }

    .backTopButton {
      width: 36px;
      height: 36px;

      padding: 0;

      justify-content: center;
    }

    .backTopButton svg {
      width: 16px;
      height: 16px;
    }

    /* HERO */

    .moduleHero {
      min-height: auto;

      padding: 27px 0 25px;

      display: block;
    }

    .mobileBack {
      all: unset;

      display: flex;

      align-items: center;

      gap: 6px;

      margin-bottom: 22px;

      color: #64748b;

      cursor: pointer;

      font-size: 11px;

      font-weight: 650;
    }

    .mobileBack:hover {
      color: var(--accent);
    }

    .mobileBack svg {
      width: 15px;
      height: 15px;
    }

    .heroIdentity {
      gap: 14px;
    }

    .heroIcon {
      width: 62px;
      height: 62px;

      border-radius: 16px;
    }

    .heroIcon span {
      font-size: 30px;
    }

    .heroEyebrow {
      font-size: 9px;

      margin-bottom: 5px;
    }

    .heroText h1 {
      font-size: 27px;
    }

    .heroText p {
      margin-top: 6px;

      font-size: 11px;
    }

    /* SECTION */

    .sectionHeader {
      align-items: flex-start;

      flex-direction: column;

      gap: 13px;

      margin-bottom: 15px;
    }

    .sectionActions {
      width: 100%;
    }

    .searchBox {
      flex: 1;

      width: auto;
    }

    .featureCount {
      display: none;
    }

    /* GRID */

    .featureGrid {
      grid-template-columns: 1fr;

      gap: 12px;
    }

    .featureCard {
      min-height: 130px;

      padding: 18px;
    }

    .featureIcon {
      width: 45px;
      height: 45px;

      border-radius: 12px;
    }

    .featureContent {
      margin-top: 14px;
    }

  }

  @media (max-width: 420px) {

    .brandText {
      display: none;
    }

    .heroText h1 {
      font-size: 24px;
    }

    .heroText p {
      max-width: 240px;
    }

  }

`;