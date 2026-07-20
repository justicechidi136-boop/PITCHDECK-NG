import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { discoveryFiltersSchema } from "@pitchdeck/contracts";
import { DiscoveryService } from "./discovery.service";
import { CurrentUser, type RequestUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("discovery/pitches")
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(discoveryFiltersSchema))
    filters: {
      sectorId?: string;
      stateCode?: string;
      innovationStage?: string;
      keyword?: string;
      page: number;
      pageSize: number;
    },
  ) {
    return this.discoveryService.listPitches(user, filters);
  }

  @Get(":pitchId")
  get(@CurrentUser() user: RequestUser, @Param("pitchId", ParseUUIDPipe) pitchId: string) {
    return this.discoveryService.getPitch(user, pitchId);
  }
}
