import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MessagingService } from './messaging.service.js';
import { MessagingController } from './messaging.controller.js';
import { MessagingGateway } from './messaging.gateway.js';
import { VectorModule } from '../vector/vector.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
    }),
    VectorModule,
    NotificationsModule,
  ],
  providers: [MessagingService, MessagingGateway],
  controllers: [MessagingController],
})
export class MessagingModule {}
