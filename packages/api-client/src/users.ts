// packages/api-client/src/users.ts
import { axiosInstance } from './axios-instance';

/**
 * Get the phone number of a specific user within a company.
 */
export const getUserPhone = async (
  companyId: string,
  userId: string,
  deviceId: string,
  accessToken: string,
): Promise<string | undefined> => {
  const url = `/companies/${companyId}/users/${userId}/phone`;
  const headers = {
    'X-Device-ID': deviceId,
    'Authorization': `Bearer ${accessToken}`,
    'X-Company-ID': companyId,
  };
  try {
    const response = await axiosInstance.get<{
      success: boolean;
      data: { phone: string };
    }>(url, { headers });
    return response.data?.data?.phone;
  } catch (error) {
    console.warn(`Failed to fetch phone for user ${userId}`, error);
    return undefined;
  }
};