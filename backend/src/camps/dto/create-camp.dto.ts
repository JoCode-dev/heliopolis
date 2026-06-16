import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsDateString,
  IsArray,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { CampType } from '../../../generated/prisma/enums.js';

const ALLOWED_CAMP_TYPES: CampType[] = [CampType.REGIONAL, CampType.NATIONAL];

export class CreateCampDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  declare nom: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  theme?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsDateString()
  declare dateDebut: string;

  @IsDateString()
  declare dateFin: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
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
