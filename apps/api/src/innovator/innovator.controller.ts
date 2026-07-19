import { Controller, Get, Put, Patch, Body, UseGuards } from "@nestjs/common";
import { InnovatorService } from "./innovator.service";
import { CurrentUser, RequestMeta, type RequestUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("innovator/profile")
@UseGuards(JwtAuthGuard)
export class InnovatorController {
  constructor(private readonly innovatorService: InnovatorService) {}

  @Get()
  getProfile(@CurrentUser() user: RequestUser) {
    return this.innovatorService.getProfile(user);
  }

  @Put()
  @Patch()
  upsertProfile(
    @CurrentUser() user: RequestUser,
    @Body() body: Record<string, unknown>,
    @RequestMeta() ctx: { ipAddress?: string; userAgent?: string },
  ) {
    return this.innovatorService.upsertProfile(user, body, ctx.ipAddress, ctx.userAgent);
  }

  @Get("completeness")
  getCompleteness(@CurrentUser() user: RequestUser) {
    return this.innovatorService.getCompleteness(user);
  }
}
