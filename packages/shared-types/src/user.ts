// ============================================================
// User self-service — mirrors PATCH /users/me
// Only username + full_name are writable; everything else on
// employee_profiles is HR-only.
// ============================================================
export interface UpdateMyProfileRequest {
    username?: string;
    full_name?: string;
  }
  
  export interface UpdateMyProfileResponse {
    user_id: string;
    username: string;
    full_name: string;
    updated_at: string;
  }

  // ============================================================
// User display name — GET /companies/{companyID}/users/{userID}/display-name
//
// Minimal read shape: no PII, no state flags, safe to cache
// or fan out to UI components (comment authors, mention
// chips, notification headers, etc.).
// ============================================================
export interface UserDisplayName {
    user_id: string;
    username: string;
    full_name: string;
  }