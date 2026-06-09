import { IsString, Matches, IsDateString, MinLength } from 'class-validator';

export class InscrireDto {
  @IsString()
  declare nom: string;

  @IsString()
  declare prenoms: string;

  @IsString()
  @Matches(/^\d{7}[A-Z]$/, { message: 'Matricule invalide (ex: 0525247O)' })
  declare matricule: string;

  @IsDateString({}, { message: 'Date de naissance invalide (YYYY-MM-DD)' })
  declare dateNaissance: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit comporter au moins 8 caractères' })
  declare password: string;
}
