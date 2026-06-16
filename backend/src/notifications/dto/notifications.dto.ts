import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubscribePushDto {
  @IsString()
  @IsNotEmpty()
  declare endpoint: string;

  @IsString()
  @IsNotEmpty()
  declare p256dh: string;

  @IsString()
  @IsNotEmpty()
  declare auth: string;

  @IsOptional()
  @IsString()
  declare userAgent?: string;
}

export class UnsubscribePushDto {
  @IsString()
  declare endpoint: string;
}

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  declare notifPush?: boolean;

  @IsOptional()
  @IsBoolean()
  declare notifEmail?: boolean;
}
