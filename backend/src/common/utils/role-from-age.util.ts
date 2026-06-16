import { BadRequestException } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums.js';

export function determineRoleFromAge(dateNaissance: Date): UserRole {
  const today = new Date();
  let age = today.getFullYear() - dateNaissance.getFullYear();
  const m = today.getMonth() - dateNaissance.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dateNaissance.getDate())) age--;
  if (age < 18) throw new BadRequestException('Âge minimum requis : 18 ans révolus');
  if (age < 21) return UserRole.GARDIEN;
  return UserRole.GUIDE;
}
