import { Injectable } from "@nestjs/common";
import { RateLimitService } from "../rate-limit/rate-limit.service";
import { STAGE3_ERROR_CODES } from "@pitchdeck/contracts";
import { BadRequestException } from "@nestjs/common";

@Injectable()
export class Stage3RateLimitService {
  constructor(private readonly rateLimit: RateLimitService) {}

  async check(userId: string, action: string, max: number, windowSeconds: number): Promise<void> {
    const result = await this.rateLimit.checkLimit(`stage3:${action}:${userId}`, max, windowSeconds);
    if (!result.allowed) {
      throw new BadRequestException({
        code: STAGE3_ERROR_CODES.RATE_LIMITED,
        message: `Rate limit exceeded for ${action}`,
      });
    }
  }

  pitchCreate(userId: string): Promise<void> {
    return this.check(userId, "pitch-create", 10, 3600);
  }

  pitchSubmit(userId: string): Promise<void> {
    return this.check(userId, "pitch-submit", 5, 3600);
  }

  pitchResubmit(userId: string): Promise<void> {
    return this.check(userId, "pitch-resubmit", 5, 3600);
  }

  orgCreate(userId: string): Promise<void> {
    return this.check(userId, "org-create", 5, 3600);
  }

  membershipInvite(userId: string): Promise<void> {
    return this.check(userId, "membership-invite", 20, 3600);
  }

  verificationSubmit(userId: string): Promise<void> {
    return this.check(userId, "verification-submit", 3, 3600);
  }

  discoverySearch(userId: string): Promise<void> {
    return this.check(userId, "discovery-search", 100, 3600);
  }

  reviewSubmit(userId: string): Promise<void> {
    return this.check(userId, "review-submit", 20, 3600);
  }
}
