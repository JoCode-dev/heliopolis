import { IsString, IsArray, ArrayMinSize, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateAutorisationDto {
  @IsString()
  @IsNotEmpty()
  motif!: string;

  @IsDateString()
  heureSortie!: string;

  @IsDateString()
  dateHeureRetour!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  personneIds!: string[];
}
