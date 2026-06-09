import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';
import {
  SubscribePushDto,
  UnsubscribePushDto,
  UpdateNotificationPreferencesDto,
} from './dto/notifications.dto.js';
import { UsersService } from '../users/users.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private usersService: UsersService,
  ) {}

  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { publicKey: this.notificationsService.getPublicKey() };
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  subscribe(@Body() dto: SubscribePushDto, @CurrentUser() user: AuthUser) {
    return this.notificationsService.subscribe(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('subscribe')
  unsubscribe(
    @Body() dto: UnsubscribePushDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.notificationsService.unsubscribe(user.id, dto.endpoint);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('preferences')
  updatePreferences(
    @Body() dto: UpdateNotificationPreferencesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.usersService.updateNotificationPreferences(user.id, dto);
  }
}
