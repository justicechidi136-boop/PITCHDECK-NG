import { Controller, Get, Post, Body, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import {
  adminSponsorOrganizationFiltersSchema,
  workflowReasonSchema,
} from "@pitchdeck/contracts";
import { AdminSponsorOrgsService } from "./admin-sponsor-orgs.service";
import { AdminGuard } from "./guards/admin.guard";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("admin/sponsor-organizations")
@UseGuards(AdminGuard)
export class AdminSponsorOrgsController {
  constructor(private readonly adminSponsorOrgsService: AdminSponsorOrgsService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(adminSponsorOrganizationFiltersSchema))
    filters: { status?: string; page: number; pageSize: number },
  ) {
    return this.adminSponsorOrgsService.listOrganizations(user, filters);
  }

  @Get(":organizationId")
  get(@CurrentUser() user: RequestUser, @Param("organizationId", ParseUUIDPipe) organizationId: string) {
    return this.adminSponsorOrgsService.getOrganization(user, organizationId);
  }

  @Post(":organizationId/start-review")
  startReview(@CurrentUser() user: RequestUser, @Param("organizationId", ParseUUIDPipe) organizationId: string) {
    return this.adminSponsorOrgsService.startReview(user, organizationId);
  }

  @Post(":organizationId/request-changes")
  requestChanges(
    @CurrentUser() user: RequestUser,
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body(new ZodValidationPipe(workflowReasonSchema)) body: { reason: string },
  ) {
    return this.adminSponsorOrgsService.requestChanges(user, organizationId, body.reason);
  }

  @Post(":organizationId/verify")
  verify(@CurrentUser() user: RequestUser, @Param("organizationId", ParseUUIDPipe) organizationId: string) {
    return this.adminSponsorOrgsService.verify(user, organizationId);
  }

  @Post(":organizationId/reject")
  reject(
    @CurrentUser() user: RequestUser,
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body(new ZodValidationPipe(workflowReasonSchema)) body: { reason: string },
  ) {
    return this.adminSponsorOrgsService.reject(user, organizationId, body.reason);
  }

  @Post(":organizationId/suspend")
  suspend(
    @CurrentUser() user: RequestUser,
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body(new ZodValidationPipe(workflowReasonSchema)) body: { reason: string },
  ) {
    return this.adminSponsorOrgsService.suspend(user, organizationId, body.reason);
  }
}
