import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { AuditAction } from '../../../generated/prisma/enums.js';
import type { ActionLogCategory } from '../types/action-log-entry.js';

const CATEGORIES = [
  'auth',
  'user',
  'camp',
  'challenge',
  'codex',
  'council',
  'badge',
  'export',
  'settings',
] as const;

export class QueryLogsDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsString()
  category?: ActionLogCategory;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

export { CATEGORIES };
