import type { User } from '@/types';
import type { FilterValues } from '../types';

interface FilterUsersOptions {
  parishDistrictMap: Map<string, string>;
  roleAllValue?: string;
}

export function filterUsers(
  users: User[],
  values: FilterValues,
  options: FilterUsersOptions,
): User[] {
  const search = (values.search ?? '').toLowerCase();
  const districtId = values.districtId ?? '';
  const parishId = values.parishId ?? '';
  const role = values.role ?? options.roleAllValue ?? 'TOUS';
  const statut = values.statut ?? '';
  const adhesion = values.adhesion ?? '';

  return users.filter(u => {
    if (role !== (options.roleAllValue ?? 'TOUS') && u.role !== role) return false;

    if (districtId) {
      const userDistrict =
        u.district?.id ??
        (u.parish?.id ? options.parishDistrictMap.get(u.parish.id) : undefined);
      if (userDistrict !== districtId) return false;
    }

    if (parishId && u.parish?.id !== parishId) return false;

    if (statut && u.statutProfil !== statut) return false;

    if (adhesion) {
      const adhStatut = u.adhesions?.[0]?.statut;
      if (adhStatut !== adhesion) return false;
    }

    if (!search) return true;

    return (
      `${u.prenoms ?? ''} ${u.nom ?? ''}`.toLowerCase().includes(search) ||
      (u.matricule ?? '').toLowerCase().includes(search) ||
      (u.parish?.nom ?? '').toLowerCase().includes(search) ||
      (u.district?.nom ?? '').toLowerCase().includes(search) ||
      (u.email ?? '').toLowerCase().includes(search)
    );
  });
}
