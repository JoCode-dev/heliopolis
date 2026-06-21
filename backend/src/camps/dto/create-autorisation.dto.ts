import { IsString, IsArray, ArrayMinSize, IsNotEmpty } from 'class-validator';

export class CreateAutorisationDto {
  @IsString()
  @IsNotEmpty()
  motif!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  personneIds!: string[];
}
