import { Controller, Get, Param, Query } from "@nestjs/common";
import { DiscoveryService } from "./discovery.service";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";

@Controller("discovery/pitches")
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query("sectorId") sectorId?: string,
    @Query("stateCode") stateCode?: string,
    @Query("innovationStage") innovationStage?: string,
    @Query("keyword") keyword?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.discoveryService.listPitches(user, {
      sectorId,
      stateCode,
      innovationStage,
      keyword,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @Get(":pitchId")
  get(@CurrentUser() user: RequestUser, @Param("pitchId") pitchId: string) {
    return this.discoveryService.getPitch(user, pitchId);
  }
}
