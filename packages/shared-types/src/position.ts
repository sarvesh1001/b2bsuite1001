// packages/shared-types/src/position.ts

/**
 * A position is a "seat": one headcount slot at one location, holding
 * one job.
 *
 * The *definition* of the role ("Cashier", "Line Operator") lives on the
 * `jobs` catalog (see ./job.ts). This file models the seat itself:
 *   • which job it implements      (job_id)
 *   • which site it belongs to     (location_id)
 *   • an optional title override   (title_override)
 *   • its work center for attendance (work_center_code)
 */
export interface Position {
  position_id: string;
  company_id: string;
  department_id: string;

  /** Job definition this seat implements. */
  job_id: string;

  /** Site this seat belongs to. NULL = company-wide seat. */
  location_id?: string | null;

  /** Seat-specific title override; NULL → use jobs.job_title. */
  title_override?: string | null;

  is_open: boolean;

  /** Sub-area within the location (attendance routing). */
  work_center_code?: string | null;

  created_at: string;
  updated_at: string;

  // ==================================================
  // Joined fields — present on list/get responses.
  // ==================================================

  /** Job code, e.g. "CASHIER". */
  job_code?: string;
  /** Job title, e.g. "Cashier". */
  job_title?: string;

  /**
   * Display title: `title_override ?? job_title`.
   * Use this for UI. Do NOT read `title` — it no longer exists.
   */
  effective_title?: string;

  department_name?: string | null;
  location_name?: string | null;
  work_center_name?: string | null;

  // ==================================================
  // Copied from the job (read-only, echoed for
  // convenience on PositionView responses).
  // ==================================================
  is_schedulable?: boolean;
  attendance_required?: boolean;
  overtime_allowed?: boolean;
}

/**
 * POST /companies/{cid}/positions
 *
 * Note the two shape changes vs. the old payload:
 *   • `title` is gone.
 *   • `job_id` is now REQUIRED.
 *   • `location_id` and `title_override` are new.
 */
export interface CreatePositionPayload {
  department_id: string;
  /** Required. Look up via GET /companies/{cid}/jobs?active_only=true. */
  job_id: string;
  location_id?: string;
  /** Optional — falls back to the job's title when omitted. */
  title_override?: string;
  is_open?: boolean;
  work_center_code?: string;
}

/**
 * PATCH /companies/{cid}/positions/{positionID}
 * All fields optional. Send only what changes.
 */
export interface UpdatePositionPayload {
  department_id?: string;
  job_id?: string;
  location_id?: string | null;
  title_override?: string | null;
  is_open?: boolean;
  work_center_code?: string | null;
}

export interface ListPositionsParams {
  department_id?: string;
  only_open?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Preflight response from GET /companies/{cid}/jobs/{jid}/positions/count.
 * Useful before showing a "delete job" button.
 */
export interface JobPositionCountResponse {
  job_id: string;
  company_id: string;
  position_count: number;
  /** true → safe to hard-delete; false → the UI should offer "deactivate" instead. */
  deletable: boolean;
  deactivate_hint: boolean;
}