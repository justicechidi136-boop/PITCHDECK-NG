import { Module } from "@nestjs/common";
import { Stage3ScopeService } from "./stage3-scope.service";
import { Stage3RateLimitService } from "./stage3-rate-limit.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  providers: [Stage3ScopeService, Stage3RateLimitService],
  exports: [Stage3ScopeService, Stage3RateLimitService],
})
export class Stage3Module {}
