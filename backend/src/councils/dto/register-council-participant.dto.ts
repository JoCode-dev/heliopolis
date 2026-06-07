import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class RegisterCouncilParticipantDto {
  @IsString()
  @IsNotEmpty()
  declare nom: string;

  @IsString()
  @IsNotEmpty()
  declare prenoms: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  districtId?: string;

  @IsOptional()
  @IsString()
  parishId?: string;

  @IsOptional()
  @IsString()
  fonction?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  note?: number;

  @IsOptional()
  @IsString()
  avis?: string;
}
