import {
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { CampType } from '../../../generated/prisma/enums.js';

const ALLOWED_CAMP_TYPES: CampType[] = [CampType.REGIONAL, CampType.NATIONAL];

export class CreateCampDto {
  @IsString()
  declare nom: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  declare dateDebut: string;

  @IsDateString()
  declare dateFin: string;

  @IsString()
  declare lieu: string;

  @IsIn(ALLOWED_CAMP_TYPES, { message: 'Le type de camp doit être REGIONAL ou NATIONAL.' })
  declare type: CampType;

  @IsOptional()
  @IsArray()
  districtIds?: string[];

  @IsOptional()
  @IsBoolean()
  selectionOuverte?: boolean;
}
