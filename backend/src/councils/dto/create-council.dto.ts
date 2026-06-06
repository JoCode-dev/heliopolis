import { IsString, IsDateString, IsOptional, IsArray, IsEnum, IsNotEmpty } from 'class-validator';
import { CouncilStatus } from '../../../generated/prisma/enums.js';

export class CreateCouncilDto {
  @IsString()
  @IsNotEmpty()
  declare nom: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  declare date: string;

  @IsOptional()
  @IsString()
  lieu?: string;

  @IsOptional()
  @IsEnum(CouncilStatus)
  statut?: CouncilStatus;

  /** Rôles concernés : ex. ["SENTINELLE","GUIDE"] */
  @IsArray()
  @IsString({ each: true })
  declare targetRoles: string[];

  @IsOptional()
  @IsString()
  regionId?: string;

  @IsOptional()
  @IsString()
  districtId?: string;

  @IsOptional()
  @IsString()
  parishId?: string;
}
