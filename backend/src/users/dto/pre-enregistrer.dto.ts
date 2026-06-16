import { IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString, MaxLength, Matches } from 'class-validator';

export class PreEnregistrerDto {
  @IsString()
  @Matches(/^\d{7}[A-Z]$/, { message: 'Matricule invalide (ex: 0525247O)' })
  declare matricule: string;

  @IsDateString({}, { message: 'Date de naissance invalide (format attendu : YYYY-MM-DD)' })
  declare dateNaissance: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nom?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  prenoms?: string;

  @IsOptional()
  @IsUUID()
  regionId?: string;

  @IsOptional()
  @IsUUID()
  districtId?: string;

  @IsOptional()
  @IsUUID()
  parishId?: string;
}
