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
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
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
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_URL: "http://localhost:4000/v1",
      },
    },
  ],
});
