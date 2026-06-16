import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RenameDistrictDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare nom: string;
}
