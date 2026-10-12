// apps/prayantra-b2b/src/navigation/index.tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useUserAuthStore } from '../store/userAuthStore';
import { useSubscriptionBlockerStore } from '../store/subscriptionBlockerStore';
import { navigationRef, onNavigationReady } from './navigationService';

// ============================================================
// MODULE OWNERSHIP (SAP-like split)
// ------------------------------------------------------------
// Administration = security & facilities
//   RolesList, LocationList
//
// HR = people + org structure + leave + contact + REMINDERS
//   HREmployeeList, HREmployeeForm, HREmployeeDetail, HREmployeeStats,
//   HRDocumentList, RemindersList,
//   JobsList, PositionsList, DepartmentsList, WorkCentersList, OrgUnitList,
//   LeaveRequestAdminList, LeaveBalanceAdminScreen, LeaveLedger,
//   PolicyConfigList, ...
//
// LEAVE — SELF vs HR SPLIT
// ------------------------------------------------------------
// Self-service (from MyProfileScreen → MY LEAVE section):
//   LeaveRequestList    — shows ONLY the logged-in user's requests
//   LeaveBalanceScreen  — shows ONLY the logged-in user's balances
//   LeaveRequestForm    — creates requests for the logged-in user
//
// HR/admin (from HR module grid):
//   LeaveRequestAdminList    — user-picker + status filter, approve/reject
//   LeaveBalanceAdminScreen  — user-picker, read-only balance view
//   LeaveLedgerScreen        — user-picker + filters, company-wide ledger
//
// LeaveDetail handles both modes via an optional `mode: 'self' | 'hr'`
// param that gates which action buttons render.
//
// Payroll = payroll domain (unchanged)
//
// TOP-LEVEL (not in any module grid — reached from the main screen):
//   MyProfile       — tapped from the profile chip in ModuleGridScreen header
//   AvatarManagement — tapped from the profile chip AND from MyProfileScreen
//
// ============================================================
// HR REMINDERS (NEW)
// ------------------------------------------------------------
// The HR inbox. Reached ONLY from the bell in the HR module header
// (see ModuleDetailScreen). Self-gated on `hr.employee.view`, so
// non-HR users never see it. Location-scoped server-side via the
// X-Location-ID header — the axios interceptor attaches it
// automatically, so the client never passes a location filter.
// ============================================================

// Auth Screens
import PhoneInputScreen from '../screens/auth/PhoneInput';
import OTPVerificationScreen from '../screens/auth/OTPVerification';
import MPINSetupScreen from '../screens/auth/MPINSetup';
import MPINVerificationScreen from '../screens/auth/MPINVerification';
import MPINForgotScreen from '../screens/auth/MPINForgotScreen';
import CompanySelectionScreen from '../screens/auth/CompanySelectionScreen';
import WebLoginQRScanner from '../screens/auth/WebLoginQRScanner';

import LocationSelectionScreen from '../screens/auth/LocationSelectionScreen';

import SubscriptionPaymentScreen from '../screens/subscription/SubscriptionPaymentScreen';

import MyProfileScreen from '../screens/profile/MyProfileScreen';

// Main Screens
import ModuleGridScreen from '../screens/main/ModuleGridScreen';
import ModuleDetailScreen from '../screens/module/ModuleDetailScreen';

// ============================================================
// ATTENDANCE MODULE (subject-scoped shared core)
// ============================================================
import AttendanceHomeScreen from '../screens/attendance/shared/AttendanceHomeScreen';
import AttendanceSearchScreen from '../screens/attendance/shared/AttendanceSearchScreen';
import AttendanceCorrectionsScreen from '../screens/attendance/shared/AttendanceCorrectionsScreen';
import AttendanceReportsScreen from '../screens/attendance/shared/AttendanceReportsScreen';
import AttendanceDayScreen from '../screens/attendance/shared/AttendanceDayScreen';
import TeamAttendanceDashboardScreen from '../screens/attendance/shared/TeamAttendanceDashboardScreen';
import TeamMemberAttendanceScreen from '../screens/attendance/shared/TeamMemberAttendanceScreen';

// ============================================================
// ATTENDANCE MODULE (self-service — reached from MyProfileScreen)
// ============================================================
import MyStatsScreen from '../screens/attendance/self/MyStatsScreen';
import MyExemptionsScreen from '../screens/attendance/self/MyExemptionsScreen';

// ============================================================
// ATTENDANCE MODULE (admin / configuration)
// ============================================================
import AttendanceAdminHubScreen from '../screens/attendance/admin/AttendanceAdminHubScreen';
import AttendancePoliciesListScreen from '../screens/attendance/admin/AttendancePoliciesListScreen';
import AttendancePolicyFormScreen from '../screens/attendance/admin/AttendancePolicyFormScreen';
import AttendancePolicyAssignScreen from '../screens/attendance/admin/AttendancePolicyAssignScreen';
import AttendanceExemptionsListScreen from '../screens/attendance/admin/AttendanceExemptionsListScreen';
import AttendanceExemptionFormScreen from '../screens/attendance/admin/AttendanceExemptionFormScreen';
import AttendanceDevicesListScreen from '../screens/attendance/admin/AttendanceDevicesListScreen';
import AttendanceDeviceDetailScreen from '../screens/attendance/admin/AttendanceDeviceDetailScreen';
import AttendanceDeviceFormScreen from '../screens/attendance/admin/AttendanceDeviceFormScreen';
import AttendanceDeviceEnrollmentsScreen from '../screens/attendance/admin/AttendanceDeviceEnrollmentsScreen';
import AttendanceDeviceTokensScreen from '../screens/attendance/admin/AttendanceDeviceTokensScreen';
import AttendanceSourcesListScreen from '../screens/attendance/admin/AttendanceSourcesListScreen';

// ============================================================
// ATTENDANCE MODULE (admin / scheduling — work calendars + shifts)
//
// NOTE: the old "ScheduleInstances" and "ScheduleStats" screens have
// been retired. Schedules are now derived on read via the
// AttendanceSchedulePreview screen; there are no stored instances to
// list, count, or generate.
// ============================================================
import SchedulingHubScreen from '../screens/attendance/admin/scheduling/SchedulingHubScreen';
import CalendarsListScreen from '../screens/attendance/admin/scheduling/CalendarsListScreen';
import CalendarFormScreen from '../screens/attendance/admin/scheduling/CalendarFormScreen';
import ScheduleTemplatesScreen from '../screens/attendance/admin/scheduling/ScheduleTemplatesScreen';
import BulkGenerateScreen from '../screens/attendance/admin/scheduling/BulkGenerateScreen';
import SchedulePreviewScreen from '../screens/attendance/admin/scheduling/SchedulePreviewScreen';
import ScheduleOverridesScreen from '../screens/attendance/admin/scheduling/ScheduleOverridesScreen';
import WorkCenterShiftMappingScreen from '../screens/attendance/admin/scheduling/WorkCenterShiftMappingScreen';

// ============================================================
// ATTENDANCE MODULE (admin / analytics + operations)
// ============================================================
import AttendanceResolutionScreen from '../screens/attendance/admin/AttendanceResolutionScreen';
import AttendanceCalendarAvailabilityScreen from '../screens/attendance/admin/AttendanceCalendarAvailabilityScreen';
import AttendanceCompanyStatsScreen from '../screens/attendance/admin/AttendanceCompanyStatsScreen';
import AttendanceSubjectStatsScreen from '../screens/attendance/admin/AttendanceSubjectStatsScreen';

// ============================================================
// ATTENDANCE MODULE (admin / biometrics — face embeddings + sync)
// ============================================================
import AttendanceFaceEmbeddingsScreen from '../screens/attendance/admin/AttendanceFaceEmbeddingsScreen';
import AttendanceBiometricSyncStatusScreen from '../screens/attendance/admin/AttendanceBiometricSyncStatusScreen';

// ============================================================
// ATTENDANCE MODULE (admin / sessions — class & session summaries)
// ============================================================
import SessionSummariesListScreen from '../screens/attendance/admin/sessions/SessionSummariesListScreen';
import SessionSummaryDetailScreen from '../screens/attendance/admin/sessions/SessionSummaryDetailScreen';

// Administration Module Screens
import WorkCentersListScreen from '../screens/module/administration/WorkCentersListScreen';
import CreateWorkCenterScreen from '../screens/module/administration/CreateWorkCenterScreen';
import EditWorkCenterScreen from '../screens/module/administration/EditWorkCenterScreen';
import DepartmentsListScreen from '../screens/module/administration/DepartmentsListScreen';
import CreateDepartmentScreen from '../screens/module/administration/CreateDepartmentScreen';
import EditDepartmentScreen from '../screens/module/administration/EditDepartmentScreen';
import RolesListScreen from '../screens/module/administration/RolesListScreen';
import CreateRoleScreen from '../screens/module/administration/CreateRoleScreen';
import EditRoleScreen from '../screens/module/administration/EditRoleScreen';

// ============================================================
// JOB CATALOG
// ============================================================
import JobsListScreen from '../screens/module/administration/JobsListScreen';
import CreateJobScreen from '../screens/module/administration/CreateJobScreen';
import EditJobScreen from '../screens/module/administration/EditJobScreen';

import PositionsListScreen from '../screens/module/administration/PositionsListScreen';
import CreatePositionScreen from '../screens/module/administration/CreatePositionScreen';
import EditPositionScreen from '../screens/module/administration/EditPositionScreen';
import AvatarManagementScreen from '../screens/module/administration/AvatarManagementScreen';

// Location Management Screens
import LocationListScreen from '../screens/module/administration/LocationListScreen';
import LocationFormScreen from '../screens/module/administration/LocationFormScreen';
import EmployeeLocationAccessScreen from '../screens/module/administration/EmployeeLocationAccessScreen';

// Chat Screen
import ChatScreen from '../screens/module/chat/ChatScreen';

// ============================================================
// HR MODULE SCREENS
// ============================================================
import HREmployeeList from '../screens/hr/HREmployeeList';
import HREmployeeDetail from '../screens/hr/HREmployeeDetail';
import HREmployeeForm from '../screens/hr/HREmployeeForm';
import HREmployeeStats from '../screens/hr/HREmployeeStats';
import HRDocumentList from '../screens/hr/HRDocumentList';

// HR reminders inbox
import RemindersListScreen from '../screens/hr/RemindersListScreen';

import OrgUnitList from '../screens/hr/org-unit/OrgUnitList';
import OrgUnitForm from '../screens/hr/org-unit/OrgUnitForm';
import OrgUnitDetail from '../screens/hr/org-unit/OrgUnitDetail';

// ============================================================
// LEAVE — SELF-SERVICE (reached from MyProfileScreen)
// ============================================================
import LeaveRequestList from '../screens/hr/leave/user/LeaveRequestList';
import LeaveRequestForm from '../screens/hr/leave/user/LeaveRequestForm';
import LeaveBalanceScreen from '../screens/hr/leave/user/LeaveBalanceScreen';
import LeaveDetail from '../screens/hr/leave/user/LeaveDetail';

// ============================================================
// LEAVE — ADMIN (reached from HR module grid)
// ============================================================
import LeaveRequestAdminList from '../screens/hr/leave/admin/LeaveRequestAdminList';
import LeaveBalanceAdminScreen from '../screens/hr/leave/admin/LeaveBalanceAdminScreen';
// ⚠️ NEW — company-wide ledger browse (filter by user, type, date range)
import LeaveLedgerScreen from '../screens/hr/leave/admin/LeaveLedgerScreen';

import PolicyConfigList from '../screens/hr/leave/admin/PolicyConfigList';
import PolicyConfigForm from '../screens/hr/leave/admin/PolicyConfigForm';
import PolicyConfigDetail from '../screens/hr/leave/admin/PolicyConfigDetail';
import LeaveTypeList from '../screens/hr/leave/admin/LeaveTypeList';
import LeaveTypeForm from '../screens/hr/leave/admin/LeaveTypeForm';
import EntitlementList from '../screens/hr/leave/admin/EntitlementList';
import CreateEntitlementScreen from '../screens/hr/leave/admin/CreateEntitlementScreen';
// ⬇️ accrual schedule now lives here, not on the leave type
import AddPolicyRuleScreen from '../screens/hr/leave/admin/AddPolicyRuleScreen';
// ⬇️ policy resolution cockpit + effective-policy viewer
import PolicyResolutionScreen from '../screens/hr/leave/admin/PolicyResolutionScreen';
import UserEffectivePoliciesScreen from '../screens/hr/leave/admin/UserEffectivePoliciesScreen';

// ============================================================
// PAYROLL SCREENS
// ============================================================
// Bank Details
import BankDetailsList from '../screens/hr/payroll/BankDetailsList';
import BankDetailsForm from '../screens/hr/payroll/BankDetailsForm';

// Adjustments
import AdjustmentList from '../screens/hr/payroll/Adjustments/AdjustmentList';
import CreateAdjustmentForm from '../screens/hr/payroll/Adjustments/CreateAdjustmentForm';
import EditAdjustmentForm from '../screens/hr/payroll/Adjustments/EditAdjustmentForm';
import BulkCreateAdjustmentForm from '../screens/hr/payroll/Adjustments/BulkCreateAdjustmentForm';

// Attendance Rules
import AttendanceRuleList from '../screens/hr/payroll/AttendanceRules/AttendanceRuleList';
import CreateAttendanceRuleForm from '../screens/hr/payroll/AttendanceRules/CreateAttendanceRuleForm';
import EditAttendanceRuleForm from '../screens/hr/payroll/AttendanceRules/EditAttendanceRuleForm';
import BulkDeactivateRulesForm from '../screens/hr/payroll/AttendanceRules/BulkDeactivateRulesForm';

// Components (Payroll Components)
import ComponentList from '../screens/hr/payroll/Components/ComponentList';
import ComponentDetail from '../screens/hr/payroll/Components/ComponentDetail';
import CreateComponentForm from '../screens/hr/payroll/Components/CreateComponentForm';
import EditComponentForm from '../screens/hr/payroll/Components/EditComponentForm';

// Dashboard
import PayrollDashboard from '../screens/hr/payroll/Dashboard/PayrollDashboard';

// Employee Payroll
import EmployeeSalaryView from '../screens/hr/payroll/EmployeePayroll/EmployeeSalaryView';
import SalarySnapshotView from '../screens/hr/payroll/EmployeePayroll/SalarySnapshotView';
import PreviewEarningsForm from '../screens/hr/payroll/EmployeePayroll/PreviewEarningsForm';
import EmployeeAdjustmentsList from '../screens/hr/payroll/EmployeePayroll/EmployeeAdjustmentsList';
import EmployeeStatutoryProfilesList from '../screens/hr/payroll/EmployeePayroll/EmployeeStatutoryProfilesList';
import ChangeTaxRegimeForm from '../screens/hr/payroll/EmployeePayroll/ChangeTaxRegimeForm';
import EmployeePayrollHistory from '../screens/hr/payroll/EmployeePayroll/EmployeePayrollHistory';
import EmployeeYTD from '../screens/hr/payroll/EmployeePayroll/EmployeeYTD';
import EmployeeStatutorySummary from '../screens/hr/payroll/EmployeePayroll/EmployeeStatutorySummary';

// Fines
import FineList from '../screens/hr/payroll/Fines/FineList';
import CreateFineForm from '../screens/hr/payroll/Fines/CreateFineForm';
import EditFineForm from '../screens/hr/payroll/Fines/EditFineForm';
import BulkCreateFineForm from '../screens/hr/payroll/Fines/BulkCreateFineForm';
import CompanyFineSummary from '../screens/hr/payroll/Fines/CompanyFineSummary';
import EmployeeFineSummary from '../screens/hr/payroll/Fines/EmployeeFineSummary';
import LockFinesForPayrollForm from '../screens/hr/payroll/Fines/LockFinesForPayrollForm';

// Loans
import LoanList from '../screens/hr/payroll/Loans/LoanList';
import LoanDetail from '../screens/hr/payroll/Loans/LoanDetail';
import CreateLoanForm from '../screens/hr/payroll/Loans/CreateLoanForm';
import CloseLoanForm from '../screens/hr/payroll/Loans/CloseLoanForm';
import ManualPaymentForm from '../screens/hr/payroll/Loans/ManualPaymentForm';
import PreviewEMIForm from '../screens/hr/payroll/Loans/PreviewEMIForm';
import LoanPaymentsList from '../screens/hr/payroll/Loans/LoanPaymentsList';
import MarkEMIAsPaidForm from '../screens/hr/payroll/Loans/MarkEMIAsPaidForm';
import PendingEMIsForRun from '../screens/hr/payroll/Loans/PendingEMIsForRun';

// Locks
import LockList from '../screens/hr/payroll/Locks/LockList';
import CreateLockForm from '../screens/hr/payroll/Locks/CreateLockForm';

// Payslips
import UserPayslipList from '../screens/hr/payroll/Payslips/UserPayslipList';
import PayslipDownload from '../screens/hr/payroll/Payslips/PayslipDownload';
import SendPayslipEmailForm from '../screens/hr/payroll/Payslips/SendPayslipEmailForm';
import GeneratePayslipsForRunButton from '../screens/hr/payroll/Payslips/GeneratePayslipsForRunButton';

// Reports
import PayrollRegisterForm from '../screens/hr/payroll/Reports/PayrollRegisterForm';
import StatutoryChallanForm from '../screens/hr/payroll/Reports/StatutoryChallanForm';

// Runs
import PayrollRunList from '../screens/hr/payroll/Runs/PayrollRunList';
import PayrollRunDetail from '../screens/hr/payroll/Runs/PayrollRunDetail';
import CreateRunForm from '../screens/hr/payroll/Runs/CreateRunForm';
import RunLedgerSummary from '../screens/hr/payroll/Runs/RunLedgerSummary';
import RunStatutorySummary from '../screens/hr/payroll/Runs/RunStatutorySummary';
import RunEmployeesList from '../screens/hr/payroll/Runs/RunEmployeesList';
import ReprocessEmployeeForm from '../screens/hr/payroll/Runs/ReprocessEmployeeForm';
import ExportRunCSV from '../screens/hr/payroll/Runs/ExportRunCSV';
import GenerateBankFileForm from '../screens/hr/payroll/Runs/GenerateBankFileForm';

// Statutory - Component Definitions
import ComponentDefinitionList from '../screens/hr/payroll/Statutory/ComponentDefinitions/ComponentDefinitionList';
import CreateComponentDefinitionForm from '../screens/hr/payroll/Statutory/ComponentDefinitions/CreateComponentDefinitionForm';
import EditComponentDefinitionForm from '../screens/hr/payroll/Statutory/ComponentDefinitions/EditComponentDefinitionForm';

// Statutory - Rule Sets
import RuleSetList from '../screens/hr/payroll/Statutory/RuleSets/RuleSetList';
import RuleSetDetail from '../screens/hr/payroll/Statutory/RuleSets/RuleSetDetail';
import CreateRuleSetForm from '../screens/hr/payroll/Statutory/RuleSets/CreateRuleSetForm';
import EditRuleSetForm from '../screens/hr/payroll/Statutory/RuleSets/EditRuleSetForm';
import ContributionRuleList from '../screens/hr/payroll/Statutory/RuleSets/ContributionRuleList';
import CreateContributionRuleForm from '../screens/hr/payroll/Statutory/RuleSets/CreateContributionRuleForm';
import EditContributionRuleForm from '../screens/hr/payroll/Statutory/RuleSets/EditContributionRuleForm';
import TaxSlabList from '../screens/hr/payroll/Statutory/RuleSets/TaxSlabList';
import CreateTaxSlabForm from '../screens/hr/payroll/Statutory/RuleSets/CreateTaxSlabForm';
import EditTaxSlabForm from '../screens/hr/payroll/Statutory/RuleSets/EditTaxSlabForm';
import DeductionLimitList from '../screens/hr/payroll/Statutory/RuleSets/DeductionLimitList';
import CreateDeductionLimitForm from '../screens/hr/payroll/Statutory/RuleSets/CreateDeductionLimitForm';
import EditDeductionLimitForm from '../screens/hr/payroll/Statutory/RuleSets/EditDeductionLimitForm';
import ComponentMappingList from '../screens/hr/payroll/Statutory/RuleSets/ComponentMappingList';
import CreateComponentMappingForm from '../screens/hr/payroll/Statutory/RuleSets/CreateComponentMappingForm';
import EditComponentMappingForm from '../screens/hr/payroll/Statutory/RuleSets/EditComponentMappingForm';
import BulkCreateComponentMappingForm from '../screens/hr/payroll/Statutory/RuleSets/BulkCreateComponentMappingForm';

// Statutory - Profiles
import ProfileList from '../screens/hr/payroll/Statutory/Profiles/ProfileList';
import CreateProfileForm from '../screens/hr/payroll/Statutory/Profiles/CreateProfileForm';
import EditProfileForm from '../screens/hr/payroll/Statutory/Profiles/EditProfileForm';
import BulkUpsertProfilesForm from '../screens/hr/payroll/Statutory/Profiles/BulkUpsertProfilesForm';

// Salary Structures
import StructureList from '../screens/hr/payroll/Structures/StructureList';
import StructureDetail from '../screens/hr/payroll/Structures/StructureDetail';
import CreateStructureForm from '../screens/hr/payroll/Structures/CreateStructureForm';
import EditStructureForm from '../screens/hr/payroll/Structures/EditStructureForm';
import CloneStructureForm from '../screens/hr/payroll/Structures/CloneStructureForm';
import AddComponentForm from '../screens/hr/payroll/Structures/AddComponentForm';
import EditComponentFormInStructure from '../screens/hr/payroll/Structures/EditComponentForm';
import AssignStructureToEmployee from '../screens/hr/payroll/Structures/AssignStructureToEmployee';
import BulkAssignStructure from '../screens/hr/payroll/Structures/BulkAssignStructure';

// Tax Declarations
import DeclarationTypeList from '../screens/hr/payroll/TaxDeclarations/DeclarationTypeList';
import CreateDeclarationTypeForm from '../screens/hr/payroll/TaxDeclarations/CreateDeclarationTypeForm';
import EditDeclarationTypeForm from '../screens/hr/payroll/TaxDeclarations/EditDeclarationTypeForm';
import DeclarationList from '../screens/hr/payroll/TaxDeclarations/DeclarationList';
import CreateDeclarationForm from '../screens/hr/payroll/TaxDeclarations/CreateDeclarationForm';
import EditDeclarationForm from '../screens/hr/payroll/TaxDeclarations/EditDeclarationForm';
import VerifyDeclarationForm from '../screens/hr/payroll/TaxDeclarations/VerifyDeclarationForm';
import TotalDeclaredAmount from '../screens/hr/payroll/TaxDeclarations/TotalDeclaredAmount';

// Trends
import CompanyPayrollTrend from '../screens/hr/payroll/Trends/CompanyPayrollTrend';
import ComponentBreakdownTrend from '../screens/hr/payroll/Trends/ComponentBreakdownTrend';

// ============================================================
// ROOT STACK PARAM LIST
// ============================================================
export type RootStackParamList = {
  // Auth
  PhoneInput: undefined;
  OTPVerification: { phone: string; userId?: string; hasMpin?: boolean; flowState?: string };
  MPINSetup: { userId: string; phone: string; companyId: string };

  MPINVerification: {
    phone: string;
    userId: string;
    companyId?: string;
    companies?: { company_id: string; company_name: string }[];
  };

  MPINForgot: { phone: string };
  CompanySelection: {
    userId: string;
    phone: string;
    hasMpin: boolean;
    from: 'setup' | 'verify';
  };

  LocationSelection: { nextRoute?: keyof RootStackParamList };
  QRScanner: undefined;
  SubscriptionPayment: { code?: string; message?: string } | undefined;

  // Main (after login)
  Main: undefined;

  // Module navigation
  ModuleDetail: { moduleName: string };

  // Administration
  WorkCentersList: undefined;
  CreateWorkCenter: undefined;
  EditWorkCenter: { code: string };

  DepartmentsList: undefined;
  CreateDepartment: undefined;
  EditDepartment: { departmentId: string };

  RolesList: undefined;
  CreateRole: undefined;
  EditRole: { roleId: string };

  // Job catalog
  JobsList: undefined;
  CreateJob: undefined;
  EditJob: { jobId: string };

  // Positions (seats)
  PositionsList: undefined;
  CreatePosition: undefined;
  EditPosition: { positionId: string };

  // User self-service
  MyProfile: undefined;
  AvatarManagement: undefined;
  MyAttendanceStats: undefined;
  MyAttendanceExemptions: undefined;

  // Location Management
  LocationList: undefined;
  LocationForm: { locationId?: string };
  EmployeeLocationAccess: {
    employeeUserId: string;
    employeeName?: string;
  };

  // Chat
  Chat: undefined;

  // ============================================================
  // ATTENDANCE MODULE (subject-scoped shared family)
  // ============================================================
  AttendanceHome: { subjectType: 'employee' | 'student' | 'customer' };
  AttendanceSearch: { subjectType: 'employee' | 'student' | 'customer' };
  AttendanceCorrections: { subjectType: 'employee' | 'student' | 'customer' };
  AttendanceReports: { subjectType: 'employee' | 'student' | 'customer' };
  AttendanceDay: {
    subjectType: 'employee' | 'student' | 'customer';
    subjectId: string;
    date: string;
    subjectName?: string;
  };
  TeamAttendanceDashboard: {
    subjectType: 'employee' | 'student' | 'customer';
  };
  TeamMemberAttendance: {
    subjectType: 'employee' | 'student' | 'customer';
    subjectId: string;
    subjectName?: string;
  };

  // ============================================================
  // ATTENDANCE ADMIN (configuration surfaces)
  // ============================================================
  AttendanceAdminHub: {
    subjectType: 'employee' | 'student' | 'customer';
  };
  AttendancePoliciesList: undefined;
  AttendancePolicyForm: { policyId?: string };
  AttendancePolicyAssign: {
    policyId?: string;
    subjectType?: 'employee' | 'student' | 'customer';
    subjectId?: string;
  };
  AttendanceExemptionsList: undefined;
  AttendanceExemptionForm: { exemptionId?: string };
  AttendanceDevicesList: undefined;
  AttendanceDeviceDetail: { deviceId: string };
  AttendanceDeviceForm: { deviceId?: string };
  AttendanceDeviceEnrollments: {
    deviceId: string;
    deviceCode?: string;
    deviceSourceType?: string;
  };
  AttendanceDeviceTokens: {
    deviceId: string;
    deviceCode?: string;
    deviceSourceType?: string;
  };
  AttendanceSourcesList: undefined;

  // ============================================================
  // ATTENDANCE SCHEDULING (work calendars + shift templates)
  //
  // NOTE: no more AttendanceInstancesList / AttendanceScheduleStats.
  // Schedules are derived on read via AttendanceSchedulePreview.
  // ============================================================
  AttendanceSchedulingHub: undefined;
  AttendanceCalendarsList: undefined;
  AttendanceCalendarForm: { calendarId?: string };
  AttendanceScheduleTemplates: undefined;
  AttendanceBulkGenerate: undefined;
  AttendanceSchedulePreview: undefined;
  AttendanceScheduleOverrides:
  | {
      userId?: string;
      date?: string;
      overrideId?: string | null;
      existingType?: string | null;
    }
  | undefined;
  AttendanceWorkCenterShiftMapping: undefined;

  // ============================================================
  // ATTENDANCE ANALYTICS + OPERATIONS
  // ============================================================
  AttendanceResolution: undefined;
  AttendanceCalendarAvailability: { calendarId?: string };
  AttendanceCompanyStats: undefined;
  AttendanceSubjectStats: {
    subjectType?: 'employee' | 'student' | 'customer';
    subjectId?: string;
  };

  // ============================================================
  // ATTENDANCE BIOMETRICS
  // ============================================================
  AttendanceFaceEmbeddings: undefined;
  AttendanceBiometricSyncStatus: undefined;

  // ============================================================
  // ATTENDANCE SESSIONS
  // ============================================================
  AttendanceSessionSummaries: undefined;
  AttendanceSessionSummaryDetail: {
    sessionId: string;
    subjectType: 'employee' | 'student' | 'customer';
    subjectId: string;
  };

  // ===== HR SCREENS =====
  HREmployeeList: undefined;
  HREmployeeDetail: {
    userId: string;
    employeeProfileId?: string;
  };
  HREmployeeForm: { employeeId?: string };
  HREmployeeStats: undefined;
  HRDocumentList: { employeeId: string; employeeName?: string };

  // HR reminders inbox (reached from HR module bell)
  RemindersList: undefined;

  // Org Units
  OrgUnitList: undefined;
  OrgUnitForm: { orgUnitId?: string };
  OrgUnitDetail: { orgUnitId: string };

  // ============================================================
  // LEAVE — SELF-SERVICE (from MyProfileScreen)
  // ============================================================
  LeaveRequestList: undefined;
  LeaveRequestForm: { requestId?: string };
  LeaveBalanceScreen: undefined;

  // Handles BOTH modes:
  //   mode: 'self' → self-service; only Cancel is available
  //   mode: 'hr'   → HR admin; Approve / Reject / Cancel available
  LeaveRequestDetail: { requestId: string; mode?: 'self' | 'hr' };

  // ============================================================
  // LEAVE — ADMIN (from HR module grid)
  // ============================================================
  LeaveRequestAdminList: undefined;
  LeaveBalanceAdminScreen: undefined;
  // ⚠️ NEW — company-wide ledger browse (filters: user, type, dates)
  LeaveLedger: undefined;

  PolicyConfigList: undefined;
  PolicyConfigForm: { policyId?: string };
  PolicyConfigDetail: { policyId: string };
  LeaveTypeList: undefined;
  LeaveTypeForm: { leaveTypeId?: string };
  EntitlementList: undefined;
  CreateEntitlement: { userId?: string; leaveTypeId?: string };
  AddPolicyRule: { policyId: string };

  PolicyResolution: undefined;
  UserEffectivePolicies: {
    userId: string;
    username?: string;
    asOf?: string;
  };

  // ===== PAYROLL SCREENS =====
  BankDetailsList: { userId: string; userName?: string };
  BankDetailsForm: { bankDetailId?: string; userId: string };

  AdjustmentList: undefined;
  CreateAdjustment: undefined;
  EditAdjustment: { adjustmentId: string };
  BulkCreateAdjustment: undefined;

  AttendanceRuleList: undefined;
  CreateAttendanceRule: undefined;
  EditAttendanceRule: { ruleId: string };
  BulkDeactivateRules: undefined;

  ComponentList: undefined;
  ComponentDetail: { componentCode: string };
  CreateComponent: undefined;
  EditComponent: { componentCode: string };

  PayrollDashboard: undefined;

  EmployeeSalaryView: { userId: string };
  SalarySnapshotView: { userId: string };
  PreviewEarnings: { userId: string };
  EmployeeAdjustmentsList: { userId: string };
  EmployeeStatutoryProfiles: { userId: string; statutoryCode?: string };
  ChangeTaxRegime: { userId: string };
  EmployeePayrollHistory: { userId: string };
  EmployeeYTD: { userId: string };
  EmployeeStatutorySummary: { userId: string };

  FineList: undefined;
  CreateFine: undefined;
  EditFine: { fineId: string };
  BulkCreateFine: undefined;
  CompanyFineSummary: undefined;
  EmployeeFineSummary: { userId: string };
  LockFinesForPayroll: undefined;

  LoanList: { userId: string };
  LoanDetail: { loanId: string };
  CreateLoan: { userId: string };
  CloseLoan: { loanId: string };
  ManualPayment: { loanId: string };
  PreviewEMI: undefined;
  LoanPaymentsList: { loanId: string };
  MarkEMIAsPaid: { emiId: string; runId?: string };
  PendingEMIsForRun: { runId: string };

  LockList: undefined;
  CreateLock: undefined;

  UserPayslipList: { userId: string };
  PayslipDownload: { runId: string; userId: string };
  SendPayslipEmail: { runId: string; userId: string };
  GeneratePayslipsForRun: { runId: string };

  PayrollRegister: undefined;
  StatutoryChallan: undefined;

  PayrollRunList: undefined;
  PayrollRunDetail: { runId: string };
  CreateRun: undefined;
  RunLedgerSummary: { runId: string };
  RunStatutorySummary: { runId: string };
  RunEmployeesList: { runId: string };
  ReprocessEmployee: { runId: string; userId: string };
  ExportRunCSV: { runId: string };
  GenerateBankFile: { runId: string };

  ComponentDefinitionList: undefined;
  CreateComponentDefinition: undefined;
  EditComponentDefinition: { statutoryCode: string };

  RuleSetList: undefined;
  RuleSetDetail: { ruleSetId: string };
  CreateRuleSet: undefined;
  EditRuleSet: { ruleSetId: string };
  ContributionRuleList: { ruleSetId: string };
  CreateContributionRule: { ruleSetId: string };
  EditContributionRule: { ruleSetId: string; ruleId: string };
  TaxSlabList: { ruleSetId: string };
  CreateTaxSlab: { ruleSetId: string };
  EditTaxSlab: { ruleSetId: string; slabId: string };
  DeductionLimitList: { ruleSetId: string };
  CreateDeductionLimit: { ruleSetId: string };
  EditDeductionLimit: { ruleSetId: string; limitId: string };
  ComponentMappingList: { ruleSetId: string };
  CreateComponentMapping: { ruleSetId: string };
  EditComponentMapping: { ruleSetId: string; mappingId: string };
  BulkCreateComponentMapping: { ruleSetId: string };

  ProfileList: undefined;
  CreateProfile: undefined;
  EditProfile: { profileId: string };
  BulkUpsertProfiles: undefined;

  StructureList: undefined;
  StructureDetail: { structureId: string };
  CreateStructure: undefined;
  EditStructure: { structureId: string };
  CloneStructure: { structureId: string };
  AddComponentToStructure: { structureId: string };
  EditStructureComponent: { structureId: string; componentCode: string };
  AssignStructure: { structureId: string };
  BulkAssignStructure: { structureId: string };

  DeclarationTypeList: undefined;
  CreateDeclarationType: undefined;
  EditDeclarationType: { typeCode: string };
  DeclarationList: undefined;
  CreateDeclaration: undefined;
  EditDeclaration: { declarationId: string };
  VerifyDeclaration: { declarationId: string };
  TotalDeclaredAmount: undefined;

  CompanyPayrollTrend: undefined;
  ComponentBreakdownTrend: { componentCode: string };
};

// ============================================================
// NAVIGATOR
// ============================================================
const Stack = createStackNavigator<RootStackParamList>();

export default function Navigation() {
  const {
    isAuthenticated,
    locationId,
    accessibleLocations,
    locationsBootstrapped,
    pendingUserId,
    pendingPhone,
    pendingHasMpin,
    savedUserId,
    savedPhone,
    savedHasMpin,
  } = useUserAuthStore();

  const blocker = useSubscriptionBlockerStore((s) => s.blocker);

  useEffect(() => {
    if (!blocker) return;
    if (!isAuthenticated) return;
    if (!navigationRef.isReady?.()) return;

    const currentRoute = navigationRef.getCurrentRoute?.();
    if (currentRoute?.name === 'SubscriptionPayment') return;

    const t = setTimeout(() => {
      try {
        (navigationRef as any).navigate('SubscriptionPayment', {
          code: blocker.code,
          message: blocker.message,
        });
      } catch (e) {
        console.warn('⚠️ [Nav] could not navigate to SubscriptionPayment', e);
      }
    }, 50);

    return () => clearTimeout(t);
  }, [blocker, isAuthenticated]);

  let initialRoute: keyof RootStackParamList = 'PhoneInput';

  if (isAuthenticated) {
    const needsLocationPick =
      locationsBootstrapped &&
      !locationId &&
      accessibleLocations.length > 1;

    initialRoute = needsLocationPick ? 'LocationSelection' : 'Main';
  } else if (pendingUserId && pendingPhone) {
    initialRoute = pendingHasMpin ? 'MPINVerification' : 'MPINSetup';
  } else if (savedUserId && savedPhone && savedHasMpin === true) {
    initialRoute = 'MPINVerification';
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={onNavigationReady}>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={initialRoute}
      >
        {/* Auth Screens */}
        <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
        <Stack.Screen name="MPINSetup" component={MPINSetupScreen} />
        <Stack.Screen name="MPINVerification" component={MPINVerificationScreen} />
        <Stack.Screen name="MPINForgot" component={MPINForgotScreen} />
        <Stack.Screen name="CompanySelection" component={CompanySelectionScreen} />

        <Stack.Screen
          name="LocationSelection"
          component={LocationSelectionScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />

        <Stack.Screen
          name="SubscriptionPayment"
          component={SubscriptionPaymentScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />

        <Stack.Screen
          name="QRScanner"
          component={WebLoginQRScanner}
          options={{ headerShown: false }}
        />

        {/* Main (Module Grid) */}
        <Stack.Screen name="Main" component={ModuleGridScreen} />

        {/* Module Detail */}
        <Stack.Screen
          name="ModuleDetail"
          component={ModuleDetailScreen}
          options={{ headerShown: true, title: 'Module' }}
        />

        {/* ============================================================
            ATTENDANCE MODULE  (shared, subject-scoped)
        ============================================================ */}
        <Stack.Screen
          name="AttendanceHome"
          component={AttendanceHomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AttendanceSearch"
          component={AttendanceSearchScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AttendanceCorrections"
          component={AttendanceCorrectionsScreen}
          options={{ headerShown: true, title: 'Corrections' }}
        />
        <Stack.Screen
          name="AttendanceReports"
          component={AttendanceReportsScreen}
          options={{ headerShown: true, title: 'Attendance Reports' }}
        />
        <Stack.Screen
          name="AttendanceDay"
          component={AttendanceDayScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TeamAttendanceDashboard"
          component={TeamAttendanceDashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TeamMemberAttendance"
          component={TeamMemberAttendanceScreen}
          options={{ headerShown: false }}
        />

        {/* ============================================================
            ATTENDANCE ADMIN (configuration)
        ============================================================ */}
        <Stack.Screen
          name="AttendanceAdminHub"
          component={AttendanceAdminHubScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AttendancePoliciesList"
          component={AttendancePoliciesListScreen}
          options={{ headerShown: true, title: 'Attendance Policies' }}
        />
        <Stack.Screen
          name="AttendancePolicyForm"
          component={AttendancePolicyFormScreen}
          options={{ headerShown: true, title: 'Policy' }}
        />
        <Stack.Screen
          name="AttendancePolicyAssign"
          component={AttendancePolicyAssignScreen}
          options={{ headerShown: true, title: 'Assign Policy' }}
        />
        <Stack.Screen
          name="AttendanceExemptionsList"
          component={AttendanceExemptionsListScreen}
          options={{ headerShown: true, title: 'Exemptions' }}
        />
        <Stack.Screen
          name="AttendanceExemptionForm"
          component={AttendanceExemptionFormScreen}
          options={{ headerShown: true, title: 'Exemption' }}
        />
        <Stack.Screen
          name="AttendanceDevicesList"
          component={AttendanceDevicesListScreen}
          options={{ headerShown: true, title: 'Devices' }}
        />
        <Stack.Screen
          name="AttendanceDeviceDetail"
          component={AttendanceDeviceDetailScreen}
          options={{ headerShown: true, title: 'Device' }}
        />
        <Stack.Screen
          name="AttendanceDeviceForm"
          component={AttendanceDeviceFormScreen}
          options={{ headerShown: true, title: 'Device' }}
        />
        <Stack.Screen
          name="AttendanceDeviceEnrollments"
          component={AttendanceDeviceEnrollmentsScreen}
          options={{ headerShown: true, title: 'Enrollments' }}
        />
        <Stack.Screen
          name="AttendanceDeviceTokens"
          component={AttendanceDeviceTokensScreen}
          options={{ headerShown: true, title: 'Device Tokens' }}
        />
        <Stack.Screen
          name="AttendanceSourcesList"
          component={AttendanceSourcesListScreen}
          options={{ headerShown: true, title: 'Attendance Sources' }}
        />

        {/* ============================================================
            ATTENDANCE SCHEDULING
            Schedules are computed on read. No instances, no stats.
        ============================================================ */}
        <Stack.Screen
          name="AttendanceSchedulingHub"
          component={SchedulingHubScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AttendanceCalendarsList"
          component={CalendarsListScreen}
          options={{ headerShown: true, title: 'Work Calendars' }}
        />
        <Stack.Screen
          name="AttendanceCalendarForm"
          component={CalendarFormScreen}
          options={{ headerShown: true, title: 'Calendar' }}
        />
        <Stack.Screen
          name="AttendanceScheduleTemplates"
          component={ScheduleTemplatesScreen}
          options={{ headerShown: true, title: 'Shift Templates' }}
        />
        <Stack.Screen
          name="AttendanceBulkGenerate"
          component={BulkGenerateScreen}
          options={{ headerShown: true, title: 'Scheduling Info' }}
        />
        <Stack.Screen
          name="AttendanceSchedulePreview"
          component={SchedulePreviewScreen}
          options={{ headerShown: true, title: 'Schedule Preview' }}
        />
        <Stack.Screen
          name="AttendanceScheduleOverrides"
          component={ScheduleOverridesScreen}
          options={{ headerShown: true, title: 'Overrides' }}
        />
        <Stack.Screen
          name="AttendanceWorkCenterShiftMapping"
          component={WorkCenterShiftMappingScreen}
          options={{ headerShown: true, title: 'Work Center Shifts' }}
        />

        {/* ============================================================
            ATTENDANCE ANALYTICS + OPERATIONS
        ============================================================ */}
        <Stack.Screen
          name="AttendanceResolution"
          component={AttendanceResolutionScreen}
          options={{ headerShown: true, title: 'Resolution' }}
        />
        <Stack.Screen
          name="AttendanceCalendarAvailability"
          component={AttendanceCalendarAvailabilityScreen}
          options={{ headerShown: true, title: 'Calendar Availability' }}
        />
        <Stack.Screen
          name="AttendanceCompanyStats"
          component={AttendanceCompanyStatsScreen}
          options={{ headerShown: true, title: 'Company Stats' }}
        />
        <Stack.Screen
          name="AttendanceSubjectStats"
          component={AttendanceSubjectStatsScreen}
          options={{ headerShown: true, title: 'Subject Stats' }}
        />

        {/* ============================================================
            ATTENDANCE BIOMETRICS
        ============================================================ */}
        <Stack.Screen
          name="AttendanceFaceEmbeddings"
          component={AttendanceFaceEmbeddingsScreen}
          options={{ headerShown: true, title: 'Face Embeddings' }}
        />
        <Stack.Screen
          name="AttendanceBiometricSyncStatus"
          component={AttendanceBiometricSyncStatusScreen}
          options={{ headerShown: true, title: 'Biometric Sync Status' }}
        />

        {/* ============================================================
            ATTENDANCE SESSIONS
        ============================================================ */}
        <Stack.Screen
          name="AttendanceSessionSummaries"
          component={SessionSummariesListScreen}
          options={{ headerShown: true, title: 'Session Summaries' }}
        />
        <Stack.Screen
          name="AttendanceSessionSummaryDetail"
          component={SessionSummaryDetailScreen}
          options={{ headerShown: true, title: 'Session Detail' }}
        />

        {/* ===== Administration Module Screens ===== */}
        <Stack.Screen name="WorkCentersList" component={WorkCentersListScreen} options={{ headerShown: true, title: 'Work Centers' }} />
        <Stack.Screen name="CreateWorkCenter" component={CreateWorkCenterScreen} options={{ headerShown: true, title: 'New Work Center' }} />
        <Stack.Screen name="EditWorkCenter" component={EditWorkCenterScreen} options={{ headerShown: true, title: 'Edit Work Center' }} />

        <Stack.Screen name="DepartmentsList" component={DepartmentsListScreen} options={{ headerShown: true, title: 'Departments' }} />
        <Stack.Screen name="CreateDepartment" component={CreateDepartmentScreen} options={{ headerShown: true, title: 'New Department' }} />
        <Stack.Screen name="EditDepartment" component={EditDepartmentScreen} options={{ headerShown: true, title: 'Edit Department' }} />

        <Stack.Screen name="RolesList" component={RolesListScreen} options={{ headerShown: true, title: 'Roles' }} />
        <Stack.Screen name="CreateRole" component={CreateRoleScreen} options={{ headerShown: true, title: 'New Role' }} />
        <Stack.Screen name="EditRole" component={EditRoleScreen} options={{ headerShown: true, title: 'Edit Role' }} />

        {/* ===== Jobs (role catalog) ===== */}
        <Stack.Screen name="JobsList" component={JobsListScreen} options={{ headerShown: true, title: 'Jobs' }} />
        <Stack.Screen name="CreateJob" component={CreateJobScreen} options={{ headerShown: true, title: 'New Job' }} />
        <Stack.Screen name="EditJob" component={EditJobScreen} options={{ headerShown: true, title: 'Edit Job' }} />

        {/* ===== Positions (seats) ===== */}
        <Stack.Screen name="PositionsList" component={PositionsListScreen} options={{ headerShown: true, title: 'Positions' }} />
        <Stack.Screen name="CreatePosition" component={CreatePositionScreen} options={{ headerShown: true, title: 'New Position' }} />
        <Stack.Screen name="EditPosition" component={EditPositionScreen} options={{ headerShown: true, title: 'Edit Position' }} />

        {/* ===== User Self-Service ===== */}
        <Stack.Screen
          name="MyProfile"
          component={MyProfileScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="AvatarManagement" component={AvatarManagementScreen} options={{ headerShown: true, title: 'My Avatars' }} />
        <Stack.Screen
          name="MyAttendanceStats"
          component={MyStatsScreen}
          options={{ headerShown: true, title: 'My Attendance Stats' }}
        />
        <Stack.Screen
          name="MyAttendanceExemptions"
          component={MyExemptionsScreen}
          options={{ headerShown: true, title: 'My Exemptions' }}
        />

        {/* Location Management */}
        <Stack.Screen name="LocationList" component={LocationListScreen} options={{ headerShown: true, title: 'Locations' }} />
        <Stack.Screen name="LocationForm" component={LocationFormScreen} options={{ headerShown: true, title: 'Location' }} />
        <Stack.Screen name="EmployeeLocationAccess" component={EmployeeLocationAccessScreen} options={{ headerShown: true, title: 'Location Access' }} />

        {/* Chat */}
        <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />

        {/* ============================================================
            HR MODULE SCREENS
        ============================================================ */}
        <Stack.Screen name="HREmployeeList" component={HREmployeeList} options={{ headerShown: true, title: 'HR Employees' }} />
        <Stack.Screen name="HREmployeeDetail" component={HREmployeeDetail} options={{ headerShown: true, title: 'Employee Detail' }} />
        <Stack.Screen name="HREmployeeForm" component={HREmployeeForm} options={{ headerShown: true, title: 'Employee Form' }} />
        <Stack.Screen name="HREmployeeStats" component={HREmployeeStats} options={{ headerShown: true, title: 'HR Statistics' }} />
        <Stack.Screen name="HRDocumentList" component={HRDocumentList} options={{ headerShown: true, title: 'Documents' }} />

        {/* HR reminders inbox (from HR module bell) */}
        <Stack.Screen
          name="RemindersList"
          component={RemindersListScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen name="OrgUnitList" component={OrgUnitList} options={{ headerShown: true, title: 'Org Units' }} />
        <Stack.Screen name="OrgUnitForm" component={OrgUnitForm} options={{ headerShown: true, title: 'Org Unit Form' }} />
        <Stack.Screen name="OrgUnitDetail" component={OrgUnitDetail} options={{ headerShown: true, title: 'Org Unit Detail' }} />

        {/* ============================================================
            LEAVE — SELF-SERVICE (from MyProfileScreen)
        ============================================================ */}
        <Stack.Screen
          name="LeaveRequestList"
          component={LeaveRequestList}
          options={{ headerShown: true, title: 'My Leave Requests' }}
        />
        <Stack.Screen
          name="LeaveRequestForm"
          component={LeaveRequestForm}
          options={{ headerShown: true, title: 'Leave Request' }}
        />
        <Stack.Screen
          name="LeaveBalanceScreen"
          component={LeaveBalanceScreen}
          options={{ headerShown: true, title: 'Leave Balance' }}
        />
        <Stack.Screen
          name="LeaveRequestDetail"
          component={LeaveDetail}
          options={{ headerShown: true, title: 'Leave Request Detail' }}
        />

        {/* ============================================================
            LEAVE — ADMIN (from HR module grid)
        ============================================================ */}
        <Stack.Screen
          name="LeaveRequestAdminList"
          component={LeaveRequestAdminList}
          options={{ headerShown: true, title: 'Leave Requests' }}
        />
        <Stack.Screen
          name="LeaveBalanceAdminScreen"
          component={LeaveBalanceAdminScreen}
          options={{ headerShown: true, title: 'Leave Balance' }}
        />
        {/* ⚠️ NEW — company-wide ledger browse */}
        <Stack.Screen
          name="LeaveLedger"
          component={LeaveLedgerScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen name="PolicyConfigList" component={PolicyConfigList} options={{ headerShown: true, title: 'Leave Policies' }} />
        <Stack.Screen name="PolicyConfigForm" component={PolicyConfigForm} options={{ headerShown: true, title: 'Leave Policy' }} />
        <Stack.Screen name="PolicyConfigDetail" component={PolicyConfigDetail} options={{ headerShown: true, title: 'Policy Detail' }} />
        <Stack.Screen name="LeaveTypeList" component={LeaveTypeList} options={{ headerShown: true, title: 'Leave Types' }} />
        <Stack.Screen name="LeaveTypeForm" component={LeaveTypeForm} options={{ headerShown: true, title: 'Leave Type' }} />
        <Stack.Screen name="EntitlementList" component={EntitlementList} options={{ headerShown: true, title: 'Entitlements' }} />
        <Stack.Screen name="CreateEntitlement" component={CreateEntitlementScreen} options={{ headerShown: true, title: 'Create Entitlement' }} />
        <Stack.Screen name="AddPolicyRule" component={AddPolicyRuleScreen} options={{ headerShown: true, title: 'Add Policy Rule' }} />

        <Stack.Screen
          name="PolicyResolution"
          component={PolicyResolutionScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="UserEffectivePolicies"
          component={UserEffectivePoliciesScreen}
          options={{ headerShown: false }}
        />

        {/* ============================================================
            PAYROLL SCREENS
        ============================================================ */}
        <Stack.Screen name="BankDetailsList" component={BankDetailsList} options={{ headerShown: true, title: 'Bank Details' }} />
        <Stack.Screen name="BankDetailsForm" component={BankDetailsForm} options={{ headerShown: true, title: 'Bank Details Form' }} />

        <Stack.Screen name="AdjustmentList" component={AdjustmentList} options={{ headerShown: true, title: 'Adjustments' }} />
        <Stack.Screen name="CreateAdjustment" component={CreateAdjustmentForm} options={{ headerShown: true, title: 'Create Adjustment' }} />
        <Stack.Screen name="EditAdjustment" component={EditAdjustmentForm} options={{ headerShown: true, title: 'Edit Adjustment' }} />
        <Stack.Screen name="BulkCreateAdjustment" component={BulkCreateAdjustmentForm} options={{ headerShown: true, title: 'Bulk Create Adjustments' }} />

        <Stack.Screen name="AttendanceRuleList" component={AttendanceRuleList} options={{ headerShown: true, title: 'Attendance Rules' }} />
        <Stack.Screen name="CreateAttendanceRule" component={CreateAttendanceRuleForm} options={{ headerShown: true, title: 'Create Attendance Rule' }} />
        <Stack.Screen name="EditAttendanceRule" component={EditAttendanceRuleForm} options={{ headerShown: true, title: 'Edit Attendance Rule' }} />
        <Stack.Screen name="BulkDeactivateRules" component={BulkDeactivateRulesForm} options={{ headerShown: true, title: 'Bulk Deactivate Rules' }} />

        <Stack.Screen name="ComponentList" component={ComponentList} options={{ headerShown: true, title: 'Payroll Components' }} />
        <Stack.Screen name="ComponentDetail" component={ComponentDetail} options={{ headerShown: true, title: 'Component Detail' }} />
        <Stack.Screen name="CreateComponent" component={CreateComponentForm} options={{ headerShown: true, title: 'Create Component' }} />
        <Stack.Screen name="EditComponent" component={EditComponentForm} options={{ headerShown: true, title: 'Edit Component' }} />

        <Stack.Screen name="PayrollDashboard" component={PayrollDashboard} options={{ headerShown: true, title: 'Payroll Dashboard' }} />

        <Stack.Screen name="EmployeeSalaryView" component={EmployeeSalaryView} options={{ headerShown: true, title: 'Employee Salary' }} />
        <Stack.Screen name="SalarySnapshotView" component={SalarySnapshotView} options={{ headerShown: true, title: 'Salary Snapshot' }} />
        <Stack.Screen name="PreviewEarnings" component={PreviewEarningsForm} options={{ headerShown: true, title: 'Preview Earnings' }} />
        <Stack.Screen name="EmployeeAdjustmentsList" component={EmployeeAdjustmentsList} options={{ headerShown: true, title: 'Employee Adjustments' }} />
        <Stack.Screen name="EmployeeStatutoryProfiles" component={EmployeeStatutoryProfilesList} options={{ headerShown: true, title: 'Statutory Profiles' }} />
        <Stack.Screen name="ChangeTaxRegime" component={ChangeTaxRegimeForm} options={{ headerShown: true, title: 'Change Tax Regime' }} />
        <Stack.Screen name="EmployeePayrollHistory" component={EmployeePayrollHistory} options={{ headerShown: true, title: 'Payroll History' }} />
        <Stack.Screen name="EmployeeYTD" component={EmployeeYTD} options={{ headerShown: true, title: 'Year to Date' }} />
        <Stack.Screen name="EmployeeStatutorySummary" component={EmployeeStatutorySummary} options={{ headerShown: true, title: 'Statutory Summary' }} />

        <Stack.Screen name="FineList" component={FineList} options={{ headerShown: true, title: 'Fines' }} />
        <Stack.Screen name="CreateFine" component={CreateFineForm} options={{ headerShown: true, title: 'Create Fine' }} />
        <Stack.Screen name="EditFine" component={EditFineForm} options={{ headerShown: true, title: 'Edit Fine' }} />
        <Stack.Screen name="BulkCreateFine" component={BulkCreateFineForm} options={{ headerShown: true, title: 'Bulk Create Fines' }} />
        <Stack.Screen name="CompanyFineSummary" component={CompanyFineSummary} options={{ headerShown: true, title: 'Company Fine Summary' }} />
        <Stack.Screen name="EmployeeFineSummary" component={EmployeeFineSummary} options={{ headerShown: true, title: 'Employee Fine Summary' }} />
        <Stack.Screen name="LockFinesForPayroll" component={LockFinesForPayrollForm} options={{ headerShown: true, title: 'Lock Fines for Payroll' }} />

        <Stack.Screen name="LoanList" component={LoanList} options={{ headerShown: true, title: 'Employee Loans' }} />
        <Stack.Screen name="LoanDetail" component={LoanDetail} options={{ headerShown: true, title: 'Loan Detail' }} />
        <Stack.Screen name="CreateLoan" component={CreateLoanForm} options={{ headerShown: true, title: 'Create Loan' }} />
        <Stack.Screen name="CloseLoan" component={CloseLoanForm} options={{ headerShown: true, title: 'Close Loan' }} />
        <Stack.Screen name="ManualPayment" component={ManualPaymentForm} options={{ headerShown: true, title: 'Manual Payment' }} />
        <Stack.Screen name="PreviewEMI" component={PreviewEMIForm} options={{ headerShown: true, title: 'Preview EMI' }} />
        <Stack.Screen name="LoanPaymentsList" component={LoanPaymentsList} options={{ headerShown: true, title: 'Loan Payments' }} />
        <Stack.Screen name="MarkEMIAsPaid" component={MarkEMIAsPaidForm} options={{ headerShown: true, title: 'Mark EMI as Paid' }} />
        <Stack.Screen name="PendingEMIsForRun" component={PendingEMIsForRun} options={{ headerShown: true, title: 'Pending EMIs for Run' }} />

        <Stack.Screen name="LockList" component={LockList} options={{ headerShown: true, title: 'Payroll Locks' }} />
        <Stack.Screen name="CreateLock" component={CreateLockForm} options={{ headerShown: true, title: 'Create Lock' }} />

        <Stack.Screen name="UserPayslipList" component={UserPayslipList} options={{ headerShown: true, title: 'My Payslips' }} />
        <Stack.Screen name="PayslipDownload" component={PayslipDownload} options={{ headerShown: true, title: 'Download Payslip' }} />
        <Stack.Screen name="SendPayslipEmail" component={SendPayslipEmailForm} options={{ headerShown: true, title: 'Send Payslip Email' }} />
        <Stack.Screen name="GeneratePayslipsForRun" component={GeneratePayslipsForRunButton} options={{ headerShown: true, title: 'Generate Payslips' }} />

        <Stack.Screen name="PayrollRegister" component={PayrollRegisterForm} options={{ headerShown: true, title: 'Payroll Register' }} />
        <Stack.Screen name="StatutoryChallan" component={StatutoryChallanForm} options={{ headerShown: true, title: 'Statutory Challan' }} />

        <Stack.Screen name="PayrollRunList" component={PayrollRunList} options={{ headerShown: true, title: 'Payroll Runs' }} />
        <Stack.Screen name="PayrollRunDetail" component={PayrollRunDetail} options={{ headerShown: true, title: 'Run Detail' }} />
        <Stack.Screen name="CreateRun" component={CreateRunForm} options={{ headerShown: true, title: 'Create Run' }} />
        <Stack.Screen name="RunLedgerSummary" component={RunLedgerSummary} options={{ headerShown: true, title: 'Ledger Summary' }} />
        <Stack.Screen name="RunStatutorySummary" component={RunStatutorySummary} options={{ headerShown: true, title: 'Statutory Summary' }} />
        <Stack.Screen name="RunEmployeesList" component={RunEmployeesList} options={{ headerShown: true, title: 'Employees in Run' }} />
        <Stack.Screen name="ReprocessEmployee" component={ReprocessEmployeeForm} options={{ headerShown: true, title: 'Reprocess Employee' }} />
        <Stack.Screen name="ExportRunCSV" component={ExportRunCSV} options={{ headerShown: true, title: 'Export Run CSV' }} />
        <Stack.Screen name="GenerateBankFile" component={GenerateBankFileForm} options={{ headerShown: true, title: 'Generate Bank File' }} />

        <Stack.Screen name="ComponentDefinitionList" component={ComponentDefinitionList} options={{ headerShown: true, title: 'Component Definitions' }} />
        <Stack.Screen name="CreateComponentDefinition" component={CreateComponentDefinitionForm} options={{ headerShown: true, title: 'Create Component Definition' }} />
        <Stack.Screen name="EditComponentDefinition" component={EditComponentDefinitionForm} options={{ headerShown: true, title: 'Edit Component Definition' }} />

        <Stack.Screen name="RuleSetList" component={RuleSetList} options={{ headerShown: true, title: 'Rule Sets' }} />
        <Stack.Screen name="RuleSetDetail" component={RuleSetDetail} options={{ headerShown: true, title: 'Rule Set Detail' }} />
        <Stack.Screen name="CreateRuleSet" component={CreateRuleSetForm} options={{ headerShown: true, title: 'Create Rule Set' }} />
        <Stack.Screen name="EditRuleSet" component={EditRuleSetForm} options={{ headerShown: true, title: 'Edit Rule Set' }} />
        <Stack.Screen name="ContributionRuleList" component={ContributionRuleList} options={{ headerShown: true, title: 'Contribution Rules' }} />
        <Stack.Screen name="CreateContributionRule" component={CreateContributionRuleForm} options={{ headerShown: true, title: 'Create Contribution Rule' }} />
        <Stack.Screen name="EditContributionRule" component={EditContributionRuleForm} options={{ headerShown: true, title: 'Edit Contribution Rule' }} />
        <Stack.Screen name="TaxSlabList" component={TaxSlabList} options={{ headerShown: true, title: 'Tax Slabs' }} />
        <Stack.Screen name="CreateTaxSlab" component={CreateTaxSlabForm} options={{ headerShown: true, title: 'Create Tax Slab' }} />
        <Stack.Screen name="EditTaxSlab" component={EditTaxSlabForm} options={{ headerShown: true, title: 'Edit Tax Slab' }} />
        <Stack.Screen name="DeductionLimitList" component={DeductionLimitList} options={{ headerShown: true, title: 'Deduction Limits' }} />
        <Stack.Screen name="CreateDeductionLimit" component={CreateDeductionLimitForm} options={{ headerShown: true, title: 'Create Deduction Limit' }} />
        <Stack.Screen name="EditDeductionLimit" component={EditDeductionLimitForm} options={{ headerShown: true, title: 'Edit Deduction Limit' }} />
        <Stack.Screen name="ComponentMappingList" component={ComponentMappingList} options={{ headerShown: true, title: 'Component Mappings' }} />
        <Stack.Screen name="CreateComponentMapping" component={CreateComponentMappingForm} options={{ headerShown: true, title: 'Create Mapping' }} />
        <Stack.Screen name="EditComponentMapping" component={EditComponentMappingForm} options={{ headerShown: true, title: 'Edit Mapping' }} />
        <Stack.Screen name="BulkCreateComponentMapping" component={BulkCreateComponentMappingForm} options={{ headerShown: true, title: 'Bulk Create Mappings' }} />

        <Stack.Screen name="ProfileList" component={ProfileList} options={{ headerShown: true, title: 'Statutory Profiles' }} />
        <Stack.Screen name="CreateProfile" component={CreateProfileForm} options={{ headerShown: true, title: 'Create Profile' }} />
        <Stack.Screen name="EditProfile" component={EditProfileForm} options={{ headerShown: true, title: 'Edit Profile' }} />
        <Stack.Screen name="BulkUpsertProfiles" component={BulkUpsertProfilesForm} options={{ headerShown: true, title: 'Bulk Upsert Profiles' }} />

        <Stack.Screen name="StructureList" component={StructureList} options={{ headerShown: true, title: 'Salary Structures' }} />
        <Stack.Screen name="StructureDetail" component={StructureDetail} options={{ headerShown: true, title: 'Structure Detail' }} />
        <Stack.Screen name="CreateStructure" component={CreateStructureForm} options={{ headerShown: true, title: 'Create Structure' }} />
        <Stack.Screen name="EditStructure" component={EditStructureForm} options={{ headerShown: true, title: 'Edit Structure' }} />
        <Stack.Screen name="CloneStructure" component={CloneStructureForm} options={{ headerShown: true, title: 'Clone Structure' }} />
        <Stack.Screen name="AddComponentToStructure" component={AddComponentForm} options={{ headerShown: true, title: 'Add Component' }} />
        <Stack.Screen name="EditStructureComponent" component={EditComponentFormInStructure} options={{ headerShown: true, title: 'Edit Component' }} />
        <Stack.Screen name="AssignStructure" component={AssignStructureToEmployee} options={{ headerShown: true, title: 'Assign Structure' }} />
        <Stack.Screen name="BulkAssignStructure" component={BulkAssignStructure} options={{ headerShown: true, title: 'Bulk Assign Structure' }} />

        <Stack.Screen name="DeclarationTypeList" component={DeclarationTypeList} options={{ headerShown: true, title: 'Declaration Types' }} />
        <Stack.Screen name="CreateDeclarationType" component={CreateDeclarationTypeForm} options={{ headerShown: true, title: 'Create Declaration Type' }} />
        <Stack.Screen name="EditDeclarationType" component={EditDeclarationTypeForm} options={{ headerShown: true, title: 'Edit Declaration Type' }} />
        <Stack.Screen name="DeclarationList" component={DeclarationList} options={{ headerShown: true, title: 'Tax Declarations' }} />
        <Stack.Screen name="CreateDeclaration" component={CreateDeclarationForm} options={{ headerShown: true, title: 'Create Declaration' }} />
        <Stack.Screen name="EditDeclaration" component={EditDeclarationForm} options={{ headerShown: true, title: 'Edit Declaration' }} />
        <Stack.Screen name="VerifyDeclaration" component={VerifyDeclarationForm} options={{ headerShown: true, title: 'Verify Declaration' }} />
        <Stack.Screen name="TotalDeclaredAmount" component={TotalDeclaredAmount} options={{ headerShown: true, title: 'Total Declared Amount' }} />

        <Stack.Screen name="CompanyPayrollTrend" component={CompanyPayrollTrend} options={{ headerShown: true, title: 'Payroll Trends' }} />
        <Stack.Screen name="ComponentBreakdownTrend" component={ComponentBreakdownTrend} options={{ headerShown: true, title: 'Component Trend' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}