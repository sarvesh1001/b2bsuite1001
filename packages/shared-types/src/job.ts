// packages/shared-types/src/job.ts

/**
 * A job is a *definition* — "Cashier", "Line Operator", "Senior Cashier".
 * It carries no location and no work center; those live on `positions`
 * (seats). This is the SAP "Job catalog" concept.
 *
 * One job → many seats. Opening a 2nd store does NOT require duplicating
 * "Cashier"; you create one job row and N position rows.
 */
export interface Job {
    job_id: string;
    company_id: string;
    /** Stable key, e.g. "CASHIER". Immutable after creation. */
    job_code: string;
    /** Display title, e.g. "Cashier". */
    job_title: string;
    description?: string | null;
    is_schedulable: boolean;
    attendance_required: boolean;
    overtime_allowed: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }
  
  /**
   * POST /companies/{cid}/jobs
   *
   * `job_code` is optional on the wire — the backend derives it from
   * `job_title` when omitted (uppercase, non-alphanumerics → underscore).
   */
  export interface CreateJobPayload {
    job_code?: string;
    job_title: string;
    description?: string;
    is_schedulable?: boolean;       // default: true
    attendance_required?: boolean;  // default: true
    overtime_allowed?: boolean;     // default: false
  }
  
  /**
   * PATCH /companies/{cid}/jobs/{jid}
   *
   * `job_code` is intentionally NOT updatable. To change it, delete and
   * recreate the job (only allowed when 0 positions reference it).
   */
  export interface UpdateJobPayload {
    job_title?: string;
    description?: string | null;
    is_schedulable?: boolean;
    attendance_required?: boolean;
    overtime_allowed?: boolean;
    is_active?: boolean;
  }
  
  export interface ListJobsParams {
    /** true → hide soft-deleted jobs. Default true on the wire. */
    active_only?: boolean;
  }
  
  /**
   * Response of GET /companies/{cid}/jobs
   * (the list envelope wraps `jobs` + a small meta block).
   */
  export interface ListJobsResponse {
    jobs: Job[];
    meta: {
      company_id: string;
      count: number;
      active_only: boolean;
    };
  }