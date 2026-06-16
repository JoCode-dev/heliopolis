import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VerifierMatriculeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  declare matricule: string;
}
