import { Module } from "@nestjs/common";
import { ReviewerController } from "./reviewer.controller";
import { ReviewerService } from "./reviewer.service";
import { AuthModule } from "../auth/auth.module";
import { Stage3Module } from "../stage3/stage3.module";

@Module({
  imports: [AuthModule, Stage3Module],
  controllers: [ReviewerController],
  providers: [ReviewerService],
})
export class ReviewerModule {}
