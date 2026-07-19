import { createTestUser, createTestApiMeta, TEST_ENV } from "./factories.js";
import { RoleType } from "@pitchdeck/contracts";

describe("@pitchdeck/testing", () => {
  it("creates test users with safe defaults", () => {
    const user = createTestUser();
    expect(user.email).toContain("@example.test");
    expect(user.roles).toContain(RoleType.INNOVATOR);
  });

  it("creates test api meta", () => {
    const meta = createTestApiMeta();
    expect(meta.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("provides dev-only test env placeholders", () => {
    expect(TEST_ENV.DATABASE_URL).toContain("localhost");
  });
});
