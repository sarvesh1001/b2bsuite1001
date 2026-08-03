import { axiosInstance } from '../axios-instance';
import { ApiResponse, Company } from '@b2b/shared-types';

export const getCompanyByEmployeePhone = (phone: string) =>
  axiosInstance.get<ApiResponse<Company>>(
    `/auth/companies/by-employee-phone?phone=${encodeURIComponent(phone)}`
  );