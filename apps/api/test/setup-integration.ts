process.env.NODE_ENV ??= "test";
process.env.ENABLE_TEST_ENDPOINTS ??= "true";
process.env.DATABASE_URL ??=
  "postgresql://pitchdeck:pitchdeck_dev@localhost:15432/pitchdeck?schema=public";
process.env.REDIS_URL ??= "redis://:pitchdeck_redis_dev@localhost:16379";
process.env.LOG_LEVEL ??= "silent";
process.env.WEB_BASE_URL ??= "http://localhost:3000";
process.env.ADMIN_WEB_BASE_URL ??= "http://localhost:3001";
process.env.AUTH_JWT_SECRET ??=
  "test-jwt-secret-minimum-32-characters-long";
process.env.AUTH_JWT_ACCESS_EXPIRES ??= "15m";
process.env.AUTH_REFRESH_EXPIRES ??= "7d";
process.env.AUTH_COOKIE_SECURE ??= "false";
process.env.AUTH_CSRF_SECRET ??=
  "test-csrf-secret-minimum-32-characters";
process.env.EMAIL_PROVIDER ??= "log";
process.env.EMAIL_FROM ??= "noreply@pitchdeck.test";
process.env.CORS_ORIGINS ??=
  "http://localhost:3000,http://localhost:3001";
