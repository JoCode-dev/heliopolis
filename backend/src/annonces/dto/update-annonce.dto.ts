import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAnnonceDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  declare titre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  declare contenu?: string;

  @IsOptional()
  @IsString()
  declare portee?: string;

  @IsOptional()
  @IsString()
  declare statut?: string;

  @IsOptional()
  @IsString()
  declare publishedAt?: string;

  @IsOptional()
  @IsString()
  declare expiresAt?: string;
}
