import { Module } from '@nestjs/common';
import { AnnoncesController } from './annonces.controller.js';
import { AnnoncesService } from './annonces.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [AnnoncesController],
  providers: [AnnoncesService],
})
export class AnnoncesModule {}
