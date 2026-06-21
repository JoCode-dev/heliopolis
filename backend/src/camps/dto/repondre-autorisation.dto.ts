import { IsOptional, IsString } from 'class-validator';

export class RepondreAutorisationDto {
  @IsOptional()
  @IsString()
  reponse?: string;
}
