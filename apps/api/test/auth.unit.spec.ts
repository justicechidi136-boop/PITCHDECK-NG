import {
  validatePasswordLength,
  hashPassword,
  verifyPassword,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "../src/auth/utils/password.util";
import {
  generateOpaqueToken,
  hashToken,
  safeCompare,
} from "../src/auth/utils/crypto.util";
import { normalizeEmail } from "@pitchdeck/contracts";

describe("password util", () => {
  it("validates password length bounds", () => {
    expect(() => validatePasswordLength("short")).toThrow();
    expect(() => validatePasswordLength("a".repeat(129))).toThrow();
    expect(() => validatePasswordLength("a".repeat(12))).not.toThrow();
  });

  it("hashes and verifies passwords", async () => {
    const password = "securepassword123";
    const hash = await hashPassword(password);
    expect(hash).not.toContain(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("wrongpassword1", hash)).toBe(false);
  });

  it("exports password length constants", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12);
    expect(PASSWORD_MAX_LENGTH).toBe(128);
  });
});

describe("crypto util", () => {
  it("generates unique opaque tokens", () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });

  it("hashes tokens consistently", () => {
    const token = "test-token";
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(token);
  });

  it("compares strings safely", () => {
    expect(safeCompare("abc", "abc")).toBe(true);
    expect(safeCompare("abc", "abd")).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims email", () => {
    expect(normalizeEmail("  Test@Example.COM  ")).toBe("test@example.com");
  });
});
