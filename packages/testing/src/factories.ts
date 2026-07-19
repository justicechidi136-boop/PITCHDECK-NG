import { RoleType } from "@pitchdeck/contracts";

export interface TestUserFactoryOptions {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roles?: RoleType[];
}

export function createTestUser(
  overrides: TestUserFactoryOptions = {},
): Required<TestUserFactoryOptions> {
  return {
    id: overrides.id ?? "550e8400-e29b-41d4-a716-446655440000",
    email: overrides.email ?? "innovator@example.test",
    firstName: overrides.firstName ?? "Test",
    lastName: overrides.lastName ?? "Innovator",
    roles: overrides.roles ?? [RoleType.INNOVATOR],
  };
}

export function createTestApiMeta(requestId?: string) {
  return {
    requestId: requestId ?? "660e8400-e29b-41d4-a716-446655440000",
    timestamp: new Date().toISOString(),
  };
}

export const TEST_ENV = {
  DATABASE_URL:
    "postgresql://pitchdeck:pitchdeck_dev@localhost:5432/pitchdeck?schema=public",
  REDIS_URL: "redis://:pitchdeck_redis_dev@localhost:6379",
  MINIO_ENDPOINT: "localhost",
  MINIO_PORT: "9000",
  MINIO_ACCESS_KEY: "pitchdeck_minio",
  MINIO_SECRET_KEY: "pitchdeck_minio_dev",
  MINIO_BUCKET: "pitchdeck-uploads",
} as const;
