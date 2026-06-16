import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDistrictDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare nom: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  declare code?: string;

  @IsUUID()
  declare regionId: string;
}
