import {
    getOrgUnitTypeLabel,
    getOrgUnitTypeIcon,
    getOrgUnitTypeColor,
    getOrgUnitRoleLabel,
    getOrgUnitRoleIcon,
  } from '../../../constants/orgUnit';
  
  export const useOrgUnitLabels = () => ({
    typeLabel: getOrgUnitTypeLabel,
    typeIcon: getOrgUnitTypeIcon,
    typeColor: getOrgUnitTypeColor,
    roleLabel: getOrgUnitRoleLabel,
    roleIcon: getOrgUnitRoleIcon,
  });