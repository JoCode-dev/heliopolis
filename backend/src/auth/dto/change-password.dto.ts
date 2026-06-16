import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  declare ancienMotDePasse: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Le nouveau mot de passe doit comporter au moins 8 caractères' })
  declare nouveauMotDePasse: string;
}
