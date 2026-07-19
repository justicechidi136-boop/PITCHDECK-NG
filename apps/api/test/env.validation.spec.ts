import { validateEnv, parseDurationToMs } from "../src/config/env.schema";

describe("env validation", () => {
  const baseEnv = {
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    REDIS_URL: "redis://localhost:6379",
    AUTH_JWT_SECRET: "test-jwt-secret-minimum-32-characters-long",
    AUTH_CSRF_SECRET: "test-csrf-secret-minimum-32-characters",
  };

  it("validates required auth env vars", () => {
    const config = validateEnv(baseEnv);
    expect(config.AUTH_JWT_SECRET).toBeDefined();
    expect(config.AUTH_CSRF_SECRET).toBeDefined();
  });

  it("requires SMTP config when EMAIL_PROVIDER=smtp", () => {
    expect(() =>
      validateEnv({ ...baseEnv, EMAIL_PROVIDER: "smtp" }),
    ).toThrow();
  });

  it("rejects mock and disabled scanning in production", () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        NODE_ENV: "production",
        AUTH_COOKIE_SECURE: "true",
        EMAIL_PROVIDER: "smtp",
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "587",
        OBJECT_STORAGE_ACCESS_KEY: "key",
        OBJECT_STORAGE_SECRET_KEY: "secret",
        FILE_SCAN_MODE: "mock",
      }),
    ).toThrow(/FILE_SCAN_MODE must be clamav in production/);
  });

  it("parses duration strings", () => {
    expect(parseDurationToMs("15m")).toBe(900_000);
    expect(parseDurationToMs("7d")).toBe(604_800_000);
  });
});
