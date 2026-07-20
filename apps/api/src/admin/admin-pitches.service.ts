import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import {
  AuditAction,
  PitchStatus,
  RoleType,
  ReviewAssignmentStatus,
  AccountStatus,
  STAGE3_ERROR_CODES,
  canTransitionPitch,
} from "@pitchdeck/contracts";
import { PRISMA_CLIENT } from "../database/database.module";
import type { AuthenticatedUser } from "../rbac/rbac.service";
import { RbacService } from "../rbac/rbac.service";
import { AuditService } from "../audit/audit.service";
import { Stage3ScopeService } from "../stage3/stage3-scope.service";
import { EmailService } from "../email/email.service";
import { ConfigService } from "@nestjs/config";
import type { EnvConfig } from "../config/env.schema";

@Injectable()
export class AdminPitchesService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly rbac: RbacService,
    private readonly scope: Stage3ScopeService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async listPitches(
    user: AuthenticatedUser,
    filters: { status?: string; stateId?: string; page?: number; pageSize?: number },
  ) {
    this.rbac.assertAdminAccess(user);
    const accessible = this.rbac.getAccessibleStateIds(user);
    const where = {
      ...(filters.status ? { status: filters.status as PitchStatus } : {}),
      ...(accessible !== "all" ? { stateId: { in: accessible } } : {}),
      ...(filters.stateId && accessible === "all" ? { stateId: filters.stateId } : {}),
    };
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const [total, items] = await Promise.all([
      this.prisma.pitch.count({ where }),
      this.prisma.pitch.findMany({
        where,
        include: { state: true, primarySector: true, owner: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { submittedAt: "desc" },
      }),
    ]);
    return {
      items: items.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        stateCode: p.state?.code,
        ownerEmail: p.owner.email,
        submittedAt: p.submittedAt?.toISOString(),
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getPitch(user: AuthenticatedUser, pitchId: string) {
    this.rbac.assertAdminAccess(user);
    const pitch = await this.prisma.pitch.findUniqueOrThrow({
      where: { id: pitchId },
      include: {
        state: true,
        submissions: { orderBy: { version: "desc" }, include: { reviewAssignments: true, reviews: true } },
        workflowEvents: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!this.scope.canAdminAccessPitchState(user, pitch.stateId)) {
      throw new ForbiddenException({ code: STAGE3_ERROR_CODES.FORBIDDEN, message: "Out of scope" });
    }
    return pitch;
  }

  async startReview(user: AuthenticatedUser, pitchId: string) {
    return this.transitionPitch(user, pitchId, PitchStatus.UNDER_REVIEW);
  }

  async assignReviewer(
    user: AuthenticatedUser,
    pitchId: string,
    reviewerId: string,
  ) {
    this.rbac.assertAdminAccess(user);
    const pitch = await this.getPitch(user, pitchId);
    const latestSubmission = pitch.submissions[0];
    if (!latestSubmission) {
      throw new BadRequestException({ code: STAGE3_ERROR_CODES.VALIDATION_FAILED, message: "No submission" });
    }

    const reviewerRoles = await this.rbac.getUserRoles(reviewerId);
    const isReviewer = reviewerRoles.some((r) => r.role === RoleType.REVIEWER);
    if (!isReviewer) {
      throw new BadRequestException({ code: STAGE3_ERROR_CODES.VALIDATION_FAILED, message: "Not a reviewer" });
    }

    const reviewer = await this.prisma.user.findUniqueOrThrow({ where: { id: reviewerId } });
    if ((reviewer.accountStatus as AccountStatus) !== AccountStatus.ACTIVE) {
      throw new BadRequestException({ code: STAGE3_ERROR_CODES.VALIDATION_FAILED, message: "Reviewer suspended" });
    }

    const assignment = await this.prisma.pitchReviewAssignment.create({
      data: {
        submissionId: latestSubmission.id,
        reviewerId,
        assignedById: user.id,
      },
    });

    await this.audit.log({
      action: AuditAction.REVIEWER_ASSIGN,
      entityType: "PitchReviewAssignment",
      entityId: assignment.id,
      actorId: user.id,
    });

    await this.email.sendEmail({
      to: reviewer.email,
      subject: "Pitch review assignment — PitchDeck Nigeria",
      text: `You have been assigned to review pitch "${pitch.title}".`,
      html: `<p>You have been assigned to review pitch "${pitch.title}".</p>`,
    });

    return assignment;
  }

  async revokeReviewer(user: AuthenticatedUser, pitchId: string, assignmentId: string, reason?: string) {
    this.rbac.assertAdminAccess(user);
    await this.getPitch(user, pitchId);
    await this.prisma.pitchReviewAssignment.update({
      where: { id: assignmentId },
      data: { status: ReviewAssignmentStatus.REVOKED, revokedAt: new Date(), revocationReason: reason },
    });
    await this.audit.log({
      action: AuditAction.REVIEWER_REVOKE,
      entityType: "PitchReviewAssignment",
      entityId: assignmentId,
      actorId: user.id,
    });
    return { revoked: true };
  }

  async requestChanges(user: AuthenticatedUser, pitchId: string, reason: string) {
    const pitch = await this.transitionPitch(user, pitchId, PitchStatus.CHANGES_REQUESTED, reason);
    const owner = await this.prisma.user.findUniqueOrThrow({ where: { id: pitch.ownerId } });
    const webBase = this.configService.get("WEB_BASE_URL", { infer: true });
    await this.email.sendEmail({
      to: owner.email,
      subject: "Changes requested on your pitch",
      text: `${reason}\n\nEdit your pitch: ${webBase}/innovator/pitches/${pitchId}`,
      html: `<p>${reason}</p><p><a href="${webBase}/innovator/pitches/${pitchId}">Edit pitch</a></p>`,
    });
    await this.audit.log({
      action: AuditAction.PITCH_CHANGE_REQUEST,
      entityType: "Pitch",
      entityId: pitchId,
      actorId: user.id,
      metadata: { reason },
    });
    return pitch;
  }

  async approve(user: AuthenticatedUser, pitchId: string) {
    const pitch = await this.transitionPitch(user, pitchId, PitchStatus.APPROVED);
    const owner = await this.prisma.user.findUniqueOrThrow({ where: { id: pitch.ownerId } });
    await this.email.sendEmail({
      to: owner.email,
      subject: "Your pitch has been approved",
      text: `Your pitch "${pitch.title}" has been approved.`,
      html: `<p>Your pitch "${pitch.title}" has been approved.</p>`,
    });
    await this.audit.log({ action: AuditAction.PITCH_APPROVE, entityType: "Pitch", entityId: pitchId, actorId: user.id });
    return pitch;
  }

  async reject(user: AuthenticatedUser, pitchId: string, reason: string) {
    const pitch = await this.transitionPitch(user, pitchId, PitchStatus.REJECTED, reason);
    const owner = await this.prisma.user.findUniqueOrThrow({ where: { id: pitch.ownerId } });
    await this.email.sendEmail({
      to: owner.email,
      subject: "Your pitch was not approved",
      text: reason,
      html: `<p>${reason}</p>`,
    });
    await this.audit.log({ action: AuditAction.PITCH_REJECT, entityType: "Pitch", entityId: pitchId, actorId: user.id });
    return pitch;
  }

  async reopen(user: AuthenticatedUser, pitchId: string) {
    return this.transitionPitch(user, pitchId, PitchStatus.CHANGES_REQUESTED, "Reopened by admin");
  }

  async suspendDiscovery(user: AuthenticatedUser, pitchId: string) {
    this.rbac.assertAdminAccess(user);
    await this.getPitch(user, pitchId);
    await this.prisma.pitch.update({
      where: { id: pitchId },
      data: { discoverySuspended: true },
    });
    await this.audit.log({
      action: AuditAction.DISCOVERY_SUSPEND,
      entityType: "Pitch",
      entityId: pitchId,
      actorId: user.id,
    });
    return { discoverySuspended: true };
  }

  private async transitionPitch(
    user: AuthenticatedUser,
    pitchId: string,
    to: PitchStatus,
    reason?: string,
  ) {
    this.rbac.assertAdminAccess(user);
    const pitch = await this.prisma.pitch.findUniqueOrThrow({ where: { id: pitchId } });
    if (!this.scope.canAdminAccessPitchState(user, pitch.stateId)) {
      throw new ForbiddenException({ code: STAGE3_ERROR_CODES.FORBIDDEN, message: "Out of scope" });
    }
    const from = pitch.status as PitchStatus;
    if (!canTransitionPitch(from, to) && !(from === PitchStatus.SUBMITTED && to === PitchStatus.UNDER_REVIEW)) {
      if (from === PitchStatus.SUBMITTED && to === PitchStatus.UNDER_REVIEW) {
        // allowed
      } else if (!canTransitionPitch(from, to)) {
        throw new BadRequestException({
          code: STAGE3_ERROR_CODES.INVALID_TRANSITION,
          message: `Cannot transition from ${from} to ${to}`,
        });
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.pitchWorkflowEvent.create({
        data: { pitchId, fromStatus: from, toStatus: to, reason, actorId: user.id },
      });
      const latestSubmission = await tx.pitchSubmission.findFirst({
        where: { pitchId },
        orderBy: { version: "desc" },
      });
      if (latestSubmission) {
        await tx.pitchSubmission.update({
          where: { id: latestSubmission.id },
          data: { reviewStatus: to, decisionAt: [PitchStatus.APPROVED, PitchStatus.REJECTED].includes(to) ? new Date() : undefined },
        });
      }
      return tx.pitch.update({
        where: { id: pitchId },
        data: {
          status: to,
          approvedAt: to === PitchStatus.APPROVED ? new Date() : pitch.approvedAt,
          rejectedAt: to === PitchStatus.REJECTED ? new Date() : pitch.rejectedAt,
        },
      });
    });

    return updated;
  }
}
