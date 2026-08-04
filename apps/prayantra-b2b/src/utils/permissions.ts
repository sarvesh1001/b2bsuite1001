import { useUserAuthStore } from '../store/userAuthStore';

export const useModuleAccess = () => {
  const { accessibleModules, permissions } = useUserAuthStore();

  const hasModule = (moduleName: string): boolean => {
    return accessibleModules.includes(moduleName);
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };
  
  return { hasModule, hasPermission, accessibleModules, permissions };
};