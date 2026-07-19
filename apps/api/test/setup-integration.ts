process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  "postgresql://pitchdeck:pitchdeck_dev@localhost:15432/pitchdeck?schema=public";
process.env.REDIS_URL = "redis://:pitchdeck_redis_dev@localhost:16379";
process.env.LOG_LEVEL = "silent";

