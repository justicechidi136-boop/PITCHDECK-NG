import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import {
  RoleType,
  ScopeType,
  DEFAULT_COUNTRY_CODE,
  AUTH_ERROR_CODES,
  type RoleAssignmentDto,
} from "@pitchdeck/contracts";
import { PRISMA_CLIENT } from "../database/database.module";

export interface AuthenticatedUser {
  id: string;
  email: string;
  accountStatus: string;
  roles: RoleAssignmentDto[];
}

@Injectable()
export class RbacService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async getUserRoles(userId: string): Promise<RoleAssignmentDto[]> {
    const assignments = await this.prisma.roleAssignment.findMany({
      where: { userId },
      include: { role: true, state: true },
    });

    return assignments.map((a) => ({
      role: a.role.type as RoleType,
      scopeType: a.scopeType as ScopeType,
      countryCode: a.countryCode ?? undefined,
      stateId: a.stateId ?? undefined,
      stateCode: a.state?.code,
    }));
  }

  validateRoleScope(input: RoleAssignmentDto): void {
    const { role, scopeType, stateId, countryCode } = input;

    if (role === RoleType.SUPER_ADMIN) {
      if (scopeType !== ScopeType.GLOBAL) {
        throw new BadRequestException({
          code: AUTH_ERROR_CODES.INVALID_ROLE_SCOPE,
          message: "SUPER_ADMIN must have GLOBAL scope",
        });
      }
      return;
    }

    if (role === RoleType.NATIONAL_ADMIN) {
      if (scopeType !== ScopeType.COUNTRY || countryCode !== DEFAULT_COUNTRY_CODE) {
        throw new BadRequestException({
          code: AUTH_ERROR_CODES.INVALID_ROLE_SCOPE,
          message: "NATIONAL_ADMIN must have COUNTRY scope for NG",
        });
      }
      return;
    }

    if (role === RoleType.STATE_ADMIN) {
      if (scopeType !== ScopeType.STATE || !stateId) {
        throw new BadRequestException({
          code: AUTH_ERROR_CODES.INVALID_ROLE_SCOPE,
          message: "STATE_ADMIN requires STATE scope with stateId",
        });
      }
      return;
    }

    if (
      [RoleType.REVIEWER, RoleType.INNOVATOR, RoleType.SPONSOR, RoleType.MENTOR].includes(
        role,
      )
    ) {
      if (scopeType !== ScopeType.GLOBAL) {
        throw new BadRequestException({
          code: AUTH_ERROR_CODES.INVALID_ROLE_SCOPE,
          message: `${role} must have GLOBAL scope`,
        });
      }
    }
  }

  isSuperAdmin(user: AuthenticatedUser): boolean {
    return user.roles.some((r) => r.role === RoleType.SUPER_ADMIN);
  }

  isNationalAdmin(user: AuthenticatedUser): boolean {
    return user.roles.some((r) => r.role === RoleType.NATIONAL_ADMIN);
  }

  isStateAdmin(user: AuthenticatedUser): boolean {
    return user.roles.some((r) => r.role === RoleType.STATE_ADMIN);
  }

  isAnyAdmin(user: AuthenticatedUser): boolean {
    return (
      this.isSuperAdmin(user) ||
      this.isNationalAdmin(user) ||
      this.isStateAdmin(user)
    );
  }

  assertAdminAccess(user: AuthenticatedUser): void {
    if (!this.isAnyAdmin(user)) {
      throw new ForbiddenException({
        code: AUTH_ERROR_CODES.FORBIDDEN,
        message: "Admin access required",
      });
    }
  }

  assertSuperAdmin(user: AuthenticatedUser): void {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException({
        code: AUTH_ERROR_CODES.FORBIDDEN,
        message: "Super admin access required",
      });
    }
  }

  getAccessibleStateIds(user: AuthenticatedUser): string[] | "all" {
    if (this.isSuperAdmin(user) || this.isNationalAdmin(user)) {
      return "all";
    }
    if (this.isStateAdmin(user)) {
      return user.roles
        .filter((r) => r.role === RoleType.STATE_ADMIN && r.stateId)
        .map((r) => r.stateId)
        .filter((id): id is string => id !== undefined);
    }
    return [];
  }

  canAccessUser(
    actor: AuthenticatedUser,
    targetStateIds: string[],
  ): boolean {
    if (this.isSuperAdmin(actor) || this.isNationalAdmin(actor)) {
      return true;
    }
    const accessible = this.getAccessibleStateIds(actor);
    if (accessible === "all") {
      return true;
    }
    if (accessible.length === 0) {
      return false;
    }
    if (targetStateIds.length === 0) {
      return false;
    }
    return targetStateIds.every((id) => accessible.includes(id));
  }

  async resolveStateId(stateId?: string, stateCode?: string): Promise<string | undefined> {
    if (stateId) {
      return stateId;
    }
    if (stateCode) {
      const state = await this.prisma.state.findUnique({ where: { code: stateCode } });
      return state?.id;
    }
    return undefined;
  }

  async countSuperAdmins(): Promise<number> {
    return this.prisma.roleAssignment.count({
      where: { role: { type: RoleType.SUPER_ADMIN } },
    });
  }
}
