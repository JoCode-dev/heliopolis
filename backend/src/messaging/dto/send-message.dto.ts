import { IsString, IsNotEmpty, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { MessageType } from '../../../generated/prisma/enums.js';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  declare contenu: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsOptional()
  @IsString()
  replyToId?: string;
}
