import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PrismaClient, Pitch, Prisma } from "@prisma/client";
import {
  AuditAction,
  PitchStatus,
  FileUploadStatus,
  FileScanStatus,
  STAGE3_ERROR_CODES,
  calculatePitchCompleteness,
  canTransitionPitch,
  type PitchDto,
  type PitchSubmissionDto,
  type CompletenessResult,
  InnovationStage,
} from "@pitchdeck/contracts";
import { PRISMA_CLIENT } from "../database/database.module";
import type { EnvConfig } from "../config/env.schema";
import type { AuthenticatedUser } from "../rbac/rbac.service";
import { AuditService } from "../audit/audit.service";
import { Stage3ScopeService } from "../stage3/stage3-scope.service";
import { Stage3RateLimitService } from "../stage3/stage3-rate-limit.service";
import { InnovatorService } from "../innovator/innovator.service";
import { EmailService } from "../email/email.service";

function slugify(title: string): string {
  return `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180)}-${Date.now().toString(36)}`;
}

@Injectable()
export class PitchesService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly scope: Stage3ScopeService,
    private readonly audit: AuditService,
    private readonly innovatorService: InnovatorService,
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly rateLimit: Stage3RateLimitService,
    private readonly email: EmailService,
  ) {}

  async list(user: AuthenticatedUser): Promise<PitchDto[]> {
    this.scope.assertInnovator(user);
    const pitches = await this.prisma.pitch.findMany({
      where: { ownerId: user.id },
      include: { additionalSectors: true, state: true },
      orderBy: { updatedAt: "desc" },
    });
    return pitches.map((p) => this.toDto(p));
  }

  async create(user: AuthenticatedUser, title: string): Promise<PitchDto> {
    this.scope.assertInnovator(user);
    await this.rateLimit.pitchCreate(user.id);
    const pitch = await this.prisma.pitch.create({
      data: {
        ownerId: user.id,
        title,
        slug: slugify(title),
      },
      include: { additionalSectors: true, state: true },
    });
    await this.audit.log({
      action: AuditAction.PITCH_CREATE,
      entityType: "Pitch",
      entityId: pitch.id,
      actorId: user.id,
    });
    return this.toDto(pitch);
  }

  async get(user: AuthenticatedUser, pitchId: string): Promise<PitchDto> {
    await this.scope.assertPitchOwner(pitchId, user.id);
    const pitch = await this.getPitchOrThrow(pitchId);
    return this.toDto(pitch);
  }

  async update(
    user: AuthenticatedUser,
    pitchId: string,
    input: Record<string, unknown>,
  ): Promise<PitchDto> {
    await this.scope.assertPitchOwner(pitchId, user.id);
    const pitch = await this.getPitchOrThrow(pitchId);

    if (![PitchStatus.DRAFT, PitchStatus.CHANGES_REQUESTED].includes(pitch.status as PitchStatus)) {
      throw new ForbiddenException({
        code: STAGE3_ERROR_CODES.FORBIDDEN,
        message: "Pitch is not editable",
      });
    }

    const lockVersion = input.lockVersion as number;
    if (lockVersion !== pitch.lockVersion) {
      throw new ConflictException({
        code: STAGE3_ERROR_CODES.CONFLICT_VERSION,
        message: "Pitch was modified by another session",
      });
    }

    const additionalSectorIds = input.additionalSectorIds as string[] | undefined;
    const updateData: Prisma.PitchUpdateInput = {
      title: input.title as string | undefined,
      shortSummary: input.shortSummary as string | undefined,
      problemStatement: input.problemStatement as string | undefined,
      proposedSolution: input.proposedSolution as string | undefined,
      targetUsers: input.targetUsers as string | undefined,
      innovationStage: input.innovationStage as never,
      geographicReach: input.geographicReach as string | undefined,
      businessModel: input.businessModel as string | undefined,
      competitiveAdvantage: input.competitiveAdvantage as string | undefined,
      currentTraction: input.currentTraction as string | undefined,
      teamDescription: input.teamDescription as string | undefined,
      socialImpact: input.socialImpact as string | undefined,
      scalability: input.scalability as string | undefined,
      risksAndMitigations: input.risksAndMitigations as string | undefined,
      ipStatus: input.ipStatus as string | undefined,
      useOfFunds: input.useOfFunds as string | undefined,
      expectedMilestones: input.expectedMilestones as string | undefined,
      developmentTimeline: input.developmentTimeline as string | undefined,
      termsAccepted: input.termsAccepted as boolean | undefined,
      lockVersion: { increment: 1 },
    };

    if (input.primarySectorId) {
      updateData.primarySector = { connect: { id: input.primarySectorId as string } };
    }
    if (input.stateId) {
      updateData.state = { connect: { id: input.stateId as string } };
    }
    if (input.fundingAmountRequested) {
      updateData.fundingAmountRequested = input.fundingAmountRequested;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.pitch.update({
        where: { id: pitchId },
        data: updateData,
        include: { additionalSectors: true, state: true },
      });

      if (additionalSectorIds) {
        await tx.pitchSector.deleteMany({ where: { pitchId } });
        if (additionalSectorIds.length > 0) {
          await tx.pitchSector.createMany({
            data: additionalSectorIds.map((sectorId) => ({ pitchId, sectorId })),
          });
        }
      }

      return tx.pitch.findUniqueOrThrow({
        where: { id: pitchId },
        include: { additionalSectors: true, state: true },
      });
    });

    await this.audit.log({
      action: AuditAction.PITCH_UPDATE,
      entityType: "Pitch",
      entityId: pitchId,
      actorId: user.id,
    });

    return this.toDto(updated);
  }

  async delete(user: AuthenticatedUser, pitchId: string): Promise<void> {
    await this.scope.assertPitchOwner(pitchId, user.id);
    const pitch = await this.getPitchOrThrow(pitchId);
    if ((pitch.status as PitchStatus) !== PitchStatus.DRAFT || pitch.lastSubmittedVersion) {
      throw new ForbiddenException({
        code: STAGE3_ERROR_CODES.FORBIDDEN,
        message: "Only unsaved drafts can be deleted",
      });
    }
    await this.prisma.pitch.delete({ where: { id: pitchId } });
    await this.audit.log({
      action: AuditAction.DELETE,
      entityType: "Pitch",
      entityId: pitchId,
      actorId: user.id,
    });
  }

  async getCompleteness(user: AuthenticatedUser, pitchId: string): Promise<CompletenessResult> {
    await this.scope.assertPitchOwner(pitchId, user.id);
    return this.computeCompleteness(pitchId, user.id);
  }

  async submit(user: AuthenticatedUser, pitchId: string): Promise<PitchSubmissionDto> {
    await this.scope.assertPitchOwner(pitchId, user.id);
    await this.rateLimit.pitchSubmit(user.id);
    const pitch = await this.getPitchOrThrow(pitchId);
    const status = pitch.status as PitchStatus;

    if (!canTransitionPitch(status, PitchStatus.SUBMITTED)) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.INVALID_TRANSITION,
        message: `Cannot submit from status ${status}`,
      });
    }

    const completeness = await this.computeCompleteness(pitchId, user.id);
    if (completeness.blockingIssues.length > 0) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.INCOMPLETE_PITCH,
        message: "Pitch is incomplete",
        details: completeness,
      });
    }

    const nextVersion = (pitch.lastSubmittedVersion ?? 0) + 1;
    const snapshot = this.buildSnapshot(pitch);
    const profileCompletion = await this.innovatorService.getProfileCompletionForUser(user.id);

    const submission = await this.prisma.$transaction(async (tx) => {
      const files = await tx.fileAsset.findMany({
        where: {
          pitchId,
          uploadStatus: FileUploadStatus.AVAILABLE,
          scanStatus: FileScanStatus.CLEAN,
          deletedAt: null,
        },
      });

      const created = await tx.pitchSubmission.create({
        data: {
          pitchId,
          version: nextVersion,
          submittedById: user.id,
          snapshot,
          profileCompletionAtSubmit: profileCompletion,
          reviewStatus: PitchStatus.SUBMITTED,
        },
      });

      if (files.length > 0) {
        await tx.pitchSubmissionDocument.createMany({
          data: files.map((f) => ({
            submissionId: created.id,
            fileAssetId: f.id,
            purpose: f.purpose,
          })),
        });
      }

      await tx.pitch.update({
        where: { id: pitchId },
        data: {
          status: PitchStatus.SUBMITTED,
          lastSubmittedVersion: nextVersion,
          submittedAt: new Date(),
          lockVersion: { increment: 1 },
        },
      });

      await tx.pitchWorkflowEvent.create({
        data: {
          pitchId,
          fromStatus: status,
          toStatus: PitchStatus.SUBMITTED,
          actorId: user.id,
        },
      });

      return created;
    });

    await this.audit.log({
      action: AuditAction.PITCH_SUBMIT,
      entityType: "PitchSubmission",
      entityId: submission.id,
      actorId: user.id,
      metadata: { version: nextVersion },
    });

    const webBase = this.configService.get("WEB_BASE_URL", { infer: true });
    const pitchUrl = `${webBase}/innovator/pitches/${pitchId}`;
    const emailContent = this.email.buildPitchSubmittedEmail(pitch.title, pitchUrl);
    await this.email.sendEmail({ to: user.email, ...emailContent });

    return this.toSubmissionDto(submission, []);
  }

  async withdraw(user: AuthenticatedUser, pitchId: string): Promise<PitchDto> {
    await this.scope.assertPitchOwner(pitchId, user.id);
    const pitch = await this.getPitchOrThrow(pitchId);
    if (!canTransitionPitch(pitch.status as PitchStatus, PitchStatus.WITHDRAWN)) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.INVALID_TRANSITION,
        message: "Cannot withdraw pitch in current status",
      });
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.pitchWorkflowEvent.create({
        data: {
          pitchId,
          fromStatus: pitch.status,
          toStatus: PitchStatus.WITHDRAWN,
          actorId: user.id,
        },
      });
      return tx.pitch.update({
        where: { id: pitchId },
        data: { status: PitchStatus.WITHDRAWN, withdrawnAt: new Date() },
        include: { additionalSectors: true, state: true },
      });
    });
    await this.audit.log({
      action: AuditAction.PITCH_WITHDRAW,
      entityType: "Pitch",
      entityId: pitchId,
      actorId: user.id,
    });
    return this.toDto(updated);
  }

  async resubmit(user: AuthenticatedUser, pitchId: string): Promise<PitchSubmissionDto> {
    const pitch = await this.getPitchOrThrow(pitchId);
    await this.scope.assertPitchOwner(pitchId, user.id);
    if ((pitch.status as PitchStatus) !== PitchStatus.CHANGES_REQUESTED) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.INVALID_TRANSITION,
        message: "Resubmit only allowed after changes requested",
      });
    }
    return this.submit(user, pitchId);
  }

  async listSubmissions(user: AuthenticatedUser, pitchId: string): Promise<PitchSubmissionDto[]> {
    await this.scope.assertPitchOwner(pitchId, user.id);
    const submissions = await this.prisma.pitchSubmission.findMany({
      where: { pitchId },
      include: { documents: true },
      orderBy: { version: "desc" },
    });
    return submissions.map((s) =>
      this.toSubmissionDto(s, s.documents.map((d) => d.fileAssetId)),
    );
  }

  async getSubmission(
    user: AuthenticatedUser,
    pitchId: string,
    version: number,
  ): Promise<PitchSubmissionDto> {
    await this.scope.assertPitchOwner(pitchId, user.id);
    const submission = await this.prisma.pitchSubmission.findUnique({
      where: { pitchId_version: { pitchId, version } },
      include: { documents: true },
    });
    if (!submission) {
      throw new NotFoundException({
        code: STAGE3_ERROR_CODES.NOT_FOUND,
        message: "Submission not found",
      });
    }
    return this.toSubmissionDto(submission, submission.documents.map((d) => d.fileAssetId));
  }

  private async computeCompleteness(pitchId: string, userId: string): Promise<CompletenessResult> {
    const pitch = await this.getPitchOrThrow(pitchId);
    const hasDeck = await this.prisma.fileAsset.count({
      where: {
        pitchId,
        purpose: "PITCH_DECK",
        uploadStatus: FileUploadStatus.AVAILABLE,
        scanStatus: FileScanStatus.CLEAN,
        deletedAt: null,
      },
    });
    const profileCompletion = await this.innovatorService.getProfileCompletionForUser(userId);
    const minProfile = this.configService.get("PITCH_MIN_PROFILE_COMPLETION", { infer: true });

    return calculatePitchCompleteness({
      title: pitch.title,
      shortSummary: pitch.shortSummary,
      problemStatement: pitch.problemStatement,
      proposedSolution: pitch.proposedSolution,
      targetUsers: pitch.targetUsers,
      innovationStage: pitch.innovationStage,
      primarySectorId: pitch.primarySectorId,
      stateId: pitch.stateId,
      businessModel: pitch.businessModel,
      fundingAmountRequested: pitch.fundingAmountRequested?.toString(),
      useOfFunds: pitch.useOfFunds,
      termsAccepted: pitch.termsAccepted,
      hasPitchDeck: hasDeck > 0,
      profileCompletionPercent: profileCompletion,
      minProfileCompletion: minProfile,
    });
  }

  private buildSnapshot(pitch: Pitch & { additionalSectors?: Array<{ sectorId: string }> }) {
    return {
      title: pitch.title,
      shortSummary: pitch.shortSummary,
      problemStatement: pitch.problemStatement,
      proposedSolution: pitch.proposedSolution,
      targetUsers: pitch.targetUsers,
      innovationStage: pitch.innovationStage,
      primarySectorId: pitch.primarySectorId,
      additionalSectorIds: pitch.additionalSectors?.map((s) => s.sectorId) ?? [],
      stateId: pitch.stateId,
      geographicReach: pitch.geographicReach,
      businessModel: pitch.businessModel,
      competitiveAdvantage: pitch.competitiveAdvantage,
      currentTraction: pitch.currentTraction,
      teamDescription: pitch.teamDescription,
      socialImpact: pitch.socialImpact,
      scalability: pitch.scalability,
      risksAndMitigations: pitch.risksAndMitigations,
      ipStatus: pitch.ipStatus,
      fundingAmountRequested: pitch.fundingAmountRequested?.toString(),
      fundingCurrency: pitch.fundingCurrency,
      useOfFunds: pitch.useOfFunds,
      expectedMilestones: pitch.expectedMilestones,
      developmentTimeline: pitch.developmentTimeline,
    };
  }

  private async getPitchOrThrow(pitchId: string) {
    const pitch = await this.prisma.pitch.findUnique({
      where: { id: pitchId },
      include: { additionalSectors: true, state: true },
    });
    if (!pitch) {
      throw new NotFoundException({
        code: STAGE3_ERROR_CODES.NOT_FOUND,
        message: "Pitch not found",
      });
    }
    return pitch;
  }

  private toDto(
    pitch: Pitch & {
      additionalSectors: Array<{ sectorId: string }>;
      state?: { code: string } | null;
    },
  ): PitchDto {
    return {
      id: pitch.id,
      ownerId: pitch.ownerId,
      title: pitch.title,
      slug: pitch.slug,
      shortSummary: pitch.shortSummary ?? undefined,
      problemStatement: pitch.problemStatement ?? undefined,
      proposedSolution: pitch.proposedSolution ?? undefined,
      targetUsers: pitch.targetUsers ?? undefined,
      innovationStage: (pitch.innovationStage as InnovationStage | null) ?? undefined,
      primarySectorId: pitch.primarySectorId ?? undefined,
      additionalSectorIds: pitch.additionalSectors.map((s) => s.sectorId),
      stateId: pitch.stateId ?? undefined,
      stateCode: pitch.state?.code,
      geographicReach: pitch.geographicReach ?? undefined,
      businessModel: pitch.businessModel ?? undefined,
      competitiveAdvantage: pitch.competitiveAdvantage ?? undefined,
      currentTraction: pitch.currentTraction ?? undefined,
      teamDescription: pitch.teamDescription ?? undefined,
      socialImpact: pitch.socialImpact ?? undefined,
      scalability: pitch.scalability ?? undefined,
      risksAndMitigations: pitch.risksAndMitigations ?? undefined,
      ipStatus: pitch.ipStatus ?? undefined,
      fundingAmountRequested: pitch.fundingAmountRequested?.toString(),
      fundingCurrency: pitch.fundingCurrency,
      useOfFunds: pitch.useOfFunds ?? undefined,
      expectedMilestones: pitch.expectedMilestones ?? undefined,
      developmentTimeline: pitch.developmentTimeline ?? undefined,
      termsAccepted: pitch.termsAccepted,
      status: pitch.status as PitchStatus,
      currentDraftVersion: pitch.currentDraftVersion,
      lastSubmittedVersion: pitch.lastSubmittedVersion ?? undefined,
      lockVersion: pitch.lockVersion,
      submittedAt: pitch.submittedAt?.toISOString(),
      approvedAt: pitch.approvedAt?.toISOString(),
      rejectedAt: pitch.rejectedAt?.toISOString(),
      withdrawnAt: pitch.withdrawnAt?.toISOString(),
      discoverySuspended: pitch.discoverySuspended,
      createdAt: pitch.createdAt.toISOString(),
      updatedAt: pitch.updatedAt.toISOString(),
    };
  }

  private toSubmissionDto(
    submission: {
      id: string;
      pitchId: string;
      version: number;
      submittedById: string;
      submittedAt: Date;
      snapshot: unknown;
      profileCompletionAtSubmit: number;
      reviewStatus: string;
      decisionAt: Date | null;
    },
    documentIds: string[],
  ): PitchSubmissionDto {
    return {
      id: submission.id,
      pitchId: submission.pitchId,
      version: submission.version,
      submittedById: submission.submittedById,
      submittedAt: submission.submittedAt.toISOString(),
      snapshot: submission.snapshot as Record<string, unknown>,
      profileCompletionAtSubmit: submission.profileCompletionAtSubmit,
      reviewStatus: submission.reviewStatus as PitchStatus,
      decisionAt: submission.decisionAt?.toISOString(),
      documentIds,
    };
  }
}
