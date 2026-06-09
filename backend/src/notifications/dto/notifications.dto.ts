import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SubscribePushDto {
  @IsString()
  declare endpoint: string;

  @IsString()
  declare p256dh: string;

  @IsString()
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
