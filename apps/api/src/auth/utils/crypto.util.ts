import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function generateCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function generateFamilyId(): string {
  return randomBytes(16).toString("hex");
}

export function parseUserAgent(userAgent: string | undefined): string {
  if (!userAgent) {
    return "Unknown device";
  }
  if (userAgent.includes("Mobile")) {
    return "Mobile browser";
  }
  if (userAgent.includes("Windows")) {
    return "Windows browser";
  }
  if (userAgent.includes("Mac")) {
    return "Mac browser";
  }
  if (userAgent.includes("Linux")) {
    return "Linux browser";
  }
  return "Web browser";
}
