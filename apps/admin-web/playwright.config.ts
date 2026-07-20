import { defineConfig, devices } from "@playwright/test";

const apiEnv = {
  ENABLE_TEST_ENDPOINTS: "true",
  EMAIL_PROVIDER: "capture",
  NODE_ENV: "test",
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://pitchdeck:pitchdeck_dev@localhost:15432/pitchdeck?schema=public",
  REDIS_URL: process.env.REDIS_URL ?? "redis://:pitchdeck_redis_dev@localhost:16379",
  AUTH_JWT_SECRET:
    process.env.AUTH_JWT_SECRET ?? "dev-jwt-secret-minimum-32-characters-long",
  AUTH_CSRF_SECRET:
    process.env.AUTH_CSRF_SECRET ?? "dev-csrf-secret-minimum-32-characters",
  AUTH_COOKIE_SECURE: "false",
  CORS_ORIGINS: "http://localhost:3000,http://localhost:3001",
  WEB_BASE_URL: "http://localhost:3000",
  ADMIN_WEB_BASE_URL: "http://localhost:3001",
  EMAIL_FROM: "noreply@pitchdeck.test",
  BOOTSTRAP_SUPER_ADMIN_EMAIL:
    process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL ?? "superadmin@e2e.pitchdeck.test",
  BOOTSTRAP_SUPER_ADMIN_PASSWORD:
    process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD ?? "SuperAdminPass123!",
  OBJECT_STORAGE_ENDPOINT: process.env.OBJECT_STORAGE_ENDPOINT ?? "http://localhost:19000",
  OBJECT_STORAGE_INTERNAL_ENDPOINT:
    process.env.OBJECT_STORAGE_INTERNAL_ENDPOINT ?? "http://localhost:19000",
  OBJECT_STORAGE_ACCESS_KEY: process.env.OBJECT_STORAGE_ACCESS_KEY ?? "pitchdeck_minio",
  OBJECT_STORAGE_SECRET_KEY: process.env.OBJECT_STORAGE_SECRET_KEY ?? "pitchdeck_minio_dev",
  OBJECT_STORAGE_BUCKET: process.env.OBJECT_STORAGE_BUCKET ?? "pitchdeck-uploads",
  OBJECT_STORAGE_FORCE_PATH_STYLE: "true",
  FILE_SCAN_MODE: process.env.FILE_SCAN_MODE ?? "clamav",
  CLAMAV_HOST: process.env.CLAMAV_HOST ?? "localhost",
  CLAMAV_PORT: process.env.CLAMAV_PORT ?? "3310",
  FILE_SCAN_TIMEOUT_SECONDS: process.env.FILE_SCAN_TIMEOUT_SECONDS ?? "120",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  timeout: 60_000,
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: process.env.CI
        ? "pnpm --filter @pitchdeck/api start"
        : "pnpm --filter @pitchdeck/api dev",
      url: "http://localhost:4000/v1/health/live",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: apiEnv,
    },
    {
      command: process.env.CI ? "pnpm start" : "pnpm dev",
      url: "http://localhost:3001",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_URL: "http://localhost:4000/v1",
      },
    },
  ],
});
