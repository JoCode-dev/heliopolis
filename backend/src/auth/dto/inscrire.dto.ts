import { IsString, Matches, IsOptional, IsEmail, MinLength } from 'class-validator';

export class InscrireDto {
  @IsString()
  @Matches(/^\d{7}[A-Z]$/, { message: 'Matricule invalide (ex: 0525247O)' })
  declare matricule: string;

  @IsString()
  declare nom: string;

  @IsString()
  declare prenoms: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email invalide' })
  email?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit comporter au moins 8 caractères' })
  declare password: string;
}
