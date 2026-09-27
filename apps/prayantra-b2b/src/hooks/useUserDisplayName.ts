// packages/.../src/hooks/useUserDisplayName.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserDisplayName } from '@b2b/api-client';
import { useUserAuthStore } from '../store/userAuthStore';

export interface UserDisplayName {
  username: string;
  full_name: string;
}

interface Options {
  /**
   * Pre-filled values (e.g. from UserSearchModal's PickedUser). When both
   * are present, we seed the cache and skip the network call entirely.
   */
  seed?: { username?: string; full_name?: string };
  /** Skip the request entirely (e.g. row is hidden). */
  enabled?: boolean;
}

export const useUserDisplayName = (
  userId: string | null | undefined,
  opts: Options = {},
) => {
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const queryClient = useQueryClient();

  const seed =
    opts.seed?.username && opts.seed?.full_name
      ? { username: opts.seed.username, full_name: opts.seed.full_name }
      : undefined;

  const enabled =
    (opts.enabled ?? true) &&
    !!userId &&
    !!accessToken &&
    !!deviceId &&
    !!companyId;

  const queryKey = ['userDisplayName', companyId, userId] as const;

  // Seed the cache synchronously the first time we see this user, so
  // the very first render (before the query runs) already has data.
  if (seed && userId && companyId) {
    const existing = queryClient.getQueryData<UserDisplayName>(queryKey);
    if (!existing) {
      queryClient.setQueryData<UserDisplayName>(queryKey, seed);
    }
  }

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () =>
      getUserDisplayName(
        companyId!,
        userId!,
        deviceId!,
        accessToken!,
      ).then((res) => {
        if (!res) throw new Error('User display name not found');
        return {
          username: res.username,
          full_name: res.full_name,
        } satisfies UserDisplayName;
      }),
    // Skip the network call when we already seeded both fields.
    enabled: enabled && !seed,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Whichever we have — seed, live data, or neither.
  const merged: UserDisplayName | null =
    data ?? (seed as UserDisplayName | undefined) ?? null;

  return {
    data: merged,
    isLoading: !seed && isLoading,
    error,
  };
};

/** Call on logout / company switch to avoid cross-tenant leakage. */
export const clearUserDisplayNameCache = (queryClient: {
  removeQueries: (filters: { queryKey: readonly unknown[] }) => void;
}) => {
  queryClient.removeQueries({ queryKey: ['userDisplayName'] });
};