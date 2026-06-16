import { IsString, IsNotEmpty, IsDateString, MaxLength, MinLength, Matches } from 'class-validator';

export class InscrireDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare nom: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare prenoms: string;

  @IsString()
  @Matches(/^\d{7}[A-Z]$/, { message: 'Matricule invalide (ex: 0525247O)' })
  declare matricule: string;

  @IsDateString({}, { message: 'Date de naissance invalide (YYYY-MM-DD)' })
  declare dateNaissance: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Le mot de passe doit comporter au moins 8 caractères' })
  @MaxLength(128)
  declare password: string;
}
