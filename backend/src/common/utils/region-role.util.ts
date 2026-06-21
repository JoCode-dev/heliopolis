import { ForbiddenException } from '@nestjs/common';
import { RegionRole, UserRole } from '../../../generated/prisma/enums.js';
import type { AuthUser } from '../types/auth-user.js';

/** Renvoie true si l'utilisateur est un RESPONSABLE régional (ou ADMIN). */
export function isRegionResponsable(user: AuthUser): boolean {
  if (user.role === UserRole.ADMIN) return true;
  if (user.role !== UserRole.REGION) return false;
  const rr = user.regionRole as RegionRole | null;
  return !rr || rr === RegionRole.RESPONSABLE;
}

/** Renvoie true si l'utilisateur est ADJOINT ou au-dessus (RESPONSABLE / ADMIN). */
export function isRegionAdjointOrAbove(user: AuthUser): boolean {
  if (user.role === UserRole.ADMIN) return true;
  if (user.role !== UserRole.REGION) return false;
  const rr = user.regionRole as RegionRole | null;
  return !rr || rr === RegionRole.RESPONSABLE || rr === RegionRole.ADJOINT;
}

/** Lève une ForbiddenException si l'utilisateur n'est pas RESPONSABLE régional. */
export function requireResponsable(user: AuthUser): void {
  if (!isRegionResponsable(user)) {
    throw new ForbiddenException('Accès réservé au premier responsable régional');
  }
}

/** Lève une ForbiddenException si l'utilisateur n'est pas ADJOINT ou au-dessus. */
export function requireAdjointOrAbove(user: AuthUser): void {
  if (!isRegionAdjointOrAbove(user)) {
    throw new ForbiddenException('Accès réservé au responsable ou à l\'adjoint régional');
  }
}
