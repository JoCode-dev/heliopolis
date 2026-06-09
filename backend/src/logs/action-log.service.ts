import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { appendFile, mkdir, readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type {
  ActionLogEntry,
  RecordActionLogInput,
} from './types/action-log-entry.js';
import { getRequestContext } from './request-context.js';
import type { QueryLogsDto } from './dto/query-logs.dto.js';

@Injectable()
export class ActionLogService implements OnModuleInit {
  private readonly logger = new Logger(ActionLogService.name);
  private readonly logDir: string;
  private readonly actionsDir: string;
  private writeChain: Promise<void> = Promise.resolve();

  constructor() {
    this.logDir = process.env.LOG_DIR ?? 'logs';
    this.actionsDir = join(process.cwd(), this.logDir, 'actions');
  }

  onModuleInit() {
    if (!existsSync(this.actionsDir)) {
      mkdir(this.actionsDir, { recursive: true }).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Impossible de créer ${this.actionsDir}: ${msg}`);
      });
    }
  }

  record(input: RecordActionLogInput): void {
    const ctx = getRequestContext();
    const entry: ActionLogEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      action: input.action,
      category: input.category,
      summary: input.summary,
      target: input.target,
      ...(input.metadata && { metadata: input.metadata }),
      ...(input.actor && {
        actor: {
          id: input.actor.id,
          role: input.actor.role,
          label: `${input.actor.prenoms ?? ''} ${input.actor.nom ?? ''}`.trim(),
        },
      }),
      ...(ctx?.ip && { ip: ctx.ip }),
      ...(ctx?.userAgent && { userAgent: ctx.userAgent }),
    };

    this.writeChain = this.writeChain
      .then(() => this.appendEntry(entry))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Échec écriture log: ${msg}`);
      });
  }

  private filePathForDate(dateKey: string) {
    return join(this.actionsDir, `${dateKey}.jsonl`);
  }

  private todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private async appendEntry(entry: ActionLogEntry) {
    if (!existsSync(this.actionsDir)) {
      await mkdir(this.actionsDir, { recursive: true });
    }
    const dateKey = entry.timestamp.slice(0, 10);
    const line = `${JSON.stringify(entry)}\n`;
    await appendFile(this.filePathForDate(dateKey), line, 'utf8');
  }

  async listDates(): Promise<string[]> {
    if (!existsSync(this.actionsDir)) return [];
    const files = await readdir(this.actionsDir);
    return files
      .filter((f) => f.endsWith('.jsonl'))
      .map((f) => f.replace('.jsonl', ''))
      .sort((a, b) => b.localeCompare(a));
  }

  async query(dto: QueryLogsDto) {
    const date = dto.date ?? this.todayKey();
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 50;
    const filePath = this.filePathForDate(date);

    if (!existsSync(filePath)) {
      return { items: [] as ActionLogEntry[], total: 0, page, limit, date };
    }

    const content = await readFile(filePath, 'utf8');
    const entries: ActionLogEntry[] = [];

    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        entries.push(JSON.parse(line) as ActionLogEntry);
      } catch {
        /* ignore malformed lines */
      }
    }

    entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    let filtered = entries;
    if (dto.action) {
      filtered = filtered.filter((e) => e.action === dto.action);
    }
    if (dto.category) {
      filtered = filtered.filter((e) => e.category === dto.category);
    }
    if (dto.actorId) {
      filtered = filtered.filter((e) => e.actor?.id === dto.actorId);
    }
    if (dto.search) {
      const q = dto.search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.summary.toLowerCase().includes(q) ||
          e.actor?.label.toLowerCase().includes(q) ||
          e.target.entityType.toLowerCase().includes(q) ||
          e.target.entityId.toLowerCase().includes(q),
      );
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return { items, total, page, limit, date };
  }
}
