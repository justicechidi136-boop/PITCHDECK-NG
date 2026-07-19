import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PrismaClient } from "@prisma/client";
import { PRISMA_CLIENT } from "../../database/database.module";
import type { EnvConfig } from "../../config/env.schema";
import { parseDurationToMs } from "../../config/env.schema";
import {
  generateFamilyId,
  generateOpaqueToken,
  hashToken,
  parseUserAgent,
} from "../utils/crypto.util";

export interface CreateSessionInput {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionTokens {
  sessionId: string;
  refreshToken: string;
  familyId: string;
  expiresAt: Date;
}

@Injectable()
export class SessionService {
  private readonly refreshExpiresMs: number;

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {
    const refreshExpires = this.configService.get("AUTH_REFRESH_EXPIRES", {
      infer: true,
    });
    this.refreshExpiresMs = parseDurationToMs(refreshExpires);
  }

  async createSession(input: CreateSessionInput): Promise<SessionTokens> {
    const refreshToken = generateOpaqueToken();
    const tokenHash = hashToken(refreshToken);
    const familyId = generateFamilyId();
    const expiresAt = new Date(Date.now() + this.refreshExpiresMs);

    const session = await this.prisma.authSession.create({
      data: {
        userId: input.userId,
        tokenHash,
        familyId,
        expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        deviceDescription: parseUserAgent(input.userAgent),
      },
    });

    return {
      sessionId: session.id,
      refreshToken,
      familyId,
      expiresAt,
    };
  }

  async rotateSession(
    currentTokenHash: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<
    | { type: "success"; tokens: SessionTokens; userId: string }
    | { type: "reuse"; userId: string; familyId: string }
    | { type: "invalid" }
  > {
    const existing = await this.prisma.authSession.findUnique({
      where: { tokenHash: currentTokenHash },
    });

    if (!existing) {
      return { type: "invalid" };
    }

    if (existing.revokedAt) {
      return {
        type: "reuse",
        userId: existing.userId,
        familyId: existing.familyId,
      };
    }

    if (existing.expiresAt < new Date()) {
      return { type: "invalid" };
    }

    await this.prisma.authSession.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), lastUsedAt: new Date() },
    });

    const refreshToken = generateOpaqueToken();
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.refreshExpiresMs);

    const session = await this.prisma.authSession.create({
      data: {
        userId: existing.userId,
        tokenHash,
        familyId: existing.familyId,
        expiresAt,
        ipAddress: ipAddress ?? existing.ipAddress,
        userAgent: userAgent ?? existing.userAgent,
        deviceDescription: parseUserAgent(userAgent ?? existing.userAgent ?? undefined),
      },
    });

    return {
      type: "success",
      userId: existing.userId,
      tokens: {
        sessionId: session.id,
        refreshToken,
        familyId: existing.familyId,
        expiresAt,
      },
    };
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await this.prisma.authSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count > 0;
  }

  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
    const result = await this.prisma.authSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  async getValidSession(sessionId: string, userId: string) {
    return this.prisma.authSession.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async listSessions(userId: string, currentSessionId?: string) {
    return this.prisma.authSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        deviceDescription: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
    }).then((sessions) =>
      sessions.map((s) => ({
        ...s,
        isCurrent: s.id === currentSessionId,
      })),
    );
  }
}
