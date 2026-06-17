import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateParishDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare nom: string;

  @IsString()
  declare districtId: string;
}
