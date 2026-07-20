import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import type { PrismaClient, Prisma } from "@prisma/client";
import {
  AuditAction,
  SponsorVerificationStatus,
  SponsorMembershipRole,
  SponsorMembershipStatus,
  OrganizationType,
  STAGE3_ERROR_CODES,
  canTransitionVerification,
  type SponsorOrganizationDto,
  type SponsorMembershipDto,
} from "@pitchdeck/contracts";
import { PRISMA_CLIENT } from "../database/database.module";
import type { AuthenticatedUser } from "../rbac/rbac.service";
import { AuditService } from "../audit/audit.service";
import { Stage3ScopeService } from "../stage3/stage3-scope.service";

function orgSlug(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80)}-${Date.now().toString(36)}`;
}

@Injectable()
export class SponsorService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly scope: Stage3ScopeService,
    private readonly audit: AuditService,
  ) {}

  async listOrganizations(user: AuthenticatedUser): Promise<SponsorOrganizationDto[]> {
    this.scope.assertSponsor(user);
    const memberships = await this.prisma.sponsorOrganizationMembership.findMany({
      where: { userId: user.id, status: SponsorMembershipStatus.ACTIVE },
      include: {
        organization: { include: { sectors: true, state: true } },
      },
    });
    return memberships.map((m) => this.toOrgDto(m.organization));
  }

  async createOrganization(
    user: AuthenticatedUser,
    input: {
      legalName: string;
      displayName: string;
      organizationType: OrganizationType;
      description?: string;
      websiteUrl?: string;
      stateId?: string;
      city?: string;
    },
  ): Promise<SponsorOrganizationDto> {
    this.scope.assertSponsor(user);
    const org = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sponsorOrganization.create({
        data: {
          legalName: input.legalName,
          displayName: input.displayName,
          slug: orgSlug(input.displayName),
          organizationType: input.organizationType,
          description: input.description,
          websiteUrl: input.websiteUrl || null,
          stateId: input.stateId,
          city: input.city,
        },
        include: { sectors: true, state: true },
      });
      await tx.sponsorOrganizationMembership.create({
        data: {
          organizationId: created.id,
          userId: user.id,
          role: SponsorMembershipRole.OWNER,
          addedById: user.id,
        },
      });
      await tx.sponsorVerificationEvent.create({
        data: {
          organizationId: created.id,
          toStatus: SponsorVerificationStatus.DRAFT,
          actorId: user.id,
        },
      });
      return created;
    });

    await this.audit.log({
      action: AuditAction.ORGANIZATION_CREATE,
      entityType: "SponsorOrganization",
      entityId: org.id,
      actorId: user.id,
    });

    return this.toOrgDto(org);
  }

  async getOrganization(user: AuthenticatedUser, organizationId: string): Promise<SponsorOrganizationDto> {
    await this.scope.assertOrgMember(organizationId, user.id);
    const org = await this.prisma.sponsorOrganization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { sectors: true, state: true },
    });
    return this.toOrgDto(org);
  }

  async updateOrganization(
    user: AuthenticatedUser,
    organizationId: string,
    input: Record<string, unknown>,
  ): Promise<SponsorOrganizationDto> {
    await this.scope.assertOrgMember(organizationId, user.id, SponsorMembershipRole.ADMIN);
    const org = await this.prisma.sponsorOrganization.findUniqueOrThrow({
      where: { id: organizationId },
    });

    if (![SponsorVerificationStatus.DRAFT, SponsorVerificationStatus.CHANGES_REQUESTED].includes(
      org.verificationStatus as SponsorVerificationStatus,
    )) {
      throw new ForbiddenException({
        code: STAGE3_ERROR_CODES.FORBIDDEN,
        message: "Organization not editable in current verification status",
      });
    }

    const lockVersion = input.lockVersion as number | undefined;
    if (lockVersion !== undefined && lockVersion !== org.lockVersion) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.CONFLICT_VERSION,
        message: "Organization was modified by another session",
      });
    }

    const updated = await this.prisma.sponsorOrganization.update({
      where: { id: organizationId },
      data: {
        legalName: input.legalName as string | undefined,
        displayName: input.displayName as string | undefined,
        description: input.description as string | undefined,
        websiteUrl: (input.websiteUrl as string) || undefined,
        stateId: input.stateId as string | undefined,
        city: input.city as string | undefined,
        registrationNumber: input.registrationNumber as string | undefined,
        yearEstablished: input.yearEstablished as number | undefined,
        fundingInterest: input.fundingInterest as string | undefined,
        lockVersion: { increment: 1 },
      },
      include: { sectors: true, state: true },
    });

    await this.audit.log({
      action: AuditAction.ORGANIZATION_UPDATE,
      entityType: "SponsorOrganization",
      entityId: organizationId,
      actorId: user.id,
    });

    return this.toOrgDto(updated);
  }

  async listMembers(user: AuthenticatedUser, organizationId: string): Promise<SponsorMembershipDto[]> {
    await this.scope.assertOrgMember(organizationId, user.id);
    const members = await this.prisma.sponsorOrganizationMembership.findMany({
      where: { organizationId, status: { not: SponsorMembershipStatus.REMOVED } },
      include: { user: true },
    });
    return members.map((m) => ({
      id: m.id,
      organizationId: m.organizationId,
      userId: m.userId,
      userEmail: m.user.email,
      userName: `${m.user.firstName} ${m.user.lastName}`,
      role: m.role as SponsorMembershipRole,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async addMember(
    user: AuthenticatedUser,
    organizationId: string,
    input: { email: string; role: SponsorMembershipRole },
  ): Promise<SponsorMembershipDto> {
    await this.scope.assertOrgMember(organizationId, user.id, SponsorMembershipRole.ADMIN);
    const targetUser = await this.prisma.user.findUnique({
      where: { emailNormalized: input.email.toLowerCase() },
    });
    if (!targetUser) {
      throw new NotFoundException({
        code: STAGE3_ERROR_CODES.NOT_FOUND,
        message: "User not found",
      });
    }

    const membership = await this.prisma.sponsorOrganizationMembership.upsert({
      where: { organizationId_userId: { organizationId, userId: targetUser.id } },
      create: {
        organizationId,
        userId: targetUser.id,
        role: input.role,
        addedById: user.id,
      },
      update: {
        role: input.role,
        status: SponsorMembershipStatus.ACTIVE,
      },
      include: { user: true },
    });

    await this.audit.log({
      action: AuditAction.MEMBERSHIP_CHANGE,
      entityType: "SponsorOrganizationMembership",
      entityId: membership.id,
      actorId: user.id,
    });

    return {
      id: membership.id,
      organizationId,
      userId: targetUser.id,
      userEmail: targetUser.email,
      userName: `${targetUser.firstName} ${targetUser.lastName}`,
      role: membership.role as SponsorMembershipRole,
      status: membership.status,
      createdAt: membership.createdAt.toISOString(),
    };
  }

  async removeMember(
    user: AuthenticatedUser,
    organizationId: string,
    membershipId: string,
  ): Promise<void> {
    await this.scope.assertOrgMember(organizationId, user.id, SponsorMembershipRole.ADMIN);
    const membership = await this.prisma.sponsorOrganizationMembership.findUniqueOrThrow({
      where: { id: membershipId },
    });

    if ((membership.role as SponsorMembershipRole) === SponsorMembershipRole.OWNER) {
      const ownerCount = await this.prisma.sponsorOrganizationMembership.count({
        where: {
          organizationId,
          role: SponsorMembershipRole.OWNER,
          status: SponsorMembershipStatus.ACTIVE,
        },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException({
          code: STAGE3_ERROR_CODES.FORBIDDEN,
          message: "Cannot remove the final owner",
        });
      }
    }

    await this.prisma.sponsorOrganizationMembership.update({
      where: { id: membershipId },
      data: { status: SponsorMembershipStatus.REMOVED },
    });

    await this.audit.log({
      action: AuditAction.MEMBERSHIP_CHANGE,
      entityType: "SponsorOrganizationMembership",
      entityId: membershipId,
      actorId: user.id,
      metadata: { action: "remove" },
    });
  }

  async getVerification(user: AuthenticatedUser, organizationId: string) {
    await this.scope.assertOrgMember(organizationId, user.id);
    const org = await this.prisma.sponsorOrganization.findUniqueOrThrow({
      where: { id: organizationId },
    });
    const events = await this.prisma.sponsorVerificationEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return {
      status: org.verificationStatus,
      submittedAt: org.verificationSubmittedAt?.toISOString(),
      verifiedAt: org.verifiedAt?.toISOString(),
      decisionReason: org.decisionReason,
      events: events.map((e) => ({
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        reason: e.reason,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  async submitVerification(user: AuthenticatedUser, organizationId: string) {
    await this.scope.assertOrgMember(organizationId, user.id, SponsorMembershipRole.ADMIN);
    const org = await this.prisma.sponsorOrganization.findUniqueOrThrow({
      where: { id: organizationId },
    });
    const from = org.verificationStatus as SponsorVerificationStatus;
    if (!canTransitionVerification(from, SponsorVerificationStatus.SUBMITTED)) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.INVALID_TRANSITION,
        message: "Cannot submit verification",
      });
    }

    const requiredDocs = await this.prisma.fileAsset.count({
      where: {
        organizationId,
        purpose: "SPONSOR_REGISTRATION_CERT",
        uploadStatus: "AVAILABLE",
        scanStatus: "CLEAN",
        deletedAt: null,
      },
    });
    if (requiredDocs === 0) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.VALIDATION_FAILED,
        message: "Registration certificate required",
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.sponsorOrganization.update({
        where: { id: organizationId },
        data: {
          verificationStatus: SponsorVerificationStatus.SUBMITTED,
          verificationSubmittedAt: new Date(),
        },
      });
      await tx.sponsorVerificationEvent.create({
        data: {
          organizationId,
          fromStatus: from,
          toStatus: SponsorVerificationStatus.SUBMITTED,
          actorId: user.id,
        },
      });
    });

    await this.audit.log({
      action: AuditAction.VERIFICATION_SUBMIT,
      entityType: "SponsorOrganization",
      entityId: organizationId,
      actorId: user.id,
    });

    return this.getVerification(user, organizationId);
  }

  private toOrgDto(org: {
    id: string;
    legalName: string;
    displayName: string;
    slug: string;
    organizationType: string;
    description: string | null;
    websiteUrl: string | null;
    countryCode: string;
    stateId: string | null;
    city: string | null;
    registrationNumber: string | null;
    yearEstablished: number | null;
    fundingInterest: string | null;
    minFundingAmount: Prisma.Decimal | null;
    maxFundingAmount: Prisma.Decimal | null;
    preferredStages: string[];
    preferredStateCodes: string[];
    verificationStatus: string;
    verificationSubmittedAt: Date | null;
    verifiedAt: Date | null;
    decisionReason: string | null;
    lockVersion: number;
    createdAt: Date;
    updatedAt: Date;
    sectors: Array<{ sectorId: string }>;
    state?: { code: string } | null;
  }): SponsorOrganizationDto {
    return {
      id: org.id,
      legalName: org.legalName,
      displayName: org.displayName,
      slug: org.slug,
      organizationType: org.organizationType as OrganizationType,
      description: org.description ?? undefined,
      websiteUrl: org.websiteUrl ?? undefined,
      countryCode: org.countryCode,
      stateId: org.stateId ?? undefined,
      stateCode: org.state?.code,
      city: org.city ?? undefined,
      registrationNumber: org.registrationNumber ?? undefined,
      yearEstablished: org.yearEstablished ?? undefined,
      fundingInterest: org.fundingInterest ?? undefined,
      minFundingAmount: org.minFundingAmount?.toString(),
      maxFundingAmount: org.maxFundingAmount?.toString(),
      preferredStages: org.preferredStages as never[],
      preferredStateCodes: org.preferredStateCodes,
      sectorIds: org.sectors.map((s) => s.sectorId),
      verificationStatus: org.verificationStatus as SponsorVerificationStatus,
      verificationSubmittedAt: org.verificationSubmittedAt?.toISOString(),
      verifiedAt: org.verifiedAt?.toISOString(),
      decisionReason: org.decisionReason ?? undefined,
      lockVersion: org.lockVersion,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    };
  }
}
