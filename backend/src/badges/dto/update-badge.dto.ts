import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBadgeDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  declare code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  declare description?: string;

  @IsOptional()
  @IsString()
  declare condition?: string;

  @IsOptional()
  @IsString()
  declare niveau?: string;

  @IsOptional()
  @IsObject()
  conditionMeta?: Record<string, unknown>;
}
