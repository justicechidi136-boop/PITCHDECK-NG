import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import {
  adminPitchFiltersSchema,
  assignReviewerSchema,
  optionalWorkflowReasonSchema,
  workflowReasonSchema,
} from "@pitchdeck/contracts";
import { AdminPitchesService } from "./admin-pitches.service";
import { AdminGuard } from "./guards/admin.guard";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("admin/pitches")
@UseGuards(AdminGuard)
export class AdminPitchesController {
  constructor(private readonly adminPitchesService: AdminPitchesService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(adminPitchFiltersSchema))
    filters: { status?: string; stateId?: string; page: number; pageSize: number },
  ) {
    return this.adminPitchesService.listPitches(user, filters);
  }

  @Get(":pitchId")
  get(@CurrentUser() user: RequestUser, @Param("pitchId", ParseUUIDPipe) pitchId: string) {
    return this.adminPitchesService.getPitch(user, pitchId);
  }

  @Post(":pitchId/start-review")
  startReview(@CurrentUser() user: RequestUser, @Param("pitchId", ParseUUIDPipe) pitchId: string) {
    return this.adminPitchesService.startReview(user, pitchId);
  }

  @Post(":pitchId/reviewers")
  assignReviewer(
    @CurrentUser() user: RequestUser,
    @Param("pitchId", ParseUUIDPipe) pitchId: string,
    @Body(new ZodValidationPipe(assignReviewerSchema)) body: { reviewerId: string },
  ) {
    return this.adminPitchesService.assignReviewer(user, pitchId, body.reviewerId);
  }

  @Delete(":pitchId/reviewers/:assignmentId")
  revokeReviewer(
    @CurrentUser() user: RequestUser,
    @Param("pitchId", ParseUUIDPipe) pitchId: string,
    @Param("assignmentId", ParseUUIDPipe) assignmentId: string,
    @Body(new ZodValidationPipe(optionalWorkflowReasonSchema)) body: { reason?: string },
  ) {
    return this.adminPitchesService.revokeReviewer(user, pitchId, assignmentId, body.reason);
  }

  @Post(":pitchId/request-changes")
  requestChanges(
    @CurrentUser() user: RequestUser,
    @Param("pitchId", ParseUUIDPipe) pitchId: string,
    @Body(new ZodValidationPipe(workflowReasonSchema)) body: { reason: string },
  ) {
    return this.adminPitchesService.requestChanges(user, pitchId, body.reason);
  }

  @Post(":pitchId/approve")
  approve(@CurrentUser() user: RequestUser, @Param("pitchId", ParseUUIDPipe) pitchId: string) {
    return this.adminPitchesService.approve(user, pitchId);
  }

  @Post(":pitchId/reject")
  reject(
    @CurrentUser() user: RequestUser,
    @Param("pitchId", ParseUUIDPipe) pitchId: string,
    @Body(new ZodValidationPipe(workflowReasonSchema)) body: { reason: string },
  ) {
    return this.adminPitchesService.reject(user, pitchId, body.reason);
  }

  @Post(":pitchId/reopen")
  reopen(@CurrentUser() user: RequestUser, @Param("pitchId", ParseUUIDPipe) pitchId: string) {
    return this.adminPitchesService.reopen(user, pitchId);
  }

  @Post(":pitchId/suspend-discovery")
  suspendDiscovery(@CurrentUser() user: RequestUser, @Param("pitchId", ParseUUIDPipe) pitchId: string) {
    return this.adminPitchesService.suspendDiscovery(user, pitchId);
  }
}
