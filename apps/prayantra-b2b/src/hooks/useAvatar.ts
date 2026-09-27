// packages/.../src/hooks/useAvatar.ts
import { useQuery } from '@tanstack/react-query';
import { getUserPrimaryAvatar, getAvatarUrl } from '@b2b/api-client';
import { useUserAuthStore } from '../store/userAuthStore';

const TAG = '[useAvatar]';

export const useAvatar = (userId: string) => {
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const enabled = !!userId && !!accessToken && !!deviceId && !!companyId;

  console.log(TAG, 'render', {
    userId,
    enabled,
    hasToken: !!accessToken,
    hasDevice: !!deviceId,
    hasCompany: !!companyId,
  });

  const { data: avatar, isLoading, isFetching, error, status, fetchStatus } = useQuery({
    queryKey: ['avatar', userId],
    queryFn: async () => {
      console.log(TAG, '→ FETCH START', { userId, companyId, deviceId });
      try {
        const res = await getUserPrimaryAvatar(
          userId,
          deviceId!,
          accessToken!,
          companyId!,
        );
        console.log(TAG, '← FETCH OK', {
          userId,
          raw: JSON.stringify(res).slice(0, 500),
          keys: res ? Object.keys(res) : null,
          avatarId: (res as any)?.avatar_id,
          objectKey: (res as any)?.avatar_object_key,
          mime: (res as any)?.avatar_mime_type,
        });
        return res;
      } catch (e: any) {
        console.error(TAG, '❌ FETCH FAILED', {
          userId,
          status: e?.response?.status,
          url: e?.config?.url,
          message: e?.message,
          data: e?.response?.data,
        });
        throw e;
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Log the URL construction — this is where a lot of things go silently null.
  let avatarUrl: string | null = null;
  if (avatar) {
    try {
      avatarUrl = getAvatarUrl(avatar, 'medium');
      console.log(TAG, 'URL built', { userId, avatarUrl });
    } catch (e) {
      console.error(TAG, '❌ getAvatarUrl threw', { userId, error: e, avatar });
    }
  } else {
    console.log(TAG, 'no avatar object — will render fallback', {
      userId,
      status,
      fetchStatus,
    });
  }

  return { avatar, avatarUrl, isLoading, isFetching, error, enabled };
};