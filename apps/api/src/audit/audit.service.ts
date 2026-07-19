import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import { PRISMA_CLIENT } from "../database/database.module";
import type { AuditAction, Prisma } from "@prisma/client";

export interface AuditLogInput {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async log(input: AuditLogInput): Promise<void> {
    const sanitizedMetadata = input.metadata
      ? this.sanitizeMetadata(input.metadata)
      : undefined;

    await this.prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        actorId: input.actorId,
        metadata: sanitizedMetadata as Prisma.InputJsonValue | undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  private sanitizeMetadata(
    metadata: Record<string, unknown>,
  ): Record<string, unknown> {
    const blocked = new Set([
      "password",
      "passwordHash",
      "token",
      "refreshToken",
      "accessToken",
      "csrfToken",
    ]);
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (blocked.has(key)) {
        continue;
      }
      result[key] = value;
    }
    return result;
  }
}
