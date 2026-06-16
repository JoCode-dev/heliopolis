import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateParishDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare nom: string;

  @IsUUID()
  declare districtId: string;
}
