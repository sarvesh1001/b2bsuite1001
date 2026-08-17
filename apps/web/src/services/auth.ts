import { axiosInstance } from '@b2b/api-client';

/**
 * Refresh the access token using the refresh token.
 * Matches the mobile version.
 */
export const refreshUserAccessToken = async (refreshToken: string) => {
  const response = await axiosInstance.post(
    '/auth/refresh',
    { refresh_token: refreshToken }
  );
  return response;
};

// Also export logoutAllDevices (if not already)
export const logoutAllDevices = async (
  userId: string,
  token: string,
  deviceId: string,
  companyId?: string
): Promise<void> => {
  try {
    await axiosInstance.post(
      '/auth/logout-all',
      { user_id: userId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Device-ID': deviceId,
          ...(companyId ? { 'X-Company-ID': companyId } : {}),
        },
      }
    );
  } catch (error) {
    console.error('Logout all devices failed:', error);
    throw error;
  }
};