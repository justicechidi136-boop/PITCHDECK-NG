import { Module } from "@nestjs/common";
import { InnovatorController } from "./innovator.controller";
import { InnovatorService } from "./innovator.service";
import { AuthModule } from "../auth/auth.module";
import { Stage3Module } from "../stage3/stage3.module";

@Module({
  imports: [AuthModule, Stage3Module],
  controllers: [InnovatorController],
  providers: [InnovatorService],
  exports: [InnovatorService],
})
export class InnovatorModule {}
