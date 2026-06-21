import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { RegionRole, UserRole } from '../../../generated/prisma/enums.js';

export class UpdateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Le matricule est obligatoire pour modifier un utilisateur.' })
  declare matricule: string;

  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  prenoms?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(RegionRole)
  regionRole?: RegionRole;

  @IsOptional()
  @IsDateString()
  dateNaissance?: string;

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
