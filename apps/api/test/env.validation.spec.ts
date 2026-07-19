import { validateEnv } from "../src/config/env.schema";

describe("Environment validation", () => {
  it("accepts valid configuration", () => {
    const config = validateEnv({
      NODE_ENV: "test",
      PORT: 4000,
      API_PREFIX: "v1",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/pitchdeck",
      REDIS_URL: "redis://localhost:6379",
      CORS_ORIGINS: "http://localhost:3000",
      LOG_LEVEL: "error",
      APP_VERSION: "0.1.0",
    });

    expect(config.PORT).toBe(4000);
    expect(config.API_PREFIX).toBe("v1");
  });

  it("rejects invalid DATABASE_URL", () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: "not-a-url",
        REDIS_URL: "redis://localhost:6379",
      }),
    ).toThrow(/Environment validation failed/);
  });

  it("applies defaults for optional values", () => {
    const config = validateEnv({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/pitchdeck",
      REDIS_URL: "redis://localhost:6379",
    });

    expect(config.NODE_ENV).toBe("development");
    expect(config.PORT).toBe(4000);
  });
});
