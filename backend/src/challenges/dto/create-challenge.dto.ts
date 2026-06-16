import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  IsPositive,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ChallengeCategory,
  ChallengeLevel,
  Regne,
} from '../../../generated/prisma/enums.js';

export class CreateChallengeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  declare titre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  declare description: string;

  @IsEnum(ChallengeCategory)
  declare categorie: ChallengeCategory;

  @IsOptional()
  @IsEnum(Regne)
  regne?: Regne;

  @IsOptional()
  @IsEnum(ChallengeLevel)
  niveau?: ChallengeLevel;

  @IsOptional()
  @IsString()
  preuveDemandee?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  points?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  pointsRequis?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  duree?: number;

  @IsOptional()
  @IsString()
  campId?: string;
}
