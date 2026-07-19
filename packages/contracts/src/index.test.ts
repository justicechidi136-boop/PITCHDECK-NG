import { ROLE_TYPES, AUDIT_ACTIONS } from "./enums.js";
import { apiMetaSchema, apiErrorSchema } from "./api-response.js";
import { healthStatusSchema, roleTypeSchema } from "./validation.js";

describe("@pitchdeck/contracts", () => {
  it("exports all role types", () => {
    expect(ROLE_TYPES).toHaveLength(7);
    expect(ROLE_TYPES).toContain("INNOVATOR");
  });

  it("exports audit actions", () => {
    expect(AUDIT_ACTIONS).toContain("CREATE");
  });

  it("validates api meta schema", () => {
    const result = apiMetaSchema.safeParse({
      requestId: "550e8400-e29b-41d4-a716-446655440000",
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("validates error response schema", () => {
    const result = apiErrorSchema.safeParse({
      success: false,
      error: { code: "NOT_FOUND", message: "Resource not found" },
      meta: {
        requestId: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: new Date().toISOString(),
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates health status schema", () => {
    const result = healthStatusSchema.safeParse({
      status: "ok",
      version: "0.1.0",
      uptime: 100,
    });
    expect(result.success).toBe(true);
  });

  it("validates role type schema", () => {
    expect(roleTypeSchema.safeParse("SPONSOR").success).toBe(true);
    expect(roleTypeSchema.safeParse("INVALID").success).toBe(false);
  });
});
