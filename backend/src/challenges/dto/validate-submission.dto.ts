import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ValidateSubmissionDto {
  @IsBoolean()
  declare approved: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  declare comment?: string;
}
