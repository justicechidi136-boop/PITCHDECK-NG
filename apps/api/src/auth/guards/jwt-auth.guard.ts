import { Inject, Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { PrismaClient } from "@prisma/client";
import { AUTH_ERROR_CODES } from "@pitchdeck/contracts";
import { PRISMA_CLIENT } from "../../database/database.module";
import { TokenService } from "../services/token.service";
import { CookieService } from "../services/cookie.service";
import { SessionService } from "../services/session.service";
import { RbacService, type AuthenticatedUser } from "../../rbac/rbac.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly tokenService: TokenService,
    private readonly cookieService: CookieService,
    private readonly sessionService: SessionService,
    private readonly rbacService: RbacService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      cookies?: Record<string, string>;
      headers: Record<string, string | string[] | undefined>;
      user?: AuthenticatedUser & { sessionId: string };
    }>();

    const token =
      this.cookieService.getAccessToken(request as never) ??
      this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.UNAUTHORIZED,
        message: "Authentication required",
      });
    }

    let payload: { sub: string; sid: string };
    try {
      payload = this.tokenService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.UNAUTHORIZED,
        message: "Invalid or expired access token",
      });
    }

    const session = await this.sessionService.getValidSession(payload.sid, payload.sub);
    if (!session) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.UNAUTHORIZED,
        message: "Session expired or revoked",
      });
    }

    const roles = await this.rbacService.getUserRoles(payload.sub);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.UNAUTHORIZED,
        message: "User not found",
      });
    }

    request.user = {
      id: user.id,
      email: user.email,
      accountStatus: user.accountStatus,
      roles,
      sessionId: payload.sid,
    };

    return true;
  }

  private extractBearerToken(authHeader: string | string[] | undefined): string | undefined {
    if (!authHeader || Array.isArray(authHeader)) {
      return undefined;
    }
    const [scheme, token] = authHeader.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      return undefined;
    }
    return token;
  }
}
