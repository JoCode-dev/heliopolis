import type { AuditAction } from '../../../generated/prisma/enums.js';

export type ActionLogCategory =
  | 'auth'
  | 'user'
  | 'camp'
  | 'challenge'
  | 'codex'
  | 'council'
  | 'badge'
  | 'export'
  | 'settings';

export interface ActionLogActor {
  id: string;
  role: string;
  label: string;
}

export interface ActionLogTarget {
  entityType: string;
  entityId: string;
}

export interface ActionLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  category: ActionLogCategory;
  summary: string;
  actor?: ActionLogActor;
  target: ActionLogTarget;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export interface RecordActionLogInput {
  action: AuditAction;
  category: ActionLogCategory;
  summary: string;
  actor?: { id: string; role: string; nom?: string | null; prenoms?: string | null } | null;
  target: ActionLogTarget;
  metadata?: Record<string, unknown>;
}
