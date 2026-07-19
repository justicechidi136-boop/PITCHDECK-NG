import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import {
  RoleType,
  SponsorVerificationStatus,
  SponsorMembershipRole,
  SponsorMembershipStatus,
  AccountStatus,
  STAGE3_ERROR_CODES,
} from "@pitchdeck/contracts";
import { PRISMA_CLIENT } from "../database/database.module";
import type { AuthenticatedUser } from "../rbac/rbac.service";
import { RbacService } from "../rbac/rbac.service";

@Injectable()
export class Stage3ScopeService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly rbac: RbacService,
  ) {}

  assertInnovator(user: AuthenticatedUser): void {
    const isInnovator = user.roles.some((r) => r.role === RoleType.INNOVATOR);
    if (!isInnovator || (user.accountStatus as AccountStatus) !== AccountStatus.ACTIVE) {
      throw new ForbiddenException({
        code: STAGE3_ERROR_CODES.FORBIDDEN,
        message: "Active innovator role required",
      });
    }
  }

  assertSponsor(user: AuthenticatedUser): void {
    const isSponsor = user.roles.some((r) => r.role === RoleType.SPONSOR);
    if (!isSponsor || (user.accountStatus as AccountStatus) !== AccountStatus.ACTIVE) {
      throw new ForbiddenException({
        code: STAGE3_ERROR_CODES.FORBIDDEN,
        message: "Active sponsor role required",
      });
    }
  }

  assertReviewer(user: AuthenticatedUser): void {
    const isReviewer = user.roles.some((r) => r.role === RoleType.REVIEWER);
    if (!isReviewer || (user.accountStatus as AccountStatus) !== AccountStatus.ACTIVE) {
      throw new ForbiddenException({
        code: STAGE3_ERROR_CODES.FORBIDDEN,
        message: "Active reviewer role required",
      });
    }
  }

  async assertPitchOwner(pitchId: string, userId: string): Promise<void> {
    const pitch = await this.prisma.pitch.findUnique({ where: { id: pitchId } });
    if (!pitch) {
      throw new NotFoundException({
        code: STAGE3_ERROR_CODES.NOT_FOUND,
        message: "Pitch not found",
      });
    }
    if (pitch.ownerId !== userId) {
      throw new ForbiddenException({
        code: STAGE3_ERROR_CODES.FORBIDDEN,
        message: "Not pitch owner",
      });
    }
  }

  async getPitchStateId(pitchId: string): Promise<string | null> {
    const pitch = await this.prisma.pitch.findUnique({
      where: { id: pitchId },
      select: { stateId: true },
    });
    return pitch?.stateId ?? null;
  }

  canAdminAccessPitchState(user: AuthenticatedUser, pitchStateId: string | null): boolean {
    if (this.rbac.isSuperAdmin(user) || this.rbac.isNationalAdmin(user)) {
      return true;
    }
    if (!pitchStateId) {
      return false;
    }
    const accessible = this.rbac.getAccessibleStateIds(user);
    if (accessible === "all") {
      return true;
    }
    return accessible.includes(pitchStateId);
  }

  canAdminAccessOrgState(user: AuthenticatedUser, orgStateId: string | null): boolean {
    return this.canAdminAccessPitchState(user, orgStateId);
  }

  async assertOrgMember(
    organizationId: string,
    userId: string,
    minRole?: SponsorMembershipRole,
  ): Promise<{ role: SponsorMembershipRole; status: SponsorMembershipStatus }> {
    const membership = await this.prisma.sponsorOrganizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!membership || (membership.status as SponsorMembershipStatus) !== SponsorMembershipStatus.ACTIVE) {
      throw new ForbiddenException({
        code: STAGE3_ERROR_CODES.FORBIDDEN,
        message: "Organization membership required",
      });
    }
    if (minRole) {
      const hierarchy = [SponsorMembershipRole.MEMBER, SponsorMembershipRole.ADMIN, SponsorMembershipRole.OWNER];
      const memberRole = membership.role as SponsorMembershipRole;
      if (hierarchy.indexOf(memberRole) < hierarchy.indexOf(minRole)) {
        throw new ForbiddenException({
          code: STAGE3_ERROR_CODES.FORBIDDEN,
          message: "Insufficient organization role",
        });
      }
    }
    return { role: membership.role as SponsorMembershipRole, status: membership.status as SponsorMembershipStatus };
  }

  async assertVerifiedSponsorMember(userId: string): Promise<string> {
    const memberships = await this.prisma.sponsorOrganizationMembership.findMany({
      where: {
        userId,
        status: SponsorMembershipStatus.ACTIVE,
        organization: { verificationStatus: SponsorVerificationStatus.VERIFIED },
      },
      select: { organizationId: true },
    });
    if (memberships.length === 0) {
      throw new ForbiddenException({
        code: STAGE3_ERROR_CODES.NOT_VERIFIED,
        message: "Verified sponsor organization membership required",
      });
    }
    const firstMembership = memberships[0];
    if (!firstMembership) {
      throw new ForbiddenException({
        code: STAGE3_ERROR_CODES.NOT_VERIFIED,
        message: "Verified sponsor organization membership required",
      });
    }
    return firstMembership.organizationId;
  }

  redactDiscoveryPitch<T extends Record<string, unknown>>(pitch: T): Omit<T, "ownerId" | "internalNotes" | "confidentialNotes"> {
    const { ownerId: _ownerId, internalNotes: _internalNotes, confidentialNotes: _confidentialNotes, ...rest } =
      pitch as T & { ownerId?: unknown; internalNotes?: unknown; confidentialNotes?: unknown };
    return rest;
  }
}
