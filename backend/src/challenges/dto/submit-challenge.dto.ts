import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitChallengeDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  declare texte?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare preuveUrl?: string;
}
