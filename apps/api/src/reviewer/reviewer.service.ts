import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import {
  AuditAction,
  ConflictStatus,
  ReviewAssignmentStatus,
  ReviewRecommendation,
  STAGE3_ERROR_CODES,
  calculateReviewAverage,
  type ReviewAssignmentDto,
  type PitchReviewDto,
} from "@pitchdeck/contracts";
import { PRISMA_CLIENT } from "../database/database.module";
import type { AuthenticatedUser } from "../rbac/rbac.service";
import { AuditService } from "../audit/audit.service";
import { Stage3ScopeService } from "../stage3/stage3-scope.service";
import { RateLimitService } from "../rate-limit/rate-limit.service";

@Injectable()
export class ReviewerService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly scope: Stage3ScopeService,
    private readonly audit: AuditService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async listAssignments(user: AuthenticatedUser): Promise<ReviewAssignmentDto[]> {
    this.scope.assertReviewer(user);
    const assignments = await this.prisma.pitchReviewAssignment.findMany({
      where: { reviewerId: user.id, status: { not: ReviewAssignmentStatus.REVOKED } },
      include: { submission: { include: { pitch: true } } },
      orderBy: { assignedAt: "desc" },
    });
    return assignments.map((a) => ({
      id: a.id,
      submissionId: a.submissionId,
      pitchId: a.submission.pitchId,
      pitchTitle: a.submission.pitch.title,
      reviewerId: a.reviewerId,
      status: a.status as ReviewAssignmentStatus,
      conflictStatus: a.conflictStatus as ConflictStatus,
      assignedAt: a.assignedAt.toISOString(),
      dueAt: a.dueAt?.toISOString(),
      acceptedAt: a.acceptedAt?.toISOString(),
      completedAt: a.completedAt?.toISOString(),
    }));
  }

  async getAssignment(user: AuthenticatedUser, assignmentId: string) {
    this.scope.assertReviewer(user);
    const assignment = await this.getOwnedAssignment(assignmentId, user.id);
    const submission = await this.prisma.pitchSubmission.findUniqueOrThrow({
      where: { id: assignment.submissionId },
      include: { documents: true, pitch: true },
    });
    return {
      assignment: {
        id: assignment.id,
        status: assignment.status,
        conflictStatus: assignment.conflictStatus,
        conflictExplanation: assignment.conflictExplanation,
      },
      submission: {
        id: submission.id,
        version: submission.version,
        snapshot: submission.snapshot,
        documentIds: submission.documents.map((d) => d.fileAssetId),
      },
      pitch: { id: submission.pitch.id, title: submission.pitch.title },
    };
  }

  async accept(user: AuthenticatedUser, assignmentId: string) {
    const assignment = await this.getOwnedAssignment(assignmentId, user.id);
    if ((assignment.conflictStatus as ConflictStatus) === ConflictStatus.CONFIRMED_CONFLICT) {
      throw new ForbiddenException({
        code: STAGE3_ERROR_CODES.CONFLICT_DECLARED,
        message: "Cannot accept with confirmed conflict",
      });
    }
    await this.prisma.pitchReviewAssignment.update({
      where: { id: assignmentId },
      data: { status: ReviewAssignmentStatus.ACCEPTED, acceptedAt: new Date() },
    });
    return { status: ReviewAssignmentStatus.ACCEPTED };
  }

  async decline(user: AuthenticatedUser, assignmentId: string) {
    await this.getOwnedAssignment(assignmentId, user.id);
    await this.prisma.pitchReviewAssignment.update({
      where: { id: assignmentId },
      data: { status: ReviewAssignmentStatus.DECLINED },
    });
    return { status: ReviewAssignmentStatus.DECLINED };
  }

  async declareConflict(
    user: AuthenticatedUser,
    assignmentId: string,
    input: { status: ConflictStatus; explanation?: string },
  ) {
    await this.getOwnedAssignment(assignmentId, user.id);
    if (input.status === ConflictStatus.NOT_DECLARED) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.VALIDATION_FAILED,
        message: "Must declare a conflict status",
      });
    }
    await this.prisma.pitchReviewAssignment.update({
      where: { id: assignmentId },
      data: {
        conflictStatus: input.status,
        conflictExplanation: input.explanation,
      },
    });
    await this.audit.log({
      action: AuditAction.CONFLICT_DECLARE,
      entityType: "PitchReviewAssignment",
      entityId: assignmentId,
      actorId: user.id,
      metadata: { status: input.status },
    });
    return { conflictStatus: input.status };
  }

  async submitReview(
    user: AuthenticatedUser,
    assignmentId: string,
    input: {
      recommendation: ReviewRecommendation;
      strengths?: string;
      risks?: string;
      questions?: string;
      requiredChanges?: string;
      confidentialNotes?: string;
      applicantVisibleNotes?: string;
      scores: Array<{ criterion: string; score: number }>;
    },
  ): Promise<PitchReviewDto> {
    this.scope.assertReviewer(user);
    const limit = await this.rateLimit.checkLimit(`review:${user.id}`, 20, 3600);
    if (!limit.allowed) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.RATE_LIMITED,
        message: "Review submission rate limit exceeded",
      });
    }

    const assignment = await this.getOwnedAssignment(assignmentId, user.id);
    if ((assignment.conflictStatus as ConflictStatus) === ConflictStatus.NOT_DECLARED) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.VALIDATION_FAILED,
        message: "Conflict declaration required before review",
      });
    }
    if ((assignment.conflictStatus as ConflictStatus) === ConflictStatus.CONFIRMED_CONFLICT) {
      throw new ForbiddenException({
        code: STAGE3_ERROR_CODES.CONFLICT_DECLARED,
        message: "Cannot review with confirmed conflict",
      });
    }

    const averageScore = calculateReviewAverage(input.scores as never);

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.pitchReview.create({
        data: {
          assignmentId,
          submissionId: assignment.submissionId,
          reviewerId: user.id,
          recommendation: input.recommendation,
          strengths: input.strengths,
          risks: input.risks,
          questions: input.questions,
          requiredChanges: input.requiredChanges,
          confidentialNotes: input.confidentialNotes,
          applicantVisibleNotes: input.applicantVisibleNotes,
          averageScore,
        },
      });

      await tx.pitchReviewScore.createMany({
        data: input.scores.map((s) => ({
          reviewId: created.id,
          criterion: s.criterion,
          score: s.score,
        })),
      });

      await tx.pitchReviewAssignment.update({
        where: { id: assignmentId },
        data: { status: ReviewAssignmentStatus.COMPLETED, completedAt: new Date() },
      });

      return tx.pitchReview.findUniqueOrThrow({
        where: { id: created.id },
        include: { scores: true },
      });
    });

    await this.audit.log({
      action: AuditAction.REVIEW_SUBMIT,
      entityType: "PitchReview",
      entityId: review.id,
      actorId: user.id,
    });

    return {
      id: review.id,
      assignmentId,
      recommendation: review.recommendation as ReviewRecommendation,
      strengths: review.strengths ?? undefined,
      risks: review.risks ?? undefined,
      questions: review.questions ?? undefined,
      requiredChanges: review.requiredChanges ?? undefined,
      applicantVisibleNotes: review.applicantVisibleNotes ?? undefined,
      averageScore: review.averageScore ? Number(review.averageScore) : undefined,
      scores: review.scores.map((s) => ({ criterion: s.criterion, score: s.score })),
      submittedAt: review.submittedAt.toISOString(),
    };
  }

  private async getOwnedAssignment(assignmentId: string, userId: string) {
    const assignment = await this.prisma.pitchReviewAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment || assignment.reviewerId !== userId) {
      throw new NotFoundException({
        code: STAGE3_ERROR_CODES.NOT_FOUND,
        message: "Assignment not found",
      });
    }
    return assignment;
  }
}
