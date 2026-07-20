import { Module } from "@nestjs/common";
import { DiscoveryController } from "./discovery.controller";
import { DiscoveryService } from "./discovery.service";
import { AuthModule } from "../auth/auth.module";
import { Stage3Module } from "../stage3/stage3.module";

@Module({
  imports: [AuthModule, Stage3Module],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
})
export class DiscoveryModule {}
