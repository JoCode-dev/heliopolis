import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  declare identifier: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  declare password: string;
}
