import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PrismaClient } from "@prisma/client";
import {
  AUTH_ERROR_CODES,
  AccountStatus,
  ScopeType,
  normalizeEmail,
  type RegisterRequest,
  type LoginRequest,
  type AuthUser,
  type SessionDto,
} from "@pitchdeck/contracts";
import { PRISMA_CLIENT } from "../../database/database.module";
import type { EnvConfig } from "../../config/env.schema";
import { hashPassword, verifyPassword, AuthValidationError } from "../utils/password.util";
import { generateCsrfToken, generateOpaqueToken, hashToken } from "../utils/crypto.util";
import { TokenService } from "./token.service";
import { SessionService } from "./session.service";
import { CookieService } from "./cookie.service";
import { EmailService } from "../../email/email.service";
import { AuditService } from "../../audit/audit.service";
import { RateLimitService } from "../../rate-limit/rate-limit.service";
import { RbacService } from "../../rbac/rbac.service";

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly cookieService: CookieService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
    private readonly rateLimitService: RateLimitService,
    private readonly rbacService: RbacService,
  ) {}

  async register(dto: RegisterRequest, ctx: RequestContext): Promise<{ user: AuthUser }> {
    await this.assertRateLimit(`register:ip:${ctx.ipAddress ?? "unknown"}`, 5, 3600);

    const email = normalizeEmail(dto.email);
    const existing = await this.prisma.user.findUnique({
      where: { emailNormalized: email },
    });
    if (existing) {
      throw new ConflictException({
        code: AUTH_ERROR_CODES.EMAIL_IN_USE,
        message: "Unable to complete registration",
      });
    }

    let passwordHash: string;
    try {
      passwordHash = await hashPassword(dto.password);
    } catch (err) {
      if (err instanceof AuthValidationError) {
        throw new BadRequestException({ code: err.code, message: err.message });
      }
      throw err;
    }

    const role = await this.prisma.role.findUnique({ where: { type: dto.role } });
    if (!role) {
      throw new BadRequestException("Invalid role");
    }

    const stateId = await this.rbacService.resolveStateId(undefined, dto.stateCode);
    if (!stateId) {
      throw new BadRequestException({
        code: AUTH_ERROR_CODES.VALIDATION_ERROR,
        message: "Invalid state",
      });
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.trim(),
        emailNormalized: email,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        passwordHash,
        stateId,
        termsAcceptedAt: new Date(),
        accountStatus: AccountStatus.PENDING_VERIFICATION,
        roleAssignments: {
          create: {
            roleId: role.id,
            scopeType: ScopeType.GLOBAL,
          },
        },
      },
    });

    await this.createAndSendVerificationToken(user.id, user.email);

    await this.auditService.log({
      action: "REGISTER",
      entityType: "User",
      entityId: user.id,
      actorId: user.id,
      metadata: { role: dto.role },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const authUser = await this.buildAuthUser(user.id);
    return { user: authUser };
  }

  async login(
    dto: LoginRequest,
    ctx: RequestContext,
  ): Promise<{ accessToken: string; refreshToken: string; csrfToken: string; user: AuthUser }> {
    const email = normalizeEmail(dto.email);
    await this.assertRateLimit(`login:ip:${ctx.ipAddress ?? "unknown"}`, 20, 900);
    await this.assertRateLimit(`login:account:${email}`, 10, 900);

    const user = await this.prisma.user.findUnique({
      where: { emailNormalized: email },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        message: "Invalid email or password",
      });
    }

    const valid = await verifyPassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        message: "Invalid email or password",
      });
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException({
        code: AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED,
        message: "Please verify your email before signing in",
      });
    }

    this.assertAccountActive(user.accountStatus as AccountStatus);

    const session = await this.sessionService.createSession({
      userId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.tokenService.signAccessToken(user.id, session.sessionId);
    const csrfToken = generateCsrfToken();
    const authUser = await this.buildAuthUser(user.id);

    await this.auditService.log({
      action: "LOGIN",
      entityType: "User",
      entityId: user.id,
      actorId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      accessToken,
      refreshToken: session.refreshToken,
      csrfToken,
      user: authUser,
    };
  }

  async refresh(
    refreshToken: string,
    ctx: RequestContext,
  ): Promise<{ accessToken: string; refreshToken: string; csrfToken: string }> {
    await this.assertRateLimit(`refresh:ip:${ctx.ipAddress ?? "unknown"}`, 60, 900);

    const tokenHash = hashToken(refreshToken);
    const result = await this.sessionService.rotateSession(
      tokenHash,
      ctx.ipAddress,
      ctx.userAgent,
    );

    if (result.type === "invalid") {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.INVALID_TOKEN,
        message: "Invalid refresh token",
      });
    }

    if (result.type === "reuse") {
      await this.sessionService.revokeFamily(result.familyId);
      await this.auditService.log({
        action: "REFRESH_REUSE",
        entityType: "AuthSession",
        entityId: result.familyId,
        actorId: result.userId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.INVALID_TOKEN,
        message: "Session reuse detected",
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: result.userId } });
    if (!user) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.INVALID_TOKEN,
        message: "Invalid refresh token",
      });
    }

    this.assertAccountActive(user.accountStatus as AccountStatus);

    const accessToken = this.tokenService.signAccessToken(
      result.userId,
      result.tokens.sessionId,
    );
    const csrfToken = generateCsrfToken();

    return {
      accessToken,
      refreshToken: result.tokens.refreshToken,
      csrfToken,
    };
  }

  async logout(userId: string, sessionId: string, ctx: RequestContext): Promise<void> {
    await this.sessionService.revokeSession(sessionId, userId);
    await this.auditService.log({
      action: "LOGOUT",
      entityType: "User",
      entityId: userId,
      actorId: userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  async logoutAll(userId: string, exceptSessionId: string | undefined, ctx: RequestContext): Promise<number> {
    const count = await this.sessionService.revokeAllSessions(userId, exceptSessionId);
    await this.auditService.log({
      action: "LOGOUT",
      entityType: "User",
      entityId: userId,
      actorId: userId,
      metadata: { allDevices: true, revokedCount: count },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return count;
  }

  async getMe(userId: string): Promise<AuthUser> {
    return this.buildAuthUser(userId);
  }

  async listSessions(userId: string, currentSessionId?: string): Promise<SessionDto[]> {
    const sessions = await this.sessionService.listSessions(userId, currentSessionId);
    return sessions.map((s) => ({
      id: s.id,
      deviceDescription: s.deviceDescription,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      lastUsedAt: s.lastUsedAt?.toISOString() ?? null,
      expiresAt: s.expiresAt.toISOString(),
      isCurrent: s.isCurrent,
    }));
  }

  async revokeSession(userId: string, sessionId: string, ctx: RequestContext): Promise<void> {
    const revoked = await this.sessionService.revokeSession(sessionId, userId);
    if (!revoked) {
      throw new BadRequestException("Session not found");
    }
    await this.auditService.log({
      action: "SESSION_REVOKE",
      entityType: "AuthSession",
      entityId: sessionId,
      actorId: userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  async requestEmailVerification(email: string, _ctx: RequestContext): Promise<void> {
    await this.assertRateLimit(`verify-resend:${normalizeEmail(email)}`, 3, 3600);
    const user = await this.prisma.user.findUnique({
      where: { emailNormalized: normalizeEmail(email) },
    });
    if (!user || user.emailVerifiedAt) {
      return;
    }
    await this.createAndSendVerificationToken(user.id, user.email);
  }

  async confirmEmailVerification(token: string, ctx: RequestContext): Promise<AuthUser> {
    const tokenHash = hashToken(token);
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException({
        code: AUTH_ERROR_CODES.INVALID_TOKEN,
        message: "Invalid or expired verification token",
      });
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          emailVerifiedAt: new Date(),
          accountStatus: AccountStatus.ACTIVE,
        },
      }),
    ]);

    await this.auditService.log({
      action: "EMAIL_VERIFY",
      entityType: "User",
      entityId: record.userId,
      actorId: record.userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.buildAuthUser(record.userId);
  }

  async forgotPassword(email: string, ctx: RequestContext): Promise<void> {
    await this.assertRateLimit(`forgot:ip:${ctx.ipAddress ?? "unknown"}`, 5, 3600);
    await this.assertRateLimit(`forgot:account:${normalizeEmail(email)}`, 3, 3600);

    const user = await this.prisma.user.findUnique({
      where: { emailNormalized: normalizeEmail(email) },
    });
    if (!user) {
      return;
    }

    const token = generateOpaqueToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 3600_000);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const webBaseUrl = this.configService.get("WEB_BASE_URL", { infer: true });
    const resetUrl = `${webBaseUrl}/reset-password?token=${token}`;
    const emailContent = this.emailService.buildPasswordResetEmail(resetUrl);
    await this.emailService.sendEmail({
      to: user.email,
      ...emailContent,
    });
  }

  async resetPassword(token: string, password: string, ctx: RequestContext): Promise<void> {
    await this.assertRateLimit(`reset:ip:${ctx.ipAddress ?? "unknown"}`, 10, 3600);

    const tokenHash = hashToken(token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException({
        code: AUTH_ERROR_CODES.INVALID_TOKEN,
        message: "Invalid or expired reset token",
      });
    }

    let passwordHash: string;
    try {
      passwordHash = await hashPassword(password);
    } catch (err) {
      if (err instanceof AuthValidationError) {
        throw new BadRequestException({ code: err.code, message: err.message });
      }
      throw err;
    }

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
    ]);

    await this.sessionService.revokeAllSessions(record.userId);

    await this.auditService.log({
      action: "PASSWORD_RESET",
      entityType: "User",
      entityId: record.userId,
      actorId: record.userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  private async createAndSendVerificationToken(userId: string, email: string): Promise<void> {
    const token = generateOpaqueToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 86_400_000);

    await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    const webBaseUrl = this.configService.get("WEB_BASE_URL", { infer: true });
    const verifyUrl = `${webBaseUrl}/api/verify-email?token=${token}`;
    const emailContent = this.emailService.buildVerificationEmail(verifyUrl);
    await this.emailService.sendEmail({ to: email, ...emailContent });
  }

  private async buildAuthUser(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const roles = await this.rbacService.getUserRoles(userId);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      accountStatus: user.accountStatus as AuthUser["accountStatus"],
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      roles,
    };
  }

  private assertAccountActive(status: AccountStatus): void {
    if (status === AccountStatus.SUSPENDED) {
      throw new ForbiddenException({
        code: AUTH_ERROR_CODES.ACCOUNT_SUSPENDED,
        message: "Account is suspended",
      });
    }
    if (status === AccountStatus.DEACTIVATED) {
      throw new ForbiddenException({
        code: AUTH_ERROR_CODES.ACCOUNT_DEACTIVATED,
        message: "Account is deactivated",
      });
    }
  }

  private async assertRateLimit(key: string, max: number, windowSeconds: number): Promise<void> {
    if (this.configService.get("ENABLE_TEST_ENDPOINTS", { infer: true })) {
      return;
    }

    const result = await this.rateLimitService.checkLimit(key, max, windowSeconds);
    if (!result.allowed) {
      throw new HttpException(
        {
          code: AUTH_ERROR_CODES.RATE_LIMITED,
          message: "Too many requests",
          retryAfterSeconds: result.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
