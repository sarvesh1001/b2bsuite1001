// packages/shared-types/src/reminder.ts

// ============================================================
// HR REMINDERS — in-app feed for HR lifecycle events
// ------------------------------------------------------------
// Backs:
//   GET  /companies/{cid}/hr/reminders
//   GET  /companies/{cid}/hr/reminders/count
//   POST /companies/{cid}/hr/reminders/read-all
//   POST /companies/{cid}/hr/reminders/{id}/read
//   POST /companies/{cid}/hr/reminders/{id}/dismiss
//
// Recipient is always the caller (from JWT) — the client never
// passes a user_id.
// ============================================================

export const ReminderType = {
    ProbationT14:       'probation_reminder_t14',
    ProbationT7:        'probation_reminder_t7',
    ProbationT3:        'probation_reminder_t3',
    ProbationOverdue:   'probation_overdue',
    ProbationConfirmed: 'probation_confirmed',
    ProbationFailed:    'probation_failed',
    ProbationExtended:  'probation_extended',
  
    OnHoldExpiring: 'on_hold_expiring',
    OnHoldStarted:  'on_hold_started',
    OnHoldEnded:    'on_hold_ended',
  
    NoticeExpiring: 'notice_expiring',
  } as const;
  export type ReminderType = (typeof ReminderType)[keyof typeof ReminderType];
  
  export const ReminderTypePrefix = {
    Probation: 'probation_',
    OnHold:    'on_hold_',
    Notice:    'notice_',
  } as const;
  
  export type ReminderSeverity = 'info' | 'warning' | 'critical';
  export type ReminderStatus   = 'unread' | 'read' | 'actioned' | 'dismissed';
  export type ReminderActionScreen = 'probation' | 'notice' | 'on_hold' | 'employee';
  
  export interface ReminderActionPayload {
    screen: ReminderActionScreen;
    employee_id?: string;
    employee_profile_id?: string;
    entity_id?: string;
    end_date?: string;
    extra_note?: string;
  }
  
  export interface Reminder {
    reminder_id: string;
    company_id: string;
    recipient_id: string;
    recipient_type: 'hr' | 'manager' | 'admin';
  
    subject_user_id?: string | null;
  
    reminder_type: ReminderType | string;
    severity: ReminderSeverity;
  
    title: string;
    body?: string | null;
  
    action_type?: string | null;
    action_payload?: ReminderActionPayload | null;
  
    metadata?: Record<string, unknown> | null;
  
    status: ReminderStatus;
    read_at?: string | null;
    actioned_at?: string | null;
    dismissed_at?: string | null;
    expires_at?: string | null;
    created_at: string;
  }
  
  export interface ReminderGroup {
    label: string;   // "Today" | "Yesterday" | "This week" | ...
    date: string;    // YYYY-MM-DD
    items: Reminder[];
  }
  
  export interface ReminderFeedPayload {
    unread_count: number;
    groups: ReminderGroup[];
    items: Reminder[];   // flat list, same items
  }
  
  export interface ReminderCountsPayload {
    unread: number;
    by_severity: {
      info?: number;
      warning?: number;
      critical?: number;
    };
  }
  
  export interface ListRemindersParams {
    status?: ReminderStatus;
    severity?: ReminderSeverity;
    type?: ReminderType;
    type_prefix?: string;
    since?: string;    // RFC3339
    page?: number;
    page_size?: number;
  }