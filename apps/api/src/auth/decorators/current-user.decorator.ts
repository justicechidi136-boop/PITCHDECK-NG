import type { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";
import type { AuthenticatedUser } from "../../rbac/rbac.service";

export type RequestUser = AuthenticatedUser & { sessionId: string };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return request.user;
  },
);

export const RequestMeta = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{
      ip?: string;
      headers: Record<string, string | string[] | undefined>;
    }>();
    const forwarded = request.headers["x-forwarded-for"];
    const ipAddress =
      (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : undefined) ??
      request.ip;
    const userAgent = request.headers["user-agent"];
    return {
      ipAddress,
      userAgent: typeof userAgent === "string" ? userAgent : undefined,
    };
  },
);
