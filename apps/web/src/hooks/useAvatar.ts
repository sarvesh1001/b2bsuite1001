import { useQuery } from '@tanstack/react-query';
import { getUserPrimaryAvatar, getAvatarUrl } from '@b2b/api-client';
import { useUserAuthStore } from '../store/userAuthStore';

export const useAvatar = (userId: string) => {
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const { data: avatar, isLoading, error } = useQuery({
    queryKey: ['avatar', userId],
    queryFn: () =>
      getUserPrimaryAvatar(
        userId,
        deviceId!,   // non‑null assertion – but ensure they exist
        accessToken!,
        companyId!
      ),
    enabled: !!userId && !!accessToken && !!deviceId && !!companyId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const avatarUrl = avatar ? getAvatarUrl(avatar, 'medium') : null;

  return { avatar, avatarUrl, isLoading, error };
};