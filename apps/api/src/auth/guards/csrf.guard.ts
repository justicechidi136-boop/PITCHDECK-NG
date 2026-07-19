import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from "@nestjs/common";
import type { Request } from "express";
import { ConfigService } from "@nestjs/config";
import { CookieService } from "../services/cookie.service";
import type { EnvConfig } from "../../config/env.schema";

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedOrigins: string[];

  constructor(
    private readonly cookieService: CookieService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {
    this.allowedOrigins = this.configService
      .get("CORS_ORIGINS", { infer: true })
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      return true;
    }

    this.cookieService.validateOrigin(request, this.allowedOrigins);
    this.cookieService.validateCsrf(request);
    return true;
  }
}