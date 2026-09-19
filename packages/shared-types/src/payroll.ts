export interface BankDetail {
    id: string;
    company_id: string;
    user_id: string;
    bank_name: string;
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    bank_branch?: string;
    is_active: boolean;
    effective_from: string;
    effective_to?: string | null;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateBankDetailPayload {
    bank_name: string;
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    bank_branch?: string;
    is_active?: boolean;
    effective_from: string;
  }
  
  export interface UpdateBankDetailPayload {
    bank_name?: string;
    account_holder_name?: string;
    account_number?: string;
    ifsc_code?: string;
    bank_branch?: string;
    is_active?: boolean;
  }


  // ===================== Payroll Common Types =====================

export interface PayrollLock {
    id: string;
    company_id: string;
    period_start: string;   // ISO datetime
    period_end: string;     // ISO datetime
    reason: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface Adjustment {
    id: string;
    company_id: string;
    user_id: string;
    component_code: string;
    amount: number;
    adjustment_type: string; // e.g., "bonus", "deduction"
    reason?: string;
    applicable_month: string; // YYYY-MM
    is_locked?: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateAdjustmentPayload {
    user_id: string;
    component_code: string;
    amount: number;
    adjustment_type: string;
    reason?: string;
    applicable_month: string;
  }
  
  export interface UpdateAdjustmentPayload {
    amount?: number;
    reason?: string;
  }
  
  export interface SalaryStructure {
    id: string;
    company_id: string;
    structure_name: string;
    currency_code: string;
    is_published: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateStructurePayload {
    structure_name: string;
    currency_code: string;
  }
  
  export interface UpdateStructurePayload {
    structure_name?: string;
    currency_code?: string;
  }
  
  export interface StructureComponent {
    component_code: string;
    calculation_type: 'percentage' | 'fixed';
    value: number;
    sequence_order: number;
  }
  
  export interface AddComponentPayload {
    component_code: string;
    calculation_type: 'percentage' | 'fixed';
    value: number;
    sequence_order?: number;
  }
  
  export interface ReorderComponentsPayload {
    component_codes: string[];
  }
  
  export interface UpdateComponentPayload {
    value?: number;
    sequence_order?: number;
  }
  
  export interface AssignStructurePayload {
    user_id: string;
    structure_id: string;
    monthly_ctc: number;
    pay_type: string; // "monthly", "weekly", etc.
    effective_from: string; // ISO datetime
  }
  
  export interface BulkAssignStructurePayload {
    user_ids: string[];
    structure_id: string;
    monthly_ctc: number;
    pay_type: string;
    effective_from: string;
  }
  
  // ===================== Statutory Profiles =====================
  
  export interface ComponentDefinition {
    statutory_code: string;
    description: string;
    country_code: string;
    calculation_basis: string;
    has_employee: boolean;
    has_employer: boolean;
    created_at?: string;
    updated_at?: string;
  }
  
  export interface CreateComponentDefinitionPayload {
    statutory_code: string;
    description: string;
    country_code: string;
    calculation_basis: string;
    has_employee: boolean;
    has_employer: boolean;
  }
  
  export interface UpdateComponentDefinitionPayload {
    description?: string;
    country_code?: string;
    calculation_basis?: string;
    has_employee?: boolean;
    has_employer?: boolean;
  }
  
  export interface RuleSet {
    id: string;
    company_id: string;
    country_code: string;
    version_label: string;
    effective_from: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateRuleSetPayload {
    country_code: string;
    version_label: string;
    effective_from: string;
  }
  
  export interface UpdateRuleSetPayload {
    version_label?: string;
    effective_from?: string;
    is_active?: boolean;
  }
  
  export interface ContributionRule {
    id: string;
    rule_set_id: string;
    statutory_code: string;
    contribution_side: 'employee' | 'employer';
    calculation_type: 'percentage' | 'fixed';
    rate_value: number;
    wage_ceiling?: number;
    effective_from: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateContributionRulePayload {
    statutory_code: string;
    contribution_side: 'employee' | 'employer';
    calculation_type: 'percentage' | 'fixed';
    rate_value: number;
    wage_ceiling?: number;
    effective_from: string;
  }
  
  export interface UpdateContributionRulePayload {
    statutory_code?: string;
    contribution_side?: 'employee' | 'employer';
    calculation_type?: 'percentage' | 'fixed';
    rate_value?: number;
    wage_ceiling?: number;
    effective_from?: string;
  }
  
  export interface TaxSlab {
    id: string;
    rule_set_id: string;
    statutory_code: string;
    min_amount: number;
    max_amount: number;
    rate: number;
    is_percentage: boolean;
    slab_order: number;
    effective_from: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateTaxSlabPayload {
    statutory_code: string;
    min_amount: number;
    max_amount: number;
    rate: number;
    is_percentage: boolean;
    slab_order: number;
    effective_from: string;
  }
  
  export interface UpdateTaxSlabPayload {
    min_amount?: number;
    max_amount?: number;
    rate?: number;
    is_percentage?: boolean;
    slab_order?: number;
    effective_from?: string;
  }
  
  export interface DeductionLimit {
    id: string;
    rule_set_id: string;
    limit_code: string;
    limit_value: number;
    metadata?: any;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateDeductionLimitPayload {
    limit_code: string;
    limit_value: number;
    metadata?: any;
  }
  
  export interface UpdateDeductionLimitPayload {
    limit_value?: number;
    metadata?: any;
  }
  
  export interface ComponentMapping {
    id: string;
    rule_set_id: string;
    statutory_code: string;
    component_code: string;
    effective_from: string;
    version?: number;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateComponentMappingPayload {
    statutory_code: string;
    component_code: string;
    effective_from: string;
  }
  
  export interface BulkCreateComponentMappingsPayload {
    statutory_code: string;
    component_codes: string[];
    effective_from: string;
  }
  
  export interface UpdateComponentMappingPayload {
    component_code?: string;
    effective_from?: string;
    version?: number;
  }
  
  export interface StatutoryProfile {
    id: string;
    company_id: string;
    user_id: string;
    statutory_code: string;
    opt_in: boolean;
    effective_from: string;
    effective_to?: string | null;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateProfilePayload {
    user_id: string;
    statutory_code: string;
    opt_in: boolean;
    effective_from: string;
  }
  
  export interface UpdateProfilePayload {
    opt_in?: boolean;
    effective_from?: string;
  }
  
  export interface BulkUpsertProfilesPayload {
    profiles: CreateProfilePayload[];
  }
  
  export interface ChangeTaxRegimePayload {
    tax_regime_code: string; // e.g., "OLD", "NEW"
    effective_from: string;
  }
  
  // ===================== Attendance Rules (Payroll) =====================
  
  export interface AttendanceRule {
    id: string;
    company_id: string;
    rule_type: string; // "overtime", "late", "half_day", etc.
    calculation_type: string; // "multiplier", "fixed", "percentage"
    value: number;
    based_on: string; // "hourly", "daily", "monthly"
    threshold_minutes?: number;
    component_code: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateAttendanceRulePayload {
    rule_type: string;
    calculation_type: string;
    value: number;
    based_on: string;
    threshold_minutes?: number;
    component_code: string;
  }
  
  export interface UpdateAttendanceRulePayload {
    rule_type?: string;
    calculation_type?: string;
    value?: number;
    based_on?: string;
    threshold_minutes?: number;
    component_code?: string;
  }
  
  export interface BulkDeactivateByTypePayload {
    rule_type: string;
  }
  
  // ===================== Fines =====================
  
  export interface Fine {
    id: string;
    company_id: string;
    user_id: string;
    fine_amount: number;
    reason: string;
    fine_date: string;
    component_code: string;
    category?: string;
    is_processed: boolean;
    payroll_run_id?: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateFinePayload {
    user_id: string;
    fine_amount: number;
    reason: string;
    fine_date: string;
    component_code: string;
    category?: string;
  }
  
  export interface UpdateFinePayload {
    fine_amount?: number;
    reason?: string;
    fine_date?: string;
    component_code?: string;
    category?: string;
  }
  
  export interface BulkCreateFinesPayload {
    user_ids: string[];
    fine_amount: number;
    reason: string;
    fine_date: string;
    component_code: string;
  }
  
  export interface LockFinesForPayrollRunPayload {
    period_start: string;
    period_end: string;
    payroll_run_id: string;
  }
  
  export interface MarkFineAsProcessedPayload {
    payroll_run_id: string;
  }
  
  export interface BulkDeleteUnprocessedPayload {
    fine_ids: string[];
  }
  
  // ===================== Employee Payroll =====================
  
  export interface EmployeeSalary {
    user_id: string;
    structure_id: string;
    monthly_ctc: number;
    pay_type: string;
    effective_from: string;
    effective_to?: string | null;
    components: Record<string, number>; // component code -> amount
  }
  
  export interface SalarySnapshot {
    // depends on API response, likely includes breakdown
    [key: string]: any;
  }
  
  export interface PreviewEarningsPayload {
    period_start: string;
    period_end: string;
  }
  
  export interface EmployeeAdjustment {
    id: string;
    user_id: string;
    component_code: string;
    amount: number;
    adjustment_type: string;
    reason?: string;
    applicable_month: string;
    // ... other fields
  }
  
  export interface EmployeeStatutorySummary {
    // depends on API
    [key: string]: any;
  }
  
  // ===================== Payroll Runs =====================
  
  export interface PayrollRun {
    id: string;
    company_id: string;
    period_start: string;
    period_end: string;
    status: 'initialized' | 'running' | 'completed' | 'approved' | 'paid' | 'cancelled';
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateRunPayload {
    period_start: string;
    period_end: string;
  }
  
  export interface RunSummary {
    // depends
    total_employees: number;
    total_gross: number;
    total_net: number;
    // etc.
  }
  
  export interface RunLedgerSummary {
    // depends
  }
  
  export interface RunStatutorySummary {
    // depends
  }
  
  export interface ReprocessEmployeePayload {
    reflect_latest_adjustments: boolean;
  }
  
  export interface MarkRunAsPaidPayload {
    paid_at: string;
  }
  
  // ===================== Components =====================
  
  export interface PayrollComponent {
    component_code: string;
    component_type: 'earning' | 'deduction' | 'statutory';
    description: string;
    is_taxable: boolean;
    contribution_side?: 'employee' | 'employer';
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateComponentPayload {
    component_code: string;
    component_type: 'earning' | 'deduction' | 'statutory';
    description: string;
    is_taxable: boolean;
    contribution_side?: 'employee' | 'employer';
  }
  
  export interface UpdateComponentPayload {
    description?: string;
    is_taxable?: boolean;
    is_active?: boolean;
    contribution_side?: 'employee' | 'employer';
  }
  
  // ===================== Loans =====================
  
  export interface Loan {
    id: string;
    company_id: string;
    user_id: string;
    loan_type: string; // "vehicle", "personal", etc.
    principal_amount: number;
    emi_amount: number;
    interest_rate: number;
    interest_type: 'fixed' | 'floating';
    total_emis: number;
    disbursed_at: string;
    first_emi_date: string;
    component_code: string;
    max_ctc_percent: number;
    status: 'active' | 'closed' | 'defaulted';
    closed_at?: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateLoanPayload {
    user_id: string;
    loan_type: string;
    principal_amount: number;
    emi_amount: number;
    interest_rate: number;
    interest_type: 'fixed' | 'floating';
    total_emis: number;
    disbursed_at: string;
    first_emi_date: string;
    component_code: string;
    max_ctc_percent: number;
  }
  
  export interface PreviewEMIPayload {
    user_id: string;
    principal: number;
    total_emis: number;
    interest_rate: number;
    interest_type: 'fixed' | 'floating';
    max_ctc_percent: number;
  }
  
  export interface CloseLoanPayload {
    closure_date: string;
  }
  
  export interface RecordManualPaymentPayload {
    amount: number;
    penalty?: number;
    paid_at: string;
  }
  
  export interface EMI {
    id: string;
    loan_id: string;
    emi_number: number;
    due_date: string;
    amount: number;
    paid: boolean;
    paid_date?: string;
    payroll_run_id?: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface MarkEMIAsPaidPayload {
    paid_date: string;
    payroll_run_id: string;
  }
  
  // ===================== Payslips =====================
  
  export interface Payslip {
    id: string;
    user_id: string;
    payroll_run_id: string;
    generated_at: string;
    // contains earnings, deductions, net pay, etc.
    [key: string]: any;
  }
  
  // ===================== Reports =====================
  
  export interface StatutoryChallanPayload {
    period_start: string;
    period_end: string;
  }
  
  export interface PayrollRegisterPayload {
    period_start: string;
    period_end: string;
    group_by?: string; // "employee", "department", etc.
  }
  
  // ===================== Tax Declarations =====================
  
  export interface DeclarationType {
    type_code: string;
    description: string;
    max_limit: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateDeclarationTypePayload {
    type_code: string;
    description: string;
    max_limit: number;
  }
  
  export interface UpdateDeclarationTypePayload {
    description?: string;
    max_limit?: number;
    is_active?: boolean;
  }
  
  export interface TaxDeclaration {
    id: string;
    company_id: string;
    user_id: string;
    financial_year: string;
    declaration_type: string;
    amount: number;
    supporting_docs?: string[];
    status: 'draft' | 'submitted' | 'verified' | 'rejected';
    verified_at?: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface CreateDeclarationPayload {
    user_id: string;
    financial_year: string;
    declaration_type: string;
    amount: number;
    supporting_docs?: string[];
  }
  
  export interface UpdateDeclarationPayload {
    amount?: number;
    supporting_docs?: string[];
    status?: 'draft' | 'submitted' | 'verified' | 'rejected';
  }
  
  export interface VerifyDeclarationPayload {
    status: 'verified' | 'rejected';
  }