import type { User, UserRole } from '@/types';

export const ROLE_HOME: Record<UserRole, string> = {
  ADMIN:  '/dashboard/admin',
  REGION: '/dashboard/region',
  SENTINELLE: '/dashboard/guide',
  GUIDE: '/dashboard/guide',
  GARDIEN: '/dashboard/gardien',
};

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Grand Archiviste',
  REGION: 'Conseil regional',
  SENTINELLE: 'Sentinelle',
  GUIDE: 'Guide',
  GARDIEN: 'Gardien',
};

export const MANAGEMENT_ROLES: UserRole[] = [
  'ADMIN',
  'REGION',
  'SENTINELLE',
  'GUIDE',
];

export function getHomeForRole(role?: UserRole) {
  return role ? ROLE_HOME[role] : '/activation';
}

export function isManagementRole(role?: UserRole) {
  return role ? MANAGEMENT_ROLES.includes(role) : false;
}

export function getTerritoryLabel(user?: User | null) {
  if (!user) return '';
  if (user.role === 'ADMIN') return user.region?.nom ?? 'Tous les territoires';
  if (user.role === 'REGION') return user.region?.nom ?? 'Region';
  if (user.role === 'SENTINELLE') return user.district?.nom ?? 'District';
  if (user.role === 'GUIDE') return user.parish?.nom ?? 'Paroisse';
  return user.parish?.nom ?? 'Paroisse';
}
