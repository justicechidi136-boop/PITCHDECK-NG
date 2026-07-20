import { Controller, Get, Post, Body, Param, Query, UseGuards } from "@nestjs/common";
import { AdminSponsorOrgsService } from "./admin-sponsor-orgs.service";
import { AdminGuard } from "./guards/admin.guard";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";

@Controller("admin/sponsor-organizations")
@UseGuards(AdminGuard)
export class AdminSponsorOrgsController {
  constructor(private readonly adminSponsorOrgsService: AdminSponsorOrgsService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.adminSponsorOrgsService.listOrganizations(user, {
      status,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @Get(":organizationId")
  get(@CurrentUser() user: RequestUser, @Param("organizationId") organizationId: string) {
    return this.adminSponsorOrgsService.getOrganization(user, organizationId);
  }

  @Post(":organizationId/start-review")
  startReview(@CurrentUser() user: RequestUser, @Param("organizationId") organizationId: string) {
    return this.adminSponsorOrgsService.startReview(user, organizationId);
  }

  @Post(":organizationId/request-changes")
  requestChanges(
    @CurrentUser() user: RequestUser,
    @Param("organizationId") organizationId: string,
    @Body() body: { reason: string },
  ) {
    return this.adminSponsorOrgsService.requestChanges(user, organizationId, body.reason);
  }

  @Post(":organizationId/verify")
  verify(@CurrentUser() user: RequestUser, @Param("organizationId") organizationId: string) {
    return this.adminSponsorOrgsService.verify(user, organizationId);
  }

  @Post(":organizationId/reject")
  reject(
    @CurrentUser() user: RequestUser,
    @Param("organizationId") organizationId: string,
    @Body() body: { reason: string },
  ) {
    return this.adminSponsorOrgsService.reject(user, organizationId, body.reason);
  }

  @Post(":organizationId/suspend")
  suspend(
    @CurrentUser() user: RequestUser,
    @Param("organizationId") organizationId: string,
    @Body() body: { reason: string },
  ) {
    return this.adminSponsorOrgsService.suspend(user, organizationId, body.reason);
  }
}
