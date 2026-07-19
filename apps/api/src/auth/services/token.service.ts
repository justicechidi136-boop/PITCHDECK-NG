import { sign, verify, type JwtPayload } from "jsonwebtoken";
import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";
import type { EnvConfig } from "../../config/env.schema";
import { parseDurationToMs } from "../../config/env.schema";

export interface AccessTokenPayload {
  sub: string;
  sid: string;
}

@Injectable()
export class TokenService {
  private readonly jwtSecret: string;
  private readonly accessExpiresMs: number;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {
    this.jwtSecret = this.configService.get("AUTH_JWT_SECRET", { infer: true });
    const accessExpires = this.configService.get("AUTH_JWT_ACCESS_EXPIRES", {
      infer: true,
    });
    this.accessExpiresMs = parseDurationToMs(accessExpires);
  }

  signAccessToken(userId: string, sessionId: string): string {
    const payload: AccessTokenPayload = { sub: userId, sid: sessionId };
    return sign(payload, this.jwtSecret, {
      expiresIn: Math.floor(this.accessExpiresMs / 1000),
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const decoded = verify(token, this.jwtSecret) as JwtPayload & AccessTokenPayload;
    if (!decoded.sub || !decoded.sid) {
      throw new Error("Invalid access token payload");
    }
    return { sub: decoded.sub, sid: decoded.sid };
  }

  getAccessExpiresMs(): number {
    return this.accessExpiresMs;
  }
}
