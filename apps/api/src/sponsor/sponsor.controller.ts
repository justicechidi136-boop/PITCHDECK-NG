import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from "@nestjs/common";
import { SponsorService } from "./sponsor.service";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";

@Controller("sponsor-organizations")
export class SponsorController {
  constructor(private readonly sponsorService: SponsorService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.sponsorService.listOrganizations(user);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.sponsorService.createOrganization(user, body as never);
  }

  @Get(":organizationId")
  get(@CurrentUser() user: RequestUser, @Param("organizationId") organizationId: string) {
    return this.sponsorService.getOrganization(user, organizationId);
  }

  @Patch(":organizationId")
  update(
    @CurrentUser() user: RequestUser,
    @Param("organizationId") organizationId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.sponsorService.updateOrganization(user, organizationId, body);
  }

  @Get(":organizationId/members")
  listMembers(
    @CurrentUser() user: RequestUser,
    @Param("organizationId") organizationId: string,
  ) {
    return this.sponsorService.listMembers(user, organizationId);
  }

  @Post(":organizationId/members")
  addMember(
    @CurrentUser() user: RequestUser,
    @Param("organizationId") organizationId: string,
    @Body() body: { email: string; role: string },
  ) {
    return this.sponsorService.addMember(user, organizationId, body as never);
  }

  @Delete(":organizationId/members/:membershipId")
  removeMember(
    @CurrentUser() user: RequestUser,
    @Param("organizationId") organizationId: string,
    @Param("membershipId") membershipId: string,
  ) {
    return this.sponsorService.removeMember(user, organizationId, membershipId);
  }

  @Get(":organizationId/verification")
  getVerification(
    @CurrentUser() user: RequestUser,
    @Param("organizationId") organizationId: string,
  ) {
    return this.sponsorService.getVerification(user, organizationId);
  }

  @Post(":organizationId/verification/submit")
  submitVerification(
    @CurrentUser() user: RequestUser,
    @Param("organizationId") organizationId: string,
  ) {
    return this.sponsorService.submitVerification(user, organizationId);
  }
}
