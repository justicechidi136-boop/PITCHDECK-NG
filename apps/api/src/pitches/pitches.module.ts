import { Module } from "@nestjs/common";
import { PitchesController } from "./pitches.controller";
import { PitchesService } from "./pitches.service";
import { AuthModule } from "../auth/auth.module";
import { InnovatorModule } from "../innovator/innovator.module";
import { Stage3Module } from "../stage3/stage3.module";

@Module({
  imports: [AuthModule, InnovatorModule, Stage3Module],
  controllers: [PitchesController],
  providers: [PitchesService],
  exports: [PitchesService],
})
export class PitchesModule {}
