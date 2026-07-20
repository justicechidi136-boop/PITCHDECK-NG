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
    OBJECT_STORAGE_ENDPOINT: z.string().url().default("http://localhost:19000"),
    OBJECT_STORAGE_INTERNAL_ENDPOINT: z
      .string()
      .url()
      .default("http://localhost:19000"),
    OBJECT_STORAGE_REGION: z.string().default("us-east-1"),
    OBJECT_STORAGE_BUCKET: z.string().default("pitchdeck-uploads"),
    OBJECT_STORAGE_ACCESS_KEY: z.string().optional(),
    OBJECT_STORAGE_SECRET_KEY: z.string().optional(),
    OBJECT_STORAGE_FORCE_PATH_STYLE: z
      .enum(["true", "false"])
      .default("true")
      .transform((v) => v === "true"),
    OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .max(3600)
      .default(300),
    UPLOAD_DOCUMENT_MAX_BYTES: z.coerce.number().int().positive().default(15_728_640),
    UPLOAD_IMAGE_MAX_BYTES: z.coerce.number().int().positive().default(8_388_608),
    UPLOAD_INTENT_TTL_MINUTES: z.coerce.number().int().positive().default(15),
    FILE_SCAN_MODE: z.enum(["mock", "clamav", "disabled"]).default("mock"),
    CLAMAV_HOST: z.string().default("localhost"),
    CLAMAV_PORT: z.coerce.number().int().positive().default(3310),
    FILE_SCAN_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(60),
    PITCH_MIN_PROFILE_COMPLETION: z.coerce.number().int().min(0).max(100).default(80),
    PITCH_DEFAULT_CURRENCY: z.string().length(3).default("NGN"),
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
    if (data.NODE_ENV === "production") {
      if (data.EMAIL_PROVIDER !== "smtp") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "EMAIL_PROVIDER must be smtp in production",
          path: ["EMAIL_PROVIDER"],
        });
      }
      if (data.ENABLE_TEST_ENDPOINTS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ENABLE_TEST_ENDPOINTS must be false in production",
          path: ["ENABLE_TEST_ENDPOINTS"],
        });
      }
      if (!data.OBJECT_STORAGE_ACCESS_KEY || !data.OBJECT_STORAGE_SECRET_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Object storage credentials required in production",
          path: ["OBJECT_STORAGE_ACCESS_KEY"],
        });
      }
      if (data.FILE_SCAN_MODE !== "clamav") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "FILE_SCAN_MODE must be clamav in production",
          path: ["FILE_SCAN_MODE"],
        });
      }
      if (data.OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS > 900) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Signed URL TTL must not exceed 900 seconds in production",
          path: ["OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS"],
        });
      }
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
