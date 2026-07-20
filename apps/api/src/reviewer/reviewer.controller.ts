import { Controller, Get, Post, Body, Param, ParseUUIDPipe } from "@nestjs/common";
import { conflictDeclarationSchema, submitReviewSchema } from "@pitchdeck/contracts";
import { ReviewerService } from "./reviewer.service";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("reviewer/assignments")
export class ReviewerController {
  constructor(private readonly reviewerService: ReviewerService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.reviewerService.listAssignments(user);
  }

  @Get(":assignmentId")
  get(@CurrentUser() user: RequestUser, @Param("assignmentId", ParseUUIDPipe) assignmentId: string) {
    return this.reviewerService.getAssignment(user, assignmentId);
  }

  @Post(":assignmentId/accept")
  accept(@CurrentUser() user: RequestUser, @Param("assignmentId", ParseUUIDPipe) assignmentId: string) {
    return this.reviewerService.accept(user, assignmentId);
  }

  @Post(":assignmentId/decline")
  decline(@CurrentUser() user: RequestUser, @Param("assignmentId", ParseUUIDPipe) assignmentId: string) {
    return this.reviewerService.decline(user, assignmentId);
  }

  @Post(":assignmentId/conflict")
  conflict(
    @CurrentUser() user: RequestUser,
    @Param("assignmentId", ParseUUIDPipe) assignmentId: string,
    @Body(new ZodValidationPipe(conflictDeclarationSchema)) body: never,
  ) {
    return this.reviewerService.declareConflict(user, assignmentId, body);
  }

  @Post(":assignmentId/review")
  review(
    @CurrentUser() user: RequestUser,
    @Param("assignmentId", ParseUUIDPipe) assignmentId: string,
    @Body(new ZodValidationPipe(submitReviewSchema)) body: never,
  ) {
    return this.reviewerService.submitReview(user, assignmentId, body);
  }
}
