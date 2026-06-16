import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';

class ContactDto {
  prenom!: string;
  contact!: string;
  role?: string;
  message?: string;
}

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  /** Point d'entrée public — formulaire /rejoindre (aucune authentification requise) */
  @Post('contact')
  @HttpCode(201)
  async createContactRequest(@Body() dto: ContactDto) {
    await this.prisma.contactRequest.create({
      data: {
        prenom:  dto.prenom?.trim()  ?? '',
        contact: dto.contact?.trim() ?? '',
        role:    dto.role?.trim()    || null,
        message: dto.message?.trim() || null,
      },
    });
    return { ok: true };
  }
}
