// packages/api-client/src/payroll.ts
import {
    // Existing imports
    BankDetail,
    CreateBankDetailPayload,
    UpdateBankDetailPayload,
    ApiResponse,
  
    // Payroll Locks
    PayrollLock,
  
    // Adjustments
    Adjustment,
    CreateAdjustmentPayload,
    UpdateAdjustmentPayload,
  
    // Salary Structures
    SalaryStructure,
    CreateStructurePayload,
    UpdateStructurePayload,
    StructureComponent,
    AddComponentPayload,
    ReorderComponentsPayload,
    // Alias to avoid conflict with payroll component update payload
    UpdateComponentPayload as UpdateStructureComponentPayload,
    AssignStructurePayload,
    BulkAssignStructurePayload,
  
    // Statutory Profiles
    ComponentDefinition,
    CreateComponentDefinitionPayload,
    UpdateComponentDefinitionPayload,
    RuleSet,
    CreateRuleSetPayload,
    UpdateRuleSetPayload,
    ContributionRule,
    CreateContributionRulePayload,
    UpdateContributionRulePayload,
    TaxSlab,
    CreateTaxSlabPayload,
    UpdateTaxSlabPayload,
    DeductionLimit,
    CreateDeductionLimitPayload,
    UpdateDeductionLimitPayload,
    ComponentMapping,
    CreateComponentMappingPayload,
    BulkCreateComponentMappingsPayload,
    UpdateComponentMappingPayload,
    StatutoryProfile,
    CreateProfilePayload,
    UpdateProfilePayload,
    BulkUpsertProfilesPayload,
    ChangeTaxRegimePayload,
  
    // Attendance Rules (Payroll)
    AttendanceRule,
    CreateAttendanceRulePayload,
    UpdateAttendanceRulePayload,
    BulkDeactivateByTypePayload,
  
    // Fines
    Fine,
    CreateFinePayload,
    UpdateFinePayload,
    BulkCreateFinesPayload,
    LockFinesForPayrollRunPayload,
    MarkFineAsProcessedPayload,
    BulkDeleteUnprocessedPayload,
  
    // Employee Payroll
    EmployeeSalary,
    SalarySnapshot,
    PreviewEarningsPayload,
    EmployeeAdjustment,
    EmployeeStatutorySummary,
  
    // Payroll Runs
    PayrollRun,
    RunSummary,
    CreateRunPayload,
    RunLedgerSummary,
    RunStatutorySummary,
    ReprocessEmployeePayload,
    MarkRunAsPaidPayload,
  
    // Components
    PayrollComponent,
    CreateComponentPayload,
    // Alias for payroll component update payload
    UpdateComponentPayload as UpdatePayrollComponentPayload,
  
    // Loans
    Loan,
    CreateLoanPayload,
    PreviewEMIPayload,
    CloseLoanPayload,
    RecordManualPaymentPayload,
    EMI,
    MarkEMIAsPaidPayload,
  
    // Payslips
    Payslip,
  
    // Reports
    StatutoryChallanPayload,
    PayrollRegisterPayload,
  
    // Tax Declarations
    DeclarationType,
    CreateDeclarationTypePayload,
    UpdateDeclarationTypePayload,
    TaxDeclaration,
    CreateDeclarationPayload,
    UpdateDeclarationPayload,
    VerifyDeclarationPayload,
  } from '@b2b/shared-types';
  
  import { axiosInstance } from './axios-instance';
  import { idempotentPost, idempotentPut, idempotentDelete, idempotentPatch } from './idempotency';
  
  const getBaseHeaders = (companyId: string, deviceId: string, accessToken: string) => ({
    'X-Company-ID': companyId,
    'X-Device-ID': deviceId,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  });
  
  // ============ Bank Details ============
  
  export const createBankDetails = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateBankDetailPayload
  ): Promise<ApiResponse<BankDetail>> => {
    const url = `/companies/${companyId}/payroll/bank-details/users/${userId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<BankDetail>>(url, payload, 'createBankDetails', { headers });
  };
  
  export const listBankDetails = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<BankDetail[]>> => {
    const url = `/companies/${companyId}/payroll/bank-details/users/${userId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const getActiveBankDetails = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    asOf?: string
  ): Promise<ApiResponse<BankDetail>> => {
    const url = `/companies/${companyId}/payroll/bank-details/users/${userId}/active`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params: { as_of: asOf } });
    return response.data;
  };
  
  export const updateBankDetails = async (
    companyId: string,
    bankDetailId: string,
    deviceId: string,
    accessToken: string,
    payload: UpdateBankDetailPayload
  ): Promise<ApiResponse<BankDetail>> => {
    const url = `/companies/${companyId}/payroll/bank-details/${bankDetailId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<BankDetail>>(url, payload, 'updateBankDetails', { headers });
  };
  
  export const activateBankDetails = async (
    companyId: string,
    bankDetailId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<BankDetail>> => {
    const url = `/companies/${companyId}/payroll/bank-details/${bankDetailId}/activate`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<BankDetail>>(url, {}, 'activateBankDetails', { headers });
  };
  
  export const deactivateBankDetails = async (
    companyId: string,
    bankDetailId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/bank-details/${bankDetailId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'deactivateBankDetails', { headers });
  };
  
  // ============ Locks ============
  
  export const listLocks = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { from?: string; to?: string }
  ): Promise<ApiResponse<PayrollLock[]>> => {
    const url = `/companies/${companyId}/payroll/locks`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const createLock = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: { period_start: string; period_end: string; reason: string }
  ): Promise<ApiResponse<PayrollLock>> => {
    const url = `/companies/${companyId}/payroll/locks`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<PayrollLock>>(url, payload, 'createLock', { headers });
  };
  
  export const deleteLock = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    start: string,
    end: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/locks`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(
      url,
      {},
      'deleteLock',
      { headers, params: { start, end } }
    );
  };
  
  // ============ Adjustments ============
  
  export const listAdjustments = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: {
      user_id?: string;
      component_code?: string;
      adjustment_type?: string;
      from_month?: string;
      to_month?: string;
    }
  ): Promise<ApiResponse<Adjustment[]>> => {
    const url = `/companies/${companyId}/payroll/adjustments`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const createAdjustment = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateAdjustmentPayload
  ): Promise<ApiResponse<Adjustment>> => {
    const url = `/companies/${companyId}/payroll/adjustments`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<Adjustment>>(url, payload, 'createAdjustment', { headers });
  };
  
  export const bulkCreateAdjustments = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateAdjustmentPayload[]
  ): Promise<ApiResponse<Adjustment[]>> => {
    const url = `/companies/${companyId}/payroll/adjustments/bulk`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<Adjustment[]>>(url, payload, 'bulkCreateAdjustments', { headers });
  };
  
  export const getAdjustment = async (
    companyId: string,
    adjustmentId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<Adjustment>> => {
    const url = `/companies/${companyId}/payroll/adjustments/${adjustmentId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const updateAdjustment = async (
    companyId: string,
    adjustmentId: string,
    deviceId: string,
    accessToken: string,
    payload: UpdateAdjustmentPayload
  ): Promise<ApiResponse<Adjustment>> => {
    const url = `/companies/${companyId}/payroll/adjustments/${adjustmentId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<Adjustment>>(url, payload, 'updateAdjustment', { headers });
  };
  
  export const deleteAdjustment = async (
    companyId: string,
    adjustmentId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/adjustments/${adjustmentId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'deleteAdjustment', { headers });
  };
  
  // ============ Salary Structures ============
  
  export const listStructures = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { include_inactive?: boolean }
  ): Promise<ApiResponse<SalaryStructure[]>> => {
    const url = `/companies/${companyId}/payroll/structures`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const createStructure = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateStructurePayload
  ): Promise<ApiResponse<SalaryStructure>> => {
    const url = `/companies/${companyId}/payroll/structures`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<SalaryStructure>>(url, payload, 'createStructure', { headers });
  };
  
  export const getStructure = async (
    companyId: string,
    structureId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<SalaryStructure>> => {
    const url = `/companies/${companyId}/payroll/structures/${structureId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const updateStructure = async (
    companyId: string,
    structureId: string,
    deviceId: string,
    accessToken: string,
    payload: UpdateStructurePayload
  ): Promise<ApiResponse<SalaryStructure>> => {
    const url = `/companies/${companyId}/payroll/structures/${structureId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<SalaryStructure>>(url, payload, 'updateStructure', { headers });
  };
  
  export const cloneStructure = async (
    companyId: string,
    structureId: string,
    deviceId: string,
    accessToken: string,
    payload: { effective_from: string }
  ): Promise<ApiResponse<SalaryStructure>> => {
    const url = `/companies/${companyId}/payroll/structures/${structureId}/clone`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<SalaryStructure>>(url, payload, 'cloneStructure', { headers });
  };
  
  export const publishStructure = async (
    companyId: string,
    structureId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<SalaryStructure>> => {
    const url = `/companies/${companyId}/payroll/structures/${structureId}/publish`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<SalaryStructure>>(url, {}, 'publishStructure', { headers });
  };
  
  export const deactivateStructure = async (
    companyId: string,
    structureId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/structures/${structureId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'deactivateStructure', { headers });
  };
  
  export const addComponentToStructure = async (
    companyId: string,
    structureId: string,
    deviceId: string,
    accessToken: string,
    payload: AddComponentPayload
  ): Promise<ApiResponse<StructureComponent>> => {
    const url = `/companies/${companyId}/payroll/structures/${structureId}/components`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<StructureComponent>>(url, payload, 'addComponentToStructure', { headers });
  };
  
  export const reorderComponents = async (
    companyId: string,
    structureId: string,
    deviceId: string,
    accessToken: string,
    payload: ReorderComponentsPayload
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/structures/${structureId}/components/reorder`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<{ message: string }>>(url, payload, 'reorderComponents', { headers });
  };
  
  export const updateComponentInStructure = async (
    companyId: string,
    structureId: string,
    componentCode: string,
    deviceId: string,
    accessToken: string,
    payload: UpdateStructureComponentPayload   // ← alias used here
  ): Promise<ApiResponse<StructureComponent>> => {
    const url = `/companies/${companyId}/payroll/structures/${structureId}/components/${componentCode}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<StructureComponent>>(url, payload, 'updateComponentInStructure', { headers });
  };
  
  export const removeComponentFromStructure = async (
    companyId: string,
    structureId: string,
    componentCode: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/structures/${structureId}/components/${componentCode}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'removeComponentFromStructure', { headers });
  };
  
  export const assignStructureToEmployee = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: AssignStructurePayload
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/structures/assign`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<{ message: string }>>(url, payload, 'assignStructureToEmployee', { headers });
  };
  
  export const bulkAssignStructureToEmployees = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: BulkAssignStructurePayload
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/structures/assign/bulk`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<{ message: string }>>(url, payload, 'bulkAssignStructureToEmployees', { headers });
  };
  
  // ============ Statutory Profiles ============
  
  // Component Definitions
  export const listComponentDefinitions = async (
    companyId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<ComponentDefinition[]>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/components`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const createComponentDefinition = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateComponentDefinitionPayload
  ): Promise<ApiResponse<ComponentDefinition>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/components`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<ComponentDefinition>>(url, payload, 'createComponentDefinition', { headers });
  };
  
  export const updateComponentDefinition = async (
    companyId: string,
    statutoryCode: string,
    deviceId: string,
    accessToken: string,
    payload: UpdateComponentDefinitionPayload
  ): Promise<ApiResponse<ComponentDefinition>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/components/${statutoryCode}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<ComponentDefinition>>(url, payload, 'updateComponentDefinition', { headers });
  };
  
  export const deleteComponentDefinition = async (
    companyId: string,
    statutoryCode: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/components/${statutoryCode}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'deleteComponentDefinition', { headers });
  };
  
  // Rule Sets
  export const listRuleSets = async (
    companyId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<RuleSet[]>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const createRuleSet = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateRuleSetPayload
  ): Promise<ApiResponse<RuleSet>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<RuleSet>>(url, payload, 'createRuleSet', { headers });
  };
  
  export const updateRuleSet = async (
    companyId: string,
    ruleSetId: string,
    deviceId: string,
    accessToken: string,
    payload: UpdateRuleSetPayload
  ): Promise<ApiResponse<RuleSet>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<RuleSet>>(url, payload, 'updateRuleSet', { headers });
  };
  
  export const activateRuleSet = async (
    companyId: string,
    ruleSetId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<RuleSet>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}/activate`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<RuleSet>>(url, {}, 'activateRuleSet', { headers });
  };
  
  export const deactivateRuleSet = async (
    companyId: string,
    ruleSetId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'deactivateRuleSet', { headers });
  };
  
  // Contribution Rules
  export const createContributionRule = async (
    companyId: string,
    ruleSetId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateContributionRulePayload
  ): Promise<ApiResponse<ContributionRule>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}/contributions`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<ContributionRule>>(url, payload, 'createContributionRule', { headers });
  };
  
  export const listContributionRules = async (
    companyId: string,
    ruleSetId: string,
    deviceId: string,
    accessToken: string,
    params?: { statutory_code?: string }
  ): Promise<ApiResponse<ContributionRule[]>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}/contributions`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const updateContributionRule = async (
    companyId: string,
    ruleSetId: string,
    ruleId: string,
    deviceId: string,
    accessToken: string,
    payload: UpdateContributionRulePayload
  ): Promise<ApiResponse<ContributionRule>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}/contributions/${ruleId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<ContributionRule>>(url, payload, 'updateContributionRule', { headers });
  };
  
  export const deleteContributionRule = async (
    companyId: string,
    ruleSetId: string,
    ruleId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}/contributions/${ruleId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'deleteContributionRule', { headers });
  };
  
  // Tax Slabs
  export const createTaxSlab = async (
    companyId: string,
    ruleSetId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateTaxSlabPayload
  ): Promise<ApiResponse<TaxSlab>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}/slabs`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<TaxSlab>>(url, payload, 'createTaxSlab', { headers });
  };
  
  export const listTaxSlabs = async (
    companyId: string,
    ruleSetId: string,
    deviceId: string,
    accessToken: string,
    params?: { statutory_code?: string }
  ): Promise<ApiResponse<TaxSlab[]>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}/slabs`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const updateTaxSlab = async (
    companyId: string,
    ruleSetId: string,
    slabId: string,
    deviceId: string,
    accessToken: string,
    payload: UpdateTaxSlabPayload
  ): Promise<ApiResponse<TaxSlab>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}/slabs/${slabId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<TaxSlab>>(url, payload, 'updateTaxSlab', { headers });
  };
  
  export const deleteTaxSlab = async (
    companyId: string,
    ruleSetId: string,
    slabId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}/slabs/${slabId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'deleteTaxSlab', { headers });
  };
  
  // Deduction Limits
  export const createDeductionLimit = async (
    companyId: string,
    ruleSetId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateDeductionLimitPayload
  ): Promise<ApiResponse<DeductionLimit>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}/limits`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<DeductionLimit>>(url, payload, 'createDeductionLimit', { headers });
  };
  
  export const listDeductionLimits = async (
    companyId: string,
    ruleSetId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<DeductionLimit[]>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}/limits`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const updateDeductionLimit = async (
    companyId: string,
    ruleSetId: string,
    limitId: string,
    deviceId: string,
    accessToken: string,
    payload: UpdateDeductionLimitPayload
  ): Promise<ApiResponse<DeductionLimit>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}/limits/${limitId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<DeductionLimit>>(url, payload, 'updateDeductionLimit', { headers });
  };
  
  export const deleteDeductionLimit = async (
    companyId: string,
    ruleSetId: string,
    limitId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}/limits/${limitId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'deleteDeductionLimit', { headers });
  };
  
  // Component Mappings
  export const createComponentMapping = async (
    companyId: string,
    ruleSetId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateComponentMappingPayload
  ): Promise<ApiResponse<ComponentMapping>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}/mappings`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<ComponentMapping>>(url, payload, 'createComponentMapping', { headers });
  };
  
  export const bulkCreateComponentMappings = async (
    companyId: string,
    ruleSetId: string,
    deviceId: string,
    accessToken: string,
    payload: BulkCreateComponentMappingsPayload
  ): Promise<ApiResponse<ComponentMapping[]>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}/mappings/bulk`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<ComponentMapping[]>>(url, payload, 'bulkCreateComponentMappings', { headers });
  };
  
  export const listComponentMappings = async (
    companyId: string,
    ruleSetId: string,
    deviceId: string,
    accessToken: string,
    params?: { statutory_code?: string }
  ): Promise<ApiResponse<ComponentMapping[]>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}/mappings`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const updateComponentMapping = async (
    companyId: string,
    ruleSetId: string,
    mappingId: string,
    deviceId: string,
    accessToken: string,
    payload: UpdateComponentMappingPayload
  ): Promise<ApiResponse<ComponentMapping>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}/mappings/${mappingId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<ComponentMapping>>(url, payload, 'updateComponentMapping', { headers });
  };
  
  export const deleteComponentMapping = async (
    companyId: string,
    ruleSetId: string,
    mappingId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}/mappings/${mappingId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'deleteComponentMapping', { headers });
  };
  
  // Profiles
  export const listProfiles = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { user_id?: string; statutory_code?: string; active_on?: string }
  ): Promise<ApiResponse<StatutoryProfile[]>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const createProfile = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateProfilePayload
  ): Promise<ApiResponse<StatutoryProfile>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<StatutoryProfile>>(url, payload, 'createProfile', { headers });
  };
  
  export const bulkUpsertProfiles = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: BulkUpsertProfilesPayload
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/bulk`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<{ message: string }>>(url, payload, 'bulkUpsertProfiles', { headers });
  };
  
  export const updateProfile = async (
    companyId: string,
    profileId: string,
    deviceId: string,
    accessToken: string,
    payload: UpdateProfilePayload
  ): Promise<ApiResponse<StatutoryProfile>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/${profileId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<StatutoryProfile>>(url, payload, 'updateProfile', { headers });
  };
  
  export const deactivateProfile = async (
    companyId: string,
    profileId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/statutory-profiles/${profileId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'deactivateProfile', { headers });
  };
  
  // ============ Attendance Rules (Payroll) ============
  
  export const createAttendanceRule = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateAttendanceRulePayload
  ): Promise<ApiResponse<AttendanceRule>> => {
    const url = `/companies/${companyId}/payroll/attendance-rules`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<AttendanceRule>>(url, payload, 'createAttendanceRule', { headers });
  };
  
  export const getAttendanceRules = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { rule_type?: string; is_active?: boolean; page?: number; page_size?: number }
  ): Promise<ApiResponse<AttendanceRule[]>> => {
    const url = `/companies/${companyId}/payroll/attendance-rules`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getActiveAttendanceRules = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { as_of?: string }
  ): Promise<ApiResponse<AttendanceRule[]>> => {
    const url = `/companies/${companyId}/payroll/attendance-rules/active`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const existsActiveRuleOfType = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    ruleType: string
  ): Promise<ApiResponse<{ exists: boolean }>> => {
    const url = `/companies/${companyId}/payroll/attendance-rules/exists-active`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params: { rule_type: ruleType } });
    return response.data;
  };
  
  export const getAttendanceRulesByType = async (
    companyId: string,
    ruleType: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<AttendanceRule[]>> => {
    const url = `/companies/${companyId}/payroll/attendance-rules/types/${ruleType}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const getAttendanceRuleById = async (
    companyId: string,
    ruleId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<AttendanceRule>> => {
    const url = `/companies/${companyId}/payroll/attendance-rules/${ruleId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const updateAttendanceRuleVersion = async (
    companyId: string,
    ruleId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateAttendanceRulePayload
  ): Promise<ApiResponse<AttendanceRule>> => {
    const url = `/companies/${companyId}/payroll/attendance-rules/${ruleId}/versions`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<AttendanceRule>>(url, payload, 'updateAttendanceRuleVersion', { headers });
  };
  
  export const activateAttendanceRule = async (
    companyId: string,
    ruleId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<AttendanceRule>> => {
    const url = `/companies/${companyId}/payroll/attendance-rules/${ruleId}/activate`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<AttendanceRule>>(url, {}, 'activateAttendanceRule', { headers });
  };
  
  export const deactivateAttendanceRule = async (
    companyId: string,
    ruleId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<AttendanceRule>> => {
    const url = `/companies/${companyId}/payroll/attendance-rules/${ruleId}/deactivate`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<AttendanceRule>>(url, {}, 'deactivateAttendanceRule', { headers });
  };
  
  export const bulkDeactivateAttendanceRulesByType = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: BulkDeactivateByTypePayload
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/attendance-rules/bulk-deactivate-by-type`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<{ message: string }>>(url, payload, 'bulkDeactivateAttendanceRulesByType', { headers });
  };
  
  // ============ Fines ============
  
  export const createFine = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateFinePayload
  ): Promise<ApiResponse<Fine>> => {
    const url = `/companies/${companyId}/payroll/fines`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<Fine>>(url, payload, 'createFine', { headers });
  };
  
  export const listFines = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { user_id?: string; is_processed?: boolean; from_date?: string; to_date?: string }
  ): Promise<ApiResponse<Fine[]>> => {
    const url = `/companies/${companyId}/payroll/fines`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getCompanyFineSummary = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { from_date?: string; to_date?: string }
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/payroll/fines/summary`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const bulkCreateFines = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: BulkCreateFinesPayload
  ): Promise<ApiResponse<Fine[]>> => {
    const url = `/companies/${companyId}/payroll/fines/bulk`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<Fine[]>>(url, payload, 'bulkCreateFines', { headers });
  };
  
  export const lockFinesForPayrollRun = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: LockFinesForPayrollRunPayload
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/fines/lock-for-payroll-run`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<{ message: string }>>(url, payload, 'lockFinesForPayrollRun', { headers });
  };
  
  export const getFineById = async (
    companyId: string,
    fineId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<Fine>> => {
    const url = `/companies/${companyId}/payroll/fines/${fineId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const updateFine = async (
    companyId: string,
    fineId: string,
    deviceId: string,
    accessToken: string,
    payload: UpdateFinePayload
  ): Promise<ApiResponse<Fine>> => {
    const url = `/companies/${companyId}/payroll/fines/${fineId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<Fine>>(url, payload, 'updateFine', { headers });
  };
  
  export const deleteFine = async (
    companyId: string,
    fineId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/fines/${fineId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'deleteFine', { headers });
  };
  
  export const markFineAsProcessed = async (
    companyId: string,
    fineId: string,
    deviceId: string,
    accessToken: string,
    payload: MarkFineAsProcessedPayload
  ): Promise<ApiResponse<Fine>> => {
    const url = `/companies/${companyId}/payroll/fines/${fineId}/process`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<Fine>>(url, payload, 'markFineAsProcessed', { headers });
  };
  
  export const bulkDeleteUnprocessedFines = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: BulkDeleteUnprocessedPayload
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/fines/bulk/unprocessed`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, payload, 'bulkDeleteUnprocessedFines', { headers });
  };
  
  export const getEmployeeUnprocessedFines = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    params?: { from_date?: string; to_date?: string }
  ): Promise<ApiResponse<Fine[]>> => {
    const url = `/companies/${companyId}/payroll/fines/employee/${userId}/unprocessed`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getFineSummaryByEmployee = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    params?: { from_date?: string; to_date?: string }
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/payroll/fines/employee/${userId}/summary`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  // ============ Employee Payroll ============
  
  export const getEmployeeSalary = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    params?: { as_of?: string }
  ): Promise<ApiResponse<EmployeeSalary>> => {
    const url = `/companies/${companyId}/payroll/employee/${userId}/salary`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getSalarySnapshot = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    params?: { as_of?: string }
  ): Promise<ApiResponse<SalarySnapshot>> => {
    const url = `/companies/${companyId}/payroll/employee/${userId}/salary/snapshot`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const previewEarnings = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    payload: PreviewEarningsPayload
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/payroll/employee/${userId}/earnings/preview`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<any>>(url, payload, 'previewEarnings', { headers });
  };
  
  export const getEmployeeAdjustmentsForPeriod = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    params?: { from?: string; to?: string }
  ): Promise<ApiResponse<EmployeeAdjustment[]>> => {
    const url = `/companies/${companyId}/payroll/employee/${userId}/adjustments`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getEmployeeActiveProfiles = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    params?: { asOf?: string }
  ): Promise<ApiResponse<StatutoryProfile[]>> => {
    const url = `/companies/${companyId}/payroll/employee/${userId}/statutory-profiles/active`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getActiveProfileByCode = async (
    companyId: string,
    userId: string,
    statutoryCode: string,
    deviceId: string,
    accessToken: string,
    params?: { asOf?: string }
  ): Promise<ApiResponse<StatutoryProfile>> => {
    const url = `/companies/${companyId}/payroll/employee/${userId}/statutory-profiles/${statutoryCode}/active`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getProfileHistory = async (
    companyId: string,
    userId: string,
    statutoryCode: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<StatutoryProfile[]>> => {
    const url = `/companies/${companyId}/payroll/employee/${userId}/statutory-profiles/${statutoryCode}/history`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const changeTaxRegime = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    payload: ChangeTaxRegimePayload
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/employee/${userId}/tax-regime`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<{ message: string }>>(url, payload, 'changeTaxRegime', { headers });
  };
  
  export const getEmployeePayrollHistory = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    params?: { from?: string; to?: string }
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/payroll/employee/${userId}/history`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getEmployeeYTD = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    params?: { financial_year_start?: string }
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/payroll/employee/${userId}/ytd`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getEmployeeStatutorySummary = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    params?: { financial_year_start?: string }
  ): Promise<ApiResponse<EmployeeStatutorySummary>> => {
    const url = `/companies/${companyId}/payroll/employee/${userId}/statutory-summary`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  // ============ Payroll Runs ============
  
  export const listRuns = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { status?: string; period_start?: string; period_end?: string; page?: number; page_size?: number }
  ): Promise<ApiResponse<PayrollRun[]>> => {
    const url = `/companies/${companyId}/payroll/runs`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getRunSummary = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { period_start?: string; period_end?: string }
  ): Promise<ApiResponse<RunSummary>> => {
    const url = `/companies/${companyId}/payroll/runs/summary`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const createRun = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateRunPayload
  ): Promise<ApiResponse<PayrollRun>> => {
    const url = `/companies/${companyId}/payroll/runs`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<PayrollRun>>(url, payload, 'createRun', { headers });
  };
  
  export const getRunExecutionStatus = async (
    companyId: string,
    runId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<PayrollRun>> => {
    const url = `/companies/${companyId}/payroll/runs/${runId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const getRunLedgerSummary = async (
    companyId: string,
    runId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<RunLedgerSummary>> => {
    const url = `/companies/${companyId}/payroll/runs/${runId}/ledger-summary`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const getRunExecutionStatusAlt = async (
    companyId: string,
    runId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/payroll/runs/${runId}/execution-status`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const listEmployeesInRun = async (
    companyId: string,
    runId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/payroll/runs/${runId}/employees`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const getRunStatutorySummary = async (
    companyId: string,
    runId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<RunStatutorySummary>> => {
    const url = `/companies/${companyId}/payroll/runs/${runId}/statutory-summary`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const exportRunToCSV = async (
    companyId: string,
    runId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/payroll/runs/${runId}/export`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const initializeRun = async (
    companyId: string,
    runId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<PayrollRun>> => {
    const url = `/companies/${companyId}/payroll/runs/${runId}/initialize`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<PayrollRun>>(url, {}, 'initializeRun', { headers });
  };
  
  export const executeRun = async (
    companyId: string,
    runId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<PayrollRun>> => {
    const url = `/companies/${companyId}/payroll/runs/${runId}/execute`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<PayrollRun>>(url, {}, 'executeRun', { headers });
  };
  
  export const approveRun = async (
    companyId: string,
    runId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<PayrollRun>> => {
    const url = `/companies/${companyId}/payroll/runs/${runId}/approve`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<PayrollRun>>(url, {}, 'approveRun', { headers });
  };
  
  export const markRunAsPaid = async (
    companyId: string,
    runId: string,
    deviceId: string,
    accessToken: string,
    payload: MarkRunAsPaidPayload
  ): Promise<ApiResponse<PayrollRun>> => {
    const url = `/companies/${companyId}/payroll/runs/${runId}/mark-paid`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<PayrollRun>>(url, payload, 'markRunAsPaid', { headers });
  };
  
  export const cancelRun = async (
    companyId: string,
    runId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<PayrollRun>> => {
    const url = `/companies/${companyId}/payroll/runs/${runId}/cancel`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<PayrollRun>>(url, {}, 'cancelRun', { headers });
  };
  
  export const reprocessEmployeeInRun = async (
    companyId: string,
    runId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    payload: ReprocessEmployeePayload
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/payroll/runs/${runId}/employees/${userId}/reprocess`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<any>>(url, payload, 'reprocessEmployeeInRun', { headers });
  };
  
  export const generateBankFile = async (
    companyId: string,
    runId: string,
    deviceId: string,
    accessToken: string,
    params?: { format?: string }
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/payroll/runs/${runId}/bank-export`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  // ============ Payroll Components ============
  
  export const listComponents = async (
    companyId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<PayrollComponent[]>> => {
    const url = `/companies/${companyId}/payroll/components`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const getDefaultComponent = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { purpose?: string }
  ): Promise<ApiResponse<PayrollComponent>> => {
    const url = `/companies/${companyId}/payroll/components/default`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const clearComponentCache = async (
    companyId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/components/clear-cache`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<{ message: string }>>(url, {}, 'clearComponentCache', { headers });
  };
  
  export const getComponent = async (
    companyId: string,
    componentCode: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<PayrollComponent>> => {
    const url = `/companies/${companyId}/payroll/components/${componentCode}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  // ============ Component Management ============
  
  export const listComponentsManagement = async (
    companyId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<PayrollComponent[]>> => {
    const url = `/companies/${companyId}/payroll/component-management`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const createComponentManagement = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateComponentPayload
  ): Promise<ApiResponse<PayrollComponent>> => {
    const url = `/companies/${companyId}/payroll/component-management`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<PayrollComponent>>(url, payload, 'createComponentManagement', { headers });
  };
  
  export const updateComponentManagement = async (
    companyId: string,
    componentCode: string,
    deviceId: string,
    accessToken: string,
    payload: UpdatePayrollComponentPayload   // ← alias used here
  ): Promise<ApiResponse<PayrollComponent>> => {
    const url = `/companies/${companyId}/payroll/component-management/${componentCode}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<PayrollComponent>>(url, payload, 'updateComponentManagement', { headers });
  };
  
  export const deactivateComponent = async (
    companyId: string,
    componentCode: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/component-management/${componentCode}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentDelete<ApiResponse<{ message: string }>>(url, {}, 'deactivateComponent', { headers });
  };
  
  // ============ Loans ============
  
  export const createLoan = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateLoanPayload
  ): Promise<ApiResponse<Loan>> => {
    const url = `/companies/${companyId}/payroll/loans`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<Loan>>(url, payload, 'createLoan', { headers });
  };
  
  export const previewEMI = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: PreviewEMIPayload
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/payroll/loans/preview-emi`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<any>>(url, payload, 'previewEMI', { headers });
  };
  
  export const listUserLoans = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    params?: { includeClosed?: boolean }
  ): Promise<ApiResponse<Loan[]>> => {
    const url = `/companies/${companyId}/payroll/loans/user/${userId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getLoan = async (
    companyId: string,
    loanId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<Loan>> => {
    const url = `/companies/${companyId}/payroll/loans/${loanId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const getPendingEMIsForLoan = async (
    companyId: string,
    loanId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<EMI[]>> => {
    const url = `/companies/${companyId}/payroll/loans/${loanId}/pending-emis`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const closeLoan = async (
    companyId: string,
    loanId: string,
    deviceId: string,
    accessToken: string,
    payload: CloseLoanPayload
  ): Promise<ApiResponse<Loan>> => {
    const url = `/companies/${companyId}/payroll/loans/${loanId}/close`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<Loan>>(url, payload, 'closeLoan', { headers });
  };
  
  export const recordManualPayment = async (
    companyId: string,
    loanId: string,
    deviceId: string,
    accessToken: string,
    payload: RecordManualPaymentPayload
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/loans/${loanId}/manual-payment`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<{ message: string }>>(url, payload, 'recordManualPayment', { headers });
  };
  
  export const listLoanPayments = async (
    companyId: string,
    loanId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/payroll/loans/${loanId}/payments`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const getPendingEMIsForPayrollRun = async (
    companyId: string,
    runId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<EMI[]>> => {
    const url = `/companies/${companyId}/payroll/runs/${runId}/pending-emis`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const markEMIAsPaid = async (
    companyId: string,
    emiId: string,
    deviceId: string,
    accessToken: string,
    payload: MarkEMIAsPaidPayload
  ): Promise<ApiResponse<EMI>> => {
    const url = `/companies/${companyId}/payroll/emis/${emiId}/paid`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<EMI>>(url, payload, 'markEMIAsPaid', { headers });
  };
  
  // ============ Payslips ============
  
  export const generatePayslipsForRun = async (
    companyId: string,
    runId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/payslips/runs/${runId}/generate`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<{ message: string }>>(url, {}, 'generatePayslipsForRun', { headers });
  };
  
  export const downloadPayslip = async (
    companyId: string,
    runId: string,
    userId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/payroll/payslips/runs/${runId}/users/${userId}/download`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const sendPayslipEmail = async (
    companyId: string,
    runId: string,
    userId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const url = `/companies/${companyId}/payroll/payslips/runs/${runId}/users/${userId}/send-email`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<{ message: string }>>(url, {}, 'sendPayslipEmail', { headers });
  };
  
  export const listUserPayslips = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    params?: { from?: string; to?: string }
  ): Promise<ApiResponse<Payslip[]>> => {
    const url = `/companies/${companyId}/payroll/payslips/users/${userId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  // ============ Reports ============
  
  export const generateStatutoryChallan = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: StatutoryChallanPayload
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/payroll/reports/statutory-challan`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<any>>(url, payload, 'generateStatutoryChallan', { headers });
  };
  
  export const generatePayrollRegister = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: PayrollRegisterPayload
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/payroll/reports/payroll-register`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<any>>(url, payload, 'generatePayrollRegister', { headers });
  };
  
  // ============ Tax Declarations ============
  
  export const createDeclarationType = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateDeclarationTypePayload
  ): Promise<ApiResponse<DeclarationType>> => {
    const url = `/companies/${companyId}/payroll/tax-declarations/types`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<DeclarationType>>(url, payload, 'createDeclarationType', { headers });
  };
  
  export const updateDeclarationType = async (
    companyId: string,
    typeCode: string,
    deviceId: string,
    accessToken: string,
    payload: UpdateDeclarationTypePayload
  ): Promise<ApiResponse<DeclarationType>> => {
    const url = `/companies/${companyId}/payroll/tax-declarations/types/${typeCode}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<DeclarationType>>(url, payload, 'updateDeclarationType', { headers });
  };
  
  export const listDeclarationTypes = async (
    companyId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<DeclarationType[]>> => {
    const url = `/companies/${companyId}/payroll/tax-declarations/types`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const getDeclarationType = async (
    companyId: string,
    typeCode: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<DeclarationType>> => {
    const url = `/companies/${companyId}/payroll/tax-declarations/types/${typeCode}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };
  
  export const createDeclaration = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    payload: CreateDeclarationPayload
  ): Promise<ApiResponse<TaxDeclaration>> => {
    const url = `/companies/${companyId}/payroll/tax-declarations/declarations`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<TaxDeclaration>>(url, payload, 'createDeclaration', { headers });
  };
  
  export const updateDeclaration = async (
    companyId: string,
    declarationId: string,
    deviceId: string,
    accessToken: string,
    payload: UpdateDeclarationPayload
  ): Promise<ApiResponse<TaxDeclaration>> => {
    const url = `/companies/${companyId}/payroll/tax-declarations/declarations/${declarationId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPut<ApiResponse<TaxDeclaration>>(url, payload, 'updateDeclaration', { headers });
  };
  
  export const verifyDeclaration = async (
    companyId: string,
    declarationId: string,
    deviceId: string,
    accessToken: string,
    payload: VerifyDeclarationPayload
  ): Promise<ApiResponse<TaxDeclaration>> => {
    const url = `/companies/${companyId}/payroll/tax-declarations/declarations/${declarationId}/verify`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    return idempotentPost<ApiResponse<TaxDeclaration>>(url, payload, 'verifyDeclaration', { headers });
  };
  
  export const listDeclarationsByUser = async (
    companyId: string,
    userId: string,
    deviceId: string,
    accessToken: string,
    params?: { financial_year?: string }
  ): Promise<ApiResponse<TaxDeclaration[]>> => {
    const url = `/companies/${companyId}/payroll/tax-declarations/declarations/user/${userId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const listDeclarationsByFinancialYear = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { financial_year?: string; status?: string }
  ): Promise<ApiResponse<TaxDeclaration[]>> => {
    const url = `/companies/${companyId}/payroll/tax-declarations/declarations`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getTotalDeclaredAmount = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { financial_year?: string; only_verified?: boolean }
  ): Promise<ApiResponse<{ total: number }>> => {
    const url = `/companies/${companyId}/payroll/tax-declarations/declarations/total`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  // ============ Payroll Trends ============
  
  export const getCompanyPayrollTrend = async (
    companyId: string,
    deviceId: string,
    accessToken: string,
    params?: { from?: string; to?: string }
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/payroll/trend`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getComponentBreakdownTrend = async (
    companyId: string,
    componentCode: string,
    deviceId: string,
    accessToken: string,
    params?: { from?: string; to?: string }
  ): Promise<ApiResponse<any>> => {
    const url = `/companies/${companyId}/payroll/components/${componentCode}/trend`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers, params });
    return response.data;
  };
  
  export const getEmployeePayslip = async (
    companyId: string,
    payrollItemId: string,
    deviceId: string,
    accessToken: string
  ): Promise<ApiResponse<Payslip>> => {
    const url = `/companies/${companyId}/payroll/payslip/${payrollItemId}`;
    const headers = getBaseHeaders(companyId, deviceId, accessToken);
    const response = await axiosInstance.get(url, { headers });
    return response.data;
  };