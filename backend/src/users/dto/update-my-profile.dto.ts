import { IsString, IsEmail, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare nom?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare prenoms?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  declare email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  declare telephone?: string;
}
