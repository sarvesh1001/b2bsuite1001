// apps/prayantra-b2b/src/hooks/useReminders.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listReminders,
  getReminderCounts,
  markReminderRead,
  markAllRemindersRead,
  dismissReminder,
} from '@b2b/api-client';
import type { ListRemindersParams } from '@b2b/shared-types';
import { useUserAuthStore } from '../store/userAuthStore';

// ------------------------------------------------------------------
// Badge — cheap, polled. Location scope comes from the interceptor
// (X-Location-ID header) so no extra filtering is needed here.
// ------------------------------------------------------------------
export const useReminderCounts = (enabled = true) => {
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const ok = enabled && !!accessToken && !!deviceId && !!companyId;

  const { data, refetch } = useQuery({
    queryKey: ['reminderCounts', companyId],
    queryFn: () => getReminderCounts(companyId!, deviceId!, accessToken!),
    enabled: ok,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  return {
    unread: data?.data?.unread ?? 0,
    critical: data?.data?.by_severity?.critical ?? 0,
    refetch,
  };
};

// ------------------------------------------------------------------
// Feed — filters + pagination + mutations
// ------------------------------------------------------------------
export const useReminderFeed = (
  params: ListRemindersParams = {},
  enabled = true,
) => {
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const qc = useQueryClient();
  const ok = enabled && !!accessToken && !!deviceId && !!companyId;

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['reminderFeed', companyId, params],
    queryFn: () => listReminders(companyId!, deviceId!, accessToken!, params),
    enabled: ok,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['reminderFeed'] });
    qc.invalidateQueries({ queryKey: ['reminderCounts'] });
  };

  const markRead = async (id: string) => {
    if (!ok) return;
    qc.setQueriesData({ queryKey: ['reminderFeed'] }, (old: any) =>
      patchFeed(old, id, { status: 'read', read_at: new Date().toISOString() }),
    );
    qc.setQueriesData({ queryKey: ['reminderCounts'] }, (old: any) => {
      if (!old?.data) return old;
      const next = JSON.parse(JSON.stringify(old));
      next.data.unread = Math.max(0, (next.data.unread ?? 1) - 1);
      return next;
    });
    try {
      await markReminderRead(companyId!, id, deviceId!, accessToken!);
    } finally {
      invalidate();
    }
  };

  const markAllRead = async () => {
    if (!ok) return;
    await markAllRemindersRead(companyId!, deviceId!, accessToken!);
    invalidate();
  };

  const dismiss = async (id: string) => {
    if (!ok) return;
    try {
      await dismissReminder(companyId!, id, deviceId!, accessToken!);
    } finally {
      invalidate();
    }
  };

  return {
    groups: data?.data?.groups ?? [],
    items: data?.data?.items ?? [],
    unread: data?.data?.unread_count ?? 0,
    total: (data as any)?.meta?.total_count ?? 0,
    isLoading,
    isFetching,
    error,
    refetch,
    markRead,
    markAllRead,
    dismiss,
  };
};

// ------------------------------------------------------------------
// Cache patcher — walks the grouped + flat shapes
// ------------------------------------------------------------------
function patchFeed(
  old: any,
  id: string,
  delta: Partial<{ status: string; read_at: string }>,
) {
  if (!old?.data) return old;
  const next = JSON.parse(JSON.stringify(old));
  next.data.items = (next.data.items ?? []).map((r: any) =>
    r.reminder_id === id ? { ...r, ...delta } : r,
  );
  next.data.groups = (next.data.groups ?? []).map((g: any) => ({
    ...g,
    items: (g.items ?? []).map((r: any) =>
      r.reminder_id === id ? { ...r, ...delta } : r,
    ),
  }));
  if (delta.status === 'read') {
    next.data.unread_count = Math.max(0, (next.data.unread_count ?? 1) - 1);
  }
  return next;
}