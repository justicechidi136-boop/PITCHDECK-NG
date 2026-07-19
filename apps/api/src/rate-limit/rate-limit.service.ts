import { Inject, Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../redis/redis.module";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

@Injectable()
export class RateLimitService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async checkLimit(
    key: string,
    maxAttempts: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;
    const count = await this.redis.incr(redisKey);
    if (count === 1) {
      await this.redis.expire(redisKey, windowSeconds);
    }
    if (count > maxAttempts) {
      const ttl = await this.redis.ttl(redisKey);
      return { allowed: false, retryAfterSeconds: ttl > 0 ? ttl : windowSeconds };
    }
    return { allowed: true };
  }
}
