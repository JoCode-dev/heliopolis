import { Module } from '@nestjs/common';
import { ChallengesService } from './challenges.service.js';
import { ChallengesController } from './challenges.controller.js';
import { BadgesModule } from '../badges/badges.module.js';

@Module({
  imports: [BadgesModule],
  providers: [ChallengesService],
  controllers: [ChallengesController],
})
export class ChallengesModule {}
