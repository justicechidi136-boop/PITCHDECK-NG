import { Controller, Get, HttpStatus, Inject, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import type { Response } from "express";
import type Redis from "ioredis";
import type { PrismaClient } from "@pitchdeck/database";
import type { EnvConfig } from "../config/env.schema";
import { PRISMA_CLIENT } from "../database/database.module";
import { REDIS_CLIENT } from "../redis/redis.module";

const startTime = Date.now();

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly configService: ConfigService<EnvConfig, true>,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  @ApiOperation({ summary: "General health check" })
  getHealth() {
    return {
      status: "ok" as const,
      version: this.configService.get("APP_VERSION", { infer: true }),
      uptime: Math.floor((Date.now() - startTime) / 1000),
    };
  }

  @Get("live")
  @ApiOperation({ summary: "Liveness probe" })
  getLiveness() {
    return {
      status: "ok" as const,
      alive: true,
    };
  }

  @Get("ready")
  @ApiOperation({ summary: "Readiness probe with dependency checks" })
  async getReadiness(@Res({ passthrough: true }) response: Response) {
    const checks = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
    ]);

    const allUp = checks.every((check) => check.status === "up");

    if (!allUp) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: allUp ? ("ready" as const) : ("not_ready" as const),
      checks,
    };
  }

  private async checkPostgres() {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        name: "postgresql",
        status: "up" as const,
        latencyMs: Date.now() - started,
      };
    } catch {
      return {
        name: "postgresql",
        status: "down" as const,
        latencyMs: Date.now() - started,
      };
    }
  }

  private async checkRedis() {
    const started = Date.now();
    try {
      if (this.redis.status !== "ready") {
        await this.redis.connect();
      }
      await this.redis.ping();
      return {
        name: "redis",
        status: "up" as const,
        latencyMs: Date.now() - started,
      };
    } catch {
      return {
        name: "redis",
        status: "down" as const,
        latencyMs: Date.now() - started,
      };
    }
  }
}
