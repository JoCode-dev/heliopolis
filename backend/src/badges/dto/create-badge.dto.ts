import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBadgeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare nom: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  declare code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  declare description: string;

  @IsString()
  @IsNotEmpty()
  declare condition: string;

  @IsString()
  @IsNotEmpty()
  declare niveau: string;

  @IsOptional()
  @IsObject()
  conditionMeta?: Record<string, unknown>;
}
