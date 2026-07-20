import { Module } from "@nestjs/common";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";
import { AdminPitchesController } from "./admin-pitches.controller";
import { AdminPitchesService } from "./admin-pitches.service";
import { AdminSponsorOrgsController } from "./admin-sponsor-orgs.controller";
import { AdminSponsorOrgsService } from "./admin-sponsor-orgs.service";
import { AdminGuard } from "./guards/admin.guard";
import { AuthModule } from "../auth/auth.module";
import { Stage3Module } from "../stage3/stage3.module";

@Module({
  imports: [AuthModule, Stage3Module],
  controllers: [
    AdminUsersController,
    AdminPitchesController,
    AdminSponsorOrgsController,
  ],
  providers: [
    AdminUsersService,
    AdminPitchesService,
    AdminSponsorOrgsService,
    AdminGuard,
  ],
})
export class AdminModule {}
