import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateCouncilFeedbackDto {
  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  note?: number;

  @IsOptional()
  @IsString()
  avis?: string;
}
