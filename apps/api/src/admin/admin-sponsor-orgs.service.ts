import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import {
  AuditAction,
  SponsorVerificationStatus,
  STAGE3_ERROR_CODES,
  canTransitionVerification,
} from "@pitchdeck/contracts";
import { PRISMA_CLIENT } from "../database/database.module";
import type { AuthenticatedUser } from "../rbac/rbac.service";
import { RbacService } from "../rbac/rbac.service";
import { AuditService } from "../audit/audit.service";
import { Stage3ScopeService } from "../stage3/stage3-scope.service";
import { EmailService } from "../email/email.service";

@Injectable()
export class AdminSponsorOrgsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly rbac: RbacService,
    private readonly scope: Stage3ScopeService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
  ) {}

  async listOrganizations(user: AuthenticatedUser, filters: { status?: string; page?: number; pageSize?: number }) {
    this.rbac.assertAdminAccess(user);
    const accessible = this.rbac.getAccessibleStateIds(user);
    const where = {
      ...(filters.status ? { verificationStatus: filters.status as SponsorVerificationStatus } : {}),
      ...(accessible !== "all" ? { stateId: { in: accessible } } : {}),
    };
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const [total, items] = await Promise.all([
      this.prisma.sponsorOrganization.count({ where }),
      this.prisma.sponsorOrganization.findMany({
        where,
        include: { state: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { verificationSubmittedAt: "desc" },
      }),
    ]);
    return {
      items: items.map((o) => ({
        id: o.id,
        displayName: o.displayName,
        verificationStatus: o.verificationStatus,
        stateCode: o.state?.code,
        submittedAt: o.verificationSubmittedAt?.toISOString(),
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getOrganization(user: AuthenticatedUser, organizationId: string) {
    this.rbac.assertAdminAccess(user);
    const org = await this.prisma.sponsorOrganization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { state: true, verificationEvents: { orderBy: { createdAt: "desc" } }, memberships: { include: { user: true } } },
    });
    if (!this.scope.canAdminAccessOrgState(user, org.stateId)) {
      throw new ForbiddenException({ code: STAGE3_ERROR_CODES.FORBIDDEN, message: "Out of scope" });
    }
    return org;
  }

  async startReview(user: AuthenticatedUser, organizationId: string) {
    return this.transition(user, organizationId, SponsorVerificationStatus.UNDER_REVIEW);
  }

  async requestChanges(user: AuthenticatedUser, organizationId: string, reason: string) {
    return this.transition(user, organizationId, SponsorVerificationStatus.CHANGES_REQUESTED, reason);
  }

  async verify(user: AuthenticatedUser, organizationId: string) {
    const org = await this.transition(user, organizationId, SponsorVerificationStatus.VERIFIED);
    const owners = await this.prisma.sponsorOrganizationMembership.findMany({
      where: { organizationId, role: "OWNER", status: "ACTIVE" },
      include: { user: true },
    });
    for (const owner of owners) {
      await this.email.sendEmail({
        to: owner.user.email,
        subject: "Organisation verified — PitchDeck Nigeria",
        text: `Your organisation "${org.displayName}" has been verified.`,
        html: `<p>Your organisation "${org.displayName}" has been verified.</p>`,
      });
    }
    await this.audit.log({
      action: AuditAction.VERIFICATION_DECISION,
      entityType: "SponsorOrganization",
      entityId: organizationId,
      actorId: user.id,
      metadata: { decision: "VERIFIED" },
    });
    return org;
  }

  async reject(user: AuthenticatedUser, organizationId: string, reason: string) {
    const org = await this.transition(user, organizationId, SponsorVerificationStatus.REJECTED, reason);
    await this.audit.log({
      action: AuditAction.VERIFICATION_DECISION,
      entityType: "SponsorOrganization",
      entityId: organizationId,
      actorId: user.id,
      metadata: { decision: "REJECTED", reason },
    });
    return org;
  }

  async suspend(user: AuthenticatedUser, organizationId: string, reason: string) {
    return this.transition(user, organizationId, SponsorVerificationStatus.SUSPENDED, reason);
  }

  private async transition(
    user: AuthenticatedUser,
    organizationId: string,
    to: SponsorVerificationStatus,
    reason?: string,
  ) {
    this.rbac.assertAdminAccess(user);
    const org = await this.prisma.sponsorOrganization.findUniqueOrThrow({ where: { id: organizationId } });
    if (!this.scope.canAdminAccessOrgState(user, org.stateId)) {
      throw new ForbiddenException({ code: STAGE3_ERROR_CODES.FORBIDDEN, message: "Out of scope" });
    }
    const from = org.verificationStatus as SponsorVerificationStatus;
    if (!canTransitionVerification(from, to) && !(from === SponsorVerificationStatus.SUBMITTED && to === SponsorVerificationStatus.UNDER_REVIEW)) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.INVALID_TRANSITION,
        message: `Cannot transition from ${from} to ${to}`,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.sponsorVerificationEvent.create({
        data: { organizationId, fromStatus: from, toStatus: to, reason, actorId: user.id },
      });
      return tx.sponsorOrganization.update({
        where: { id: organizationId },
        data: {
          verificationStatus: to,
          verifiedAt: to === SponsorVerificationStatus.VERIFIED ? new Date() : org.verifiedAt,
          verifiedById: to === SponsorVerificationStatus.VERIFIED ? user.id : org.verifiedById,
          decisionReason: reason ?? org.decisionReason,
          suspendedAt: to === SponsorVerificationStatus.SUSPENDED ? new Date() : org.suspendedAt,
          suspendedReason: to === SponsorVerificationStatus.SUSPENDED ? reason : org.suspendedReason,
        },
      });
    });
  }
}
