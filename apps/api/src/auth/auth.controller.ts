import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from "@nestjs/common";
import type { Response, Request } from "express";
import { AuthService } from "./services/auth.service";
import { CookieService } from "./services/cookie.service";
import { Public } from "./decorators/public.decorator";
import { CurrentUser, RequestMeta, type RequestUser } from "./decorators/current-user.decorator";
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
} from "./dto/auth.dto";
import { generateCsrfToken } from "./utils/crypto.util";
import { AUTH_ERROR_CODES } from "@pitchdeck/contracts";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
  ) {}

  @Public()
  @Post("register")
  async register(
    @Body() dto: RegisterDto,
    @RequestMeta() ctx: { ipAddress?: string; userAgent?: string },
  ) {
    return this.authService.register(dto, ctx);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @RequestMeta() ctx: { ipAddress?: string; userAgent?: string },
  ) {
    const result = await this.authService.login(dto, ctx);
    this.cookieService.setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      result.csrfToken,
    );
    return { user: result.user };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @RequestMeta() ctx: { ipAddress?: string; userAgent?: string },
  ) {
    const refreshToken = this.cookieService.getRefreshToken(req);
    if (!refreshToken) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.UNAUTHORIZED,
        message: "No refresh token",
      });
    }
    const result = await this.authService.refresh(refreshToken, ctx);
    this.cookieService.setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      result.csrfToken,
    );
    return { refreshed: true };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response,
    @RequestMeta() ctx: { ipAddress?: string; userAgent?: string },
  ) {
    await this.authService.logout(user.id, user.sessionId, ctx);
    this.cookieService.clearAuthCookies(res);
    return { loggedOut: true };
  }

  @Post("logout-all")
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response,
    @RequestMeta() ctx: { ipAddress?: string; userAgent?: string },
  ) {
    await this.authService.logoutAll(user.id, user.sessionId, ctx);
    return { loggedOutAll: true };
  }

  @Get("me")
  async me(@CurrentUser() user: RequestUser) {
    return this.authService.getMe(user.id);
  }

  @Get("sessions")
  async sessions(@CurrentUser() user: RequestUser) {
    return this.authService.listSessions(user.id, user.sessionId);
  }

  @Delete("sessions/:sessionId")
  async revokeSession(
    @CurrentUser() user: RequestUser,
    @Param("sessionId") sessionId: string,
    @RequestMeta() ctx: { ipAddress?: string; userAgent?: string },
  ) {
    await this.authService.revokeSession(user.id, sessionId, ctx);
    return { revoked: true };
  }

  @Public()
  @Post("email-verification/request")
  @HttpCode(HttpStatus.OK)
  async requestVerification(
    @Body() dto: ResendVerificationDto,
    @RequestMeta() ctx: { ipAddress?: string; userAgent?: string },
  ) {
    await this.authService.requestEmailVerification(dto.email, ctx);
    return { sent: true };
  }

  @Public()
  @Post("email-verification/confirm")
  @HttpCode(HttpStatus.OK)
  async confirmVerification(
    @Body() dto: VerifyEmailDto,
    @RequestMeta() ctx: { ipAddress?: string; userAgent?: string },
  ) {
    const user = await this.authService.confirmEmailVerification(dto.token, ctx);
    return { user };
  }

  @Public()
  @Post("password/forgot")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @RequestMeta() ctx: { ipAddress?: string; userAgent?: string },
  ) {
    await this.authService.forgotPassword(dto.email, ctx);
    return { sent: true };
  }

  @Public()
  @Post("password/reset")
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @RequestMeta() ctx: { ipAddress?: string; userAgent?: string },
  ) {
    await this.authService.resetPassword(dto.token, dto.password, ctx);
    return { reset: true };
  }

  @Public()
  @Get("csrf")
  csrf(@Res({ passthrough: true }) res: Response) {
    const csrfToken = generateCsrfToken();
    this.cookieService.setCsrfCookie(res, csrfToken);
    return { csrfToken };
  }
}
