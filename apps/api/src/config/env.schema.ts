import { z } from "zod";

const durationSchema = z
  .string()
  .regex(/^\d+[smhd]$/, "Duration must be like 15m, 7d, 24h");

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    API_PREFIX: z.string().default("v1"),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().min(1),
    CORS_ORIGINS: z
      .string()
      .default("http://localhost:3000,http://localhost:3001"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    APP_VERSION: z.string().default("0.1.0"),
    WEB_BASE_URL: z.string().url().default("http://localhost:3000"),
    ADMIN_WEB_BASE_URL: z.string().url().default("http://localhost:3001"),
    AUTH_JWT_SECRET: z.string().min(32),
    AUTH_JWT_ACCESS_EXPIRES: durationSchema.default("15m"),
    AUTH_REFRESH_EXPIRES: durationSchema.default("7d"),
    AUTH_COOKIE_DOMAIN: z.string().optional(),
    AUTH_COOKIE_SECURE: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    AUTH_CSRF_SECRET: z.string().min(32),
    EMAIL_PROVIDER: z.enum(["log", "smtp", "capture"]).default("log"),
    EMAIL_FROM: z.string().email().default("noreply@pitchdeck.ng"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    BOOTSTRAP_SUPER_ADMIN_EMAIL: z.string().email().optional(),
    BOOTSTRAP_SUPER_ADMIN_PASSWORD: z.string().min(12).max(128).optional(),
    BOOTSTRAP_SUPER_ADMIN_FIRST_NAME: z.string().min(1).max(100).optional(),
    BOOTSTRAP_SUPER_ADMIN_LAST_NAME: z.string().min(1).max(100).optional(),
    ENABLE_TEST_ENDPOINTS: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
  })
  .superRefine((data, ctx) => {
    if (data.EMAIL_PROVIDER === "smtp") {
      if (!data.SMTP_HOST) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "SMTP_HOST is required when EMAIL_PROVIDER=smtp",
          path: ["SMTP_HOST"],
        });
      }
      if (!data.SMTP_PORT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "SMTP_PORT is required when EMAIL_PROVIDER=smtp",
          path: ["SMTP_PORT"],
        });
      }
    }
    if (data.NODE_ENV === "production" && !data.AUTH_COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "AUTH_COOKIE_SECURE must be true in production",
        path: ["AUTH_COOKIE_SECURE"],
      });
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const messages = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Environment validation failed: ${messages}`);
  }
  return result.data;
}

export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) {
    throw new Error(`Invalid duration: ${duration}`);
  }
  const value = Number(match[1]);
  const unit = match[2] as keyof typeof multipliers;
  const multipliers = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  } as const;
  return value * multipliers[unit];
}
