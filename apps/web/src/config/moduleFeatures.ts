// src/config/moduleFeatures.ts
export const FEATURES_CONFIG: Record<string, Array<{ key: string; label: string; icon: string; path: string }>> = {
    administration: [
      { key: 'workCenters', label: 'Work Centers', icon: 'factory', path: '/administration/work-centers' },
      { key: 'departments', label: 'Departments', icon: 'office-building', path: '/administration/departments' },
      { key: 'roles', label: 'Roles', icon: 'account-key', path: '/administration/roles' },
      { key: 'positions', label: 'Positions', icon: 'badge-account', path: '/administration/positions' },
      { key: 'employees', label: 'Employees', icon: 'account-multiple', path: '/administration/employees' },
      { key: 'employeeSearch', label: 'Employee Search', icon: 'account-search', path: '/administration/employees/search' },
      { key: 'avatars', label: 'My Avatars', icon: 'account-circle', path: '/administration/avatar-management' },
      { key: 'userPhone', label: 'User Phone', icon: 'phone', path: '/administration/user-phone' },
    ],
    // other modules can be added later
  };