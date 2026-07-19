import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response, Request } from "express";
import type { EnvConfig } from "../../config/env.schema";
import { parseDurationToMs } from "../../config/env.schema";

export const ACCESS_TOKEN_COOKIE = "pd_access_token";
export const REFRESH_TOKEN_COOKIE = "pd_refresh_token";
export const CSRF_TOKEN_COOKIE = "pd_csrf_token";

@Injectable()
export class CookieService {
  private readonly secure: boolean;
  private readonly domain?: string;
  private readonly refreshMaxAgeMs: number;
  private readonly accessMaxAgeMs: number;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {
    this.secure = this.configService.get("AUTH_COOKIE_SECURE", { infer: true });
    this.domain = this.configService.get("AUTH_COOKIE_DOMAIN", { infer: true });
    const refreshExpires = this.configService.get("AUTH_REFRESH_EXPIRES", {
      infer: true,
    });
    const accessExpires = this.configService.get("AUTH_JWT_ACCESS_EXPIRES", {
      infer: true,
    });
    this.refreshMaxAgeMs = parseDurationToMs(refreshExpires);
    this.accessMaxAgeMs = parseDurationToMs(accessExpires);
  }

  setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    csrfToken: string,
  ): void {
    const baseOptions = {
      httpOnly: true,
      secure: this.secure,
      sameSite: "lax" as const,
      ...(this.domain ? { domain: this.domain } : {}),
      path: "/",
    };

    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      ...baseOptions,
      maxAge: this.accessMaxAgeMs,
    });

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...baseOptions,
      maxAge: this.refreshMaxAgeMs,
    });

    res.cookie(CSRF_TOKEN_COOKIE, csrfToken, {
      httpOnly: false,
      secure: this.secure,
      sameSite: "lax" as const,
      ...(this.domain ? { domain: this.domain } : {}),
      path: "/",
      maxAge: this.refreshMaxAgeMs,
    });
  }

  clearAuthCookies(res: Response): void {
    const options = {
      httpOnly: true,
      secure: this.secure,
      sameSite: "lax" as const,
      ...(this.domain ? { domain: this.domain } : {}),
      path: "/",
    };
    res.clearCookie(ACCESS_TOKEN_COOKIE, options);
    res.clearCookie(REFRESH_TOKEN_COOKIE, options);
    res.clearCookie(CSRF_TOKEN_COOKIE, {
      ...options,
      httpOnly: false,
    });
  }

  getAccessToken(req: Request): string | undefined {
    return req.cookies[ACCESS_TOKEN_COOKIE] as string | undefined;
  }

  getRefreshToken(req: Request): string | undefined {
    return req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined;
  }

  getCsrfToken(req: Request): string | undefined {
    return req.cookies[CSRF_TOKEN_COOKIE] as string | undefined;
  }

  validateCsrf(req: Request): void {
    const cookieToken = this.getCsrfToken(req);
    const headerToken = req.headers["x-csrf-token"];
    if (
      !cookieToken ||
      !headerToken ||
      typeof headerToken !== "string" ||
      cookieToken !== headerToken
    ) {
      throw new UnauthorizedException({
        code: "CSRF_INVALID",
        message: "Invalid CSRF token",
      });
    }
  }

  validateOrigin(req: Request, allowedOrigins: string[]): void {
    const origin = req.headers.origin;
    if (!origin) {
      return;
    }
    if (!allowedOrigins.includes(origin)) {
      throw new UnauthorizedException({
        code: "ORIGIN_INVALID",
        message: "Invalid request origin",
      });
    }
  }

  setCsrfCookie(res: Response, csrfToken: string): void {
    res.cookie(CSRF_TOKEN_COOKIE, csrfToken, {
      httpOnly: false,
      secure: this.secure,
      sameSite: "lax",
      ...(this.domain ? { domain: this.domain } : {}),
      path: "/",
      maxAge: this.refreshMaxAgeMs,
    });
  }
}
