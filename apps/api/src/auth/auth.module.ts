import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthController } from "./auth.controller";
import { AuthService } from "./services/auth.service";
import { TokenService } from "./services/token.service";
import { SessionService } from "./services/session.service";
import { CookieService } from "./services/cookie.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CsrfGuard } from "./guards/csrf.guard";
import { EmailService } from "../email/email.service";
import { AuditService } from "../audit/audit.service";
import { RateLimitService } from "../rate-limit/rate-limit.service";
import { RbacService } from "../rbac/rbac.service";

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    SessionService,
    CookieService,
    EmailService,
    AuditService,
    RateLimitService,
    RbacService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
  exports: [
    AuthService,
    CookieService,
    RbacService,
    AuditService,
    TokenService,
    SessionService,
    EmailService,
    RateLimitService,
  ],
})
export class AuthModule {}
