import { z } from "zod";
import { ROLE_TYPES } from "./enums.js";

export const emailSchema = z.string().email().max(255);

export const uuidSchema = z.string().uuid();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const healthStatusSchema = z.object({
  status: z.enum(["ok", "degraded", "error"]),
  version: z.string(),
  uptime: z.number().nonnegative(),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;

export const readinessCheckSchema = z.object({
  name: z.string(),
  status: z.enum(["up", "down"]),
  latencyMs: z.number().nonnegative().optional(),
});

export const readinessStatusSchema = z.object({
  status: z.enum(["ready", "not_ready"]),
  checks: z.array(readinessCheckSchema),
});

export type ReadinessStatus = z.infer<typeof readinessStatusSchema>;

export const roleTypeSchema = z.enum(ROLE_TYPES);

export const userProfileSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  accountStatus: z.string(),
  roles: z.array(roleTypeSchema),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
