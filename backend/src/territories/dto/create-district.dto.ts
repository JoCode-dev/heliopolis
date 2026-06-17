import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDistrictDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare nom: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  declare code?: string;

  @IsString()
  declare regionId: string;
}
