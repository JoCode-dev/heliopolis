import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../../generated/prisma/client.js';

const logger = new Logger('ExceptionFilter');

function prismaStatus(code: string): number {
  switch (code) {
    case 'P2025': return HttpStatus.NOT_FOUND;
    case 'P2002': return HttpStatus.CONFLICT;
    case 'P2003': return HttpStatus.BAD_REQUEST;
    case 'P2014': return HttpStatus.BAD_REQUEST;
    default:      return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}

function prismaMessage(code: string): string {
  switch (code) {
    case 'P2025': return 'Ressource introuvable';
    case 'P2002': return 'Cette valeur existe déjà';
    case 'P2003': return 'Référence invalide';
    case 'P2014': return 'Contrainte de relation violée';
    default:      return 'Erreur de base de données';
  }
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : (body as { message?: string | string[] }).message ?? exception.message;
      return res.status(status).json({ statusCode: status, message });
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const status = prismaStatus(exception.code);
      const message = prismaMessage(exception.code);
      if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
        logger.error(`Prisma ${exception.code}: ${exception.message}`);
      }
      return res.status(status).json({ statusCode: status, message });
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      logger.warn(`PrismaValidationError: ${(exception as Error).message}`);
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Données invalides',
      });
    }

    logger.error('Erreur inattendue', exception instanceof Error ? exception.stack : String(exception));
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Une erreur interne est survenue',
    });
  }
}
