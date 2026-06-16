import { IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AdhesionStatus } from '../../../generated/prisma/enums.js';

export class UpdateAdhesionDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  declare annee: number;

  @IsEnum(AdhesionStatus)
  declare statut: AdhesionStatus;
}
