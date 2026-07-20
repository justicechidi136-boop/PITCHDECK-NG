import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { ReviewerService } from "./reviewer.service";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";

@Controller("reviewer/assignments")
export class ReviewerController {
  constructor(private readonly reviewerService: ReviewerService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.reviewerService.listAssignments(user);
  }

  @Get(":assignmentId")
  get(@CurrentUser() user: RequestUser, @Param("assignmentId") assignmentId: string) {
    return this.reviewerService.getAssignment(user, assignmentId);
  }

  @Post(":assignmentId/accept")
  accept(@CurrentUser() user: RequestUser, @Param("assignmentId") assignmentId: string) {
    return this.reviewerService.accept(user, assignmentId);
  }

  @Post(":assignmentId/decline")
  decline(@CurrentUser() user: RequestUser, @Param("assignmentId") assignmentId: string) {
    return this.reviewerService.decline(user, assignmentId);
  }

  @Post(":assignmentId/conflict")
  conflict(
    @CurrentUser() user: RequestUser,
    @Param("assignmentId") assignmentId: string,
    @Body() body: { status: string; explanation?: string },
  ) {
    return this.reviewerService.declareConflict(user, assignmentId, body as never);
  }

  @Post(":assignmentId/review")
  review(
    @CurrentUser() user: RequestUser,
    @Param("assignmentId") assignmentId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.reviewerService.submitReview(user, assignmentId, body as never);
  }
}
