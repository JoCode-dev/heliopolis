import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  declare identifier: string;

  @IsString()
  @IsNotEmpty()
  declare password: string;
}
