import { Module } from '@nestjs/common';
import { PhotothequeController } from './phototheque.controller.js';
import { PhotothequeService } from './phototheque.service.js';

@Module({
  controllers: [PhotothequeController],
  providers: [PhotothequeService],
})
export class PhotothequeModule {}
