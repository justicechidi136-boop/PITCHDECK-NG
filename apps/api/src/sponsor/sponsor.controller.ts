import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  addSponsorMemberSchema,
  createOrganizationSchema,
  updateOrganizationSchema,
} from "@pitchdeck/contracts";
import { SponsorService } from "./sponsor.service";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("sponsor-organizations")
export class SponsorController {
  constructor(private readonly sponsorService: SponsorService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.sponsorService.listOrganizations(user);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body(new ZodValidationPipe(createOrganizationSchema)) body: never) {
    return this.sponsorService.createOrganization(user, body);
  }

  @Get(":organizationId")
  get(@CurrentUser() user: RequestUser, @Param("organizationId", ParseUUIDPipe) organizationId: string) {
    return this.sponsorService.getOrganization(user, organizationId);
  }

  @Patch(":organizationId")
  update(
    @CurrentUser() user: RequestUser,
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body(new ZodValidationPipe(updateOrganizationSchema)) body: Record<string, unknown>,
  ) {
    return this.sponsorService.updateOrganization(user, organizationId, body);
  }

  @Get(":organizationId/members")
  listMembers(
    @CurrentUser() user: RequestUser,
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
  ) {
    return this.sponsorService.listMembers(user, organizationId);
  }

  @Post(":organizationId/members")
  addMember(
    @CurrentUser() user: RequestUser,
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body(new ZodValidationPipe(addSponsorMemberSchema)) body: never,
  ) {
    return this.sponsorService.addMember(user, organizationId, body);
  }

  @Delete(":organizationId/members/:membershipId")
  removeMember(
    @CurrentUser() user: RequestUser,
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("membershipId", ParseUUIDPipe) membershipId: string,
  ) {
    return this.sponsorService.removeMember(user, organizationId, membershipId);
  }

  @Get(":organizationId/verification")
  getVerification(
    @CurrentUser() user: RequestUser,
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
  ) {
    return this.sponsorService.getVerification(user, organizationId);
  }

  @Post(":organizationId/verification/submit")
  submitVerification(
    @CurrentUser() user: RequestUser,
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
  ) {
    return this.sponsorService.submitVerification(user, organizationId);
  }
}
