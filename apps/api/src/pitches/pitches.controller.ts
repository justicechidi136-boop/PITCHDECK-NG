import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from "@nestjs/common";
import { PitchesService } from "./pitches.service";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";

@Controller("pitches")
export class PitchesController {
  constructor(private readonly pitchesService: PitchesService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.pitchesService.list(user);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: { title: string }) {
    return this.pitchesService.create(user, body.title);
  }

  @Get(":pitchId")
  get(@CurrentUser() user: RequestUser, @Param("pitchId") pitchId: string) {
    return this.pitchesService.get(user, pitchId);
  }

  @Patch(":pitchId")
  update(
    @CurrentUser() user: RequestUser,
    @Param("pitchId") pitchId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.pitchesService.update(user, pitchId, body);
  }

  @Delete(":pitchId")
  delete(@CurrentUser() user: RequestUser, @Param("pitchId") pitchId: string) {
    return this.pitchesService.delete(user, pitchId);
  }

  @Get(":pitchId/completeness")
  completeness(@CurrentUser() user: RequestUser, @Param("pitchId") pitchId: string) {
    return this.pitchesService.getCompleteness(user, pitchId);
  }

  @Post(":pitchId/submit")
  submit(@CurrentUser() user: RequestUser, @Param("pitchId") pitchId: string) {
    return this.pitchesService.submit(user, pitchId);
  }

  @Post(":pitchId/withdraw")
  withdraw(@CurrentUser() user: RequestUser, @Param("pitchId") pitchId: string) {
    return this.pitchesService.withdraw(user, pitchId);
  }

  @Post(":pitchId/resubmit")
  resubmit(@CurrentUser() user: RequestUser, @Param("pitchId") pitchId: string) {
    return this.pitchesService.resubmit(user, pitchId);
  }

  @Get(":pitchId/submissions")
  listSubmissions(@CurrentUser() user: RequestUser, @Param("pitchId") pitchId: string) {
    return this.pitchesService.listSubmissions(user, pitchId);
  }

  @Get(":pitchId/submissions/:version")
  getSubmission(
    @CurrentUser() user: RequestUser,
    @Param("pitchId") pitchId: string,
    @Param("version", ParseIntPipe) version: number,
  ) {
    return this.pitchesService.getSubmission(user, pitchId, version);
  }
}
