// apps/prayantra-b2b/src/store/subscriptionBlockerStore.ts
import { create } from 'zustand';

// Codes the backend returns with HTTP 402 on subscription enforcement.
export type SubscriptionBlockCode =
  | 'subscription_required'    // company is in `pending` — never paid
  | 'subscription_expired'     // past grace period
  | 'subscription_cancelled'   // owner cancelled
  | 'subscription_past_due';   // write attempted while past_due

export interface SubscriptionBlocker {
  code: SubscriptionBlockCode;
  message: string;
  companyId?: string | null;
  /** Full URL of the blocked request — handy for debugging / logging */
  path?: string;
  /** Unix ms when the block was first observed (for dedup) */
  at: number;
}

interface SubscriptionBlockerState {
  blocker: SubscriptionBlocker | null;

  /** Called by the axios interceptor on any 402 with a subscription_* code. */
  setBlocker: (b: Omit<SubscriptionBlocker, 'at'>) => void;

  /** Called when the user leaves the payment screen or pays successfully. */
  clearBlocker: () => void;

  /** Human-friendly title for the current blocker. */
  title: () => string;

  /** Human-friendly subtitle / action prompt. */
  subtitle: () => string;
}

export const useSubscriptionBlockerStore = create<SubscriptionBlockerState>(
  (set, get) => ({
    blocker: null,

    setBlocker: (b) => {
      const prev = get().blocker;
      // Dedup: if the same code + company arrives within 5s, don't re-trigger.
      if (
        prev &&
        prev.code === b.code &&
        prev.companyId === b.companyId &&
        Date.now() - prev.at < 5000
      ) {
        return;
      }
      console.warn('🚧 [Subscription] block detected:', b.code, b.message);
      set({ blocker: { ...b, at: Date.now() } });
    },

    clearBlocker: () => {
      if (get().blocker) {
        console.log('✅ [Subscription] blocker cleared');
      }
      set({ blocker: null });
    },

    title: () => {
      const code = get().blocker?.code;
      switch (code) {
        case 'subscription_required':
          return 'Activate your subscription';
        case 'subscription_expired':
          return 'Your subscription has expired';
        case 'subscription_cancelled':
          return 'Your subscription was cancelled';
        case 'subscription_past_due':
          return 'Your subscription is past due';
        default:
          return 'Subscription required';
      }
    },

    subtitle: () => {
      const code = get().blocker?.code;
      switch (code) {
        case 'subscription_required':
          return 'Choose a plan and complete payment to start using your company’s workspace.';
        case 'subscription_expired':
          return 'Renew your plan to regain full access to all features.';
        case 'subscription_cancelled':
          return 'Reactivate your subscription to resume using your workspace.';
        case 'subscription_past_due':
          return 'Writes are disabled until you settle the outstanding amount. You can still browse.';
        default:
          return 'A valid subscription is required to continue.';
      }
    },
  })
);