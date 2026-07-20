import { Module } from "@nestjs/common";
import { SponsorController } from "./sponsor.controller";
import { SponsorService } from "./sponsor.service";
import { AuthModule } from "../auth/auth.module";
import { Stage3Module } from "../stage3/stage3.module";

@Module({
  imports: [AuthModule, Stage3Module],
  controllers: [SponsorController],
  providers: [SponsorService],
  exports: [SponsorService],
})
export class SponsorModule {}
