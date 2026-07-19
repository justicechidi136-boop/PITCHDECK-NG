import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PrismaClient } from "@prisma/client";
import {
  AUTH_ERROR_CODES,
  AccountStatus,
  RoleType,
  ScopeType,
  DEFAULT_COUNTRY_CODE,
  normalizeEmail,
  type AdminCreateUserRequest,
  type AdminUpdateUserStatusRequest,
  type AdminAssignRoleRequest,
  type AdminUserListItem,
  type RoleAssignmentDto,
} from "@pitchdeck/contracts";
import { PRISMA_CLIENT } from "../database/database.module";
import type { EnvConfig } from "../config/env.schema";
import { EmailService } from "../email/email.service";
import { AuditService } from "../audit/audit.service";
import { RbacService, type AuthenticatedUser } from "../rbac/rbac.service";
import { RateLimitService } from "../rate-limit/rate-limit.service";
import { generateOpaqueToken, hashToken } from "../auth/utils/crypto.util";

export interface ListUsersQuery {
  page: number;
  pageSize: number;
  search?: string;
  accountStatus?: string;
}

@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
    private readonly rbacService: RbacService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async listUsers(
    actor: AuthenticatedUser,
    query: ListUsersQuery,
  ): Promise<{ items: AdminUserListItem[]; totalItems: number }> {
    this.rbacService.assertAdminAccess(actor);

    const accessibleStates = this.rbacService.getAccessibleStateIds(actor);
    const skip = (query.page - 1) * query.pageSize;

    const where = {
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: "insensitive" as const } },
              { firstName: { contains: query.search, mode: "insensitive" as const } },
              { lastName: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(query.accountStatus ? { accountStatus: query.accountStatus as AccountStatus } : {}),
      ...(accessibleStates !== "all"
        ? {
            roleAssignments: {
              some: {
                OR: [
                  { scopeType: ScopeType.GLOBAL, role: { type: { in: [RoleType.SUPER_ADMIN, RoleType.NATIONAL_ADMIN] } } },
                  { scopeType: ScopeType.COUNTRY },
                  { stateId: { in: accessibleStates } },
                ],
              },
            },
          }
        : {}),
    };

    const [users, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          roleAssignments: { include: { role: true, state: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const items = users.map((user) => this.toAdminUserListItem(user));

    return { items, totalItems };
  }

  async getUser(actor: AuthenticatedUser, userId: string): Promise<AdminUserListItem> {
    this.rbacService.assertAdminAccess(actor);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roleAssignments: { include: { role: true, state: true } } },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const targetStateIds = user.roleAssignments
      .filter((r): r is typeof r & { stateId: string } => r.stateId !== null)
      .map((r) => r.stateId);
    if (!this.rbacService.canAccessUser(actor, targetStateIds)) {
      throw new ForbiddenException({ code: AUTH_ERROR_CODES.FORBIDDEN, message: "Access denied" });
    }
    return this.toAdminUserListItem(user);
  }

  async createUser(
    actor: AuthenticatedUser,
    dto: AdminCreateUserRequest,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AdminUserListItem> {
    this.rbacService.assertSuperAdmin(actor);

    const rateLimit = await this.rateLimitService.checkLimit(
      `admin-create:actor:${actor.id}`,
      20,
      3600,
    );
    if (!rateLimit.allowed) {
      throw new BadRequestException({ code: AUTH_ERROR_CODES.RATE_LIMITED, message: "Rate limited" });
    }

    const email = normalizeEmail(dto.email);
    const existing = await this.prisma.user.findUnique({ where: { emailNormalized: email } });
    if (existing) {
      throw new ConflictException({ code: AUTH_ERROR_CODES.EMAIL_IN_USE, message: "Email in use" });
    }

    for (const role of dto.roles) {
      this.rbacService.validateRoleScope(role);
      if (role.role === RoleType.SUPER_ADMIN && !this.rbacService.isSuperAdmin(actor)) {
        throw new ForbiddenException({ code: AUTH_ERROR_CODES.FORBIDDEN, message: "Cannot assign super admin" });
      }
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.trim(),
        emailNormalized: email,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        accountStatus: AccountStatus.PENDING_VERIFICATION,
      },
    });

    for (const roleDto of dto.roles) {
      await this.assignRoleInternal(user.id, roleDto, actor.id);
    }

    const token = generateOpaqueToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 86_400_000 * 7);
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const adminBaseUrl = this.configService.get("ADMIN_WEB_BASE_URL", { infer: true });
    const activateUrl = `${adminBaseUrl}/reset-password?token=${token}&activate=true`;
    const emailContent = this.emailService.buildActivationEmail(activateUrl);
    await this.emailService.sendEmail({ to: user.email, ...emailContent });

    await this.auditService.log({
      action: "CREATE",
      entityType: "User",
      entityId: user.id,
      actorId: actor.id,
      metadata: { adminCreated: true },
      ipAddress,
      userAgent,
    });

    return this.getUser(actor, user.id);
  }

  async updateStatus(
    actor: AuthenticatedUser,
    userId: string,
    dto: AdminUpdateUserStatusRequest,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AdminUserListItem> {
    this.rbacService.assertAdminAccess(actor);

    const user = await this.getUser(actor, userId);
    const isSuperAdminTarget = user.roles.some((r) => r.role === RoleType.SUPER_ADMIN);

    const nextStatus = dto.accountStatus;

    if (
      nextStatus === "SUSPENDED" ||
      nextStatus === "DEACTIVATED"
    ) {
      if (isSuperAdminTarget) {
        const superAdminCount = await this.rbacService.countSuperAdmins();
        if (superAdminCount <= 1) {
          throw new BadRequestException({
            code: AUTH_ERROR_CODES.LAST_SUPER_ADMIN,
            message: "Cannot suspend/deactivate the last super admin",
          });
        }
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: nextStatus,
        suspendedAt: nextStatus === "SUSPENDED" ? new Date() : null,
        suspendedReason: nextStatus === "SUSPENDED" ? dto.suspendedReason : null,
        deactivatedAt: nextStatus === "DEACTIVATED" ? new Date() : null,
        ...(nextStatus === "ACTIVE"
          ? { suspendedAt: null, suspendedReason: null, deactivatedAt: null }
          : {}),
      },
    });

    const action =
      nextStatus === "SUSPENDED"
        ? "USER_SUSPEND"
        : nextStatus === "ACTIVE"
          ? "USER_REACTIVATE"
          : "UPDATE";

    await this.auditService.log({
      action,
      entityType: "User",
      entityId: userId,
      actorId: actor.id,
      metadata: { accountStatus: nextStatus },
      ipAddress,
      userAgent,
    });

    return this.getUser(actor, userId);
  }

  async assignRole(
    actor: AuthenticatedUser,
    userId: string,
    dto: AdminAssignRoleRequest,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AdminUserListItem> {
    this.rbacService.assertAdminAccess(actor);
    await this.getUser(actor, userId);

    if (dto.role === RoleType.SUPER_ADMIN) {
      this.rbacService.assertSuperAdmin(actor);
    }
    if (dto.role === RoleType.NATIONAL_ADMIN && !this.rbacService.isSuperAdmin(actor)) {
      throw new ForbiddenException({ code: AUTH_ERROR_CODES.FORBIDDEN, message: "Cannot assign national admin" });
    }

    this.rbacService.validateRoleScope(dto);
    await this.assignRoleInternal(userId, dto, actor.id);

    await this.auditService.log({
      action: "ROLE_ASSIGN",
      entityType: "User",
      entityId: userId,
      actorId: actor.id,
      metadata: { role: dto.role, scopeType: dto.scopeType },
      ipAddress,
      userAgent,
    });

    return this.getUser(actor, userId);
  }

  async revokeRole(
    actor: AuthenticatedUser,
    userId: string,
    assignmentId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AdminUserListItem> {
    this.rbacService.assertAdminAccess(actor);
    await this.getUser(actor, userId);

    const assignment = await this.prisma.roleAssignment.findFirst({
      where: { id: assignmentId, userId },
      include: { role: true },
    });
    if (!assignment) {
      throw new NotFoundException("Role assignment not found");
    }

    if (assignment.role.type === (RoleType.SUPER_ADMIN as string)) {
      const superAdminCount = await this.rbacService.countSuperAdmins();
      if (superAdminCount <= 1) {
        throw new BadRequestException({
          code: AUTH_ERROR_CODES.LAST_SUPER_ADMIN,
          message: "Cannot remove the last super admin",
        });
      }
    }

    await this.prisma.roleAssignment.delete({ where: { id: assignmentId } });

    await this.auditService.log({
      action: "ROLE_REVOKE",
      entityType: "User",
      entityId: userId,
      actorId: actor.id,
      metadata: { role: assignment.role.type },
      ipAddress,
      userAgent,
    });

    return this.getUser(actor, userId);
  }

  async listRoles(actor: AuthenticatedUser) {
    this.rbacService.assertAdminAccess(actor);
    return this.prisma.role.findMany({ orderBy: { type: "asc" } });
  }

  private async assignRoleInternal(
    userId: string,
    dto: AdminAssignRoleRequest,
    assignedById: string,
  ): Promise<void> {
    const role = await this.prisma.role.findUniqueOrThrow({ where: { type: dto.role } });
    const stateId = await this.rbacService.resolveStateId(dto.stateId, dto.stateCode);

    if (dto.role === RoleType.STATE_ADMIN && !stateId) {
      throw new BadRequestException("State required for STATE_ADMIN");
    }

    const countryCode =
      dto.role === RoleType.NATIONAL_ADMIN ? DEFAULT_COUNTRY_CODE : dto.countryCode;

    const resolvedStateId = stateId ?? null;

    const existingAssignment = await this.prisma.roleAssignment.findFirst({
      where: {
        userId,
        roleId: role.id,
        scopeType: dto.scopeType,
        stateId: resolvedStateId,
      },
    });

    if (existingAssignment) {
      await this.prisma.roleAssignment.update({
        where: { id: existingAssignment.id },
        data: { assignedById },
      });
      return;
    }

    await this.prisma.roleAssignment.create({
      data: {
        userId,
        roleId: role.id,
        scopeType: dto.scopeType,
        countryCode,
        stateId: resolvedStateId,
        assignedById,
      },
    });
  }

  private toAdminUserListItem(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      accountStatus: string;
      emailVerifiedAt: Date | null;
      createdAt: Date;
      lastLoginAt: Date | null;
      roleAssignments: Array<{
        role: { type: string };
        scopeType: string;
        countryCode: string | null;
        stateId: string | null;
        state: { code: string } | null;
      }>;
    },
  ): AdminUserListItem {
    const roles: RoleAssignmentDto[] = user.roleAssignments.map((a) => ({
      role: a.role.type as RoleType,
      scopeType: a.scopeType as ScopeType,
      countryCode: a.countryCode ?? undefined,
      stateId: a.stateId ?? undefined,
      stateCode: a.state?.code,
    }));

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      accountStatus: user.accountStatus as AccountStatus,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      roles,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    };
  }
}
