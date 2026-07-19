import { z } from "zod";
import {
  ACCOUNT_STATUSES,
  PUBLIC_REGISTRATION_ROLES,
  ROLE_TYPES,
  SCOPE_TYPES,
} from "./enums.js";
import { NIGERIAN_STATE_CODES } from "./states.js";
import { emailSchema, uuidSchema } from "./validation.js";

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be at most 128 characters");

export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(PUBLIC_REGISTRATION_ROLES),
  stateCode: z.enum(NIGERIAN_STATE_CODES),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms of service" }),
  }),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const forgotPasswordRequestSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

export const verifyEmailRequestSchema = z.object({
  token: z.string().min(1),
});

export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;

export const roleAssignmentSchema = z.object({
  role: z.enum(ROLE_TYPES),
  scopeType: z.enum(SCOPE_TYPES),
  countryCode: z.string().length(2).optional(),
  stateId: uuidSchema.optional(),
  stateCode: z.string().max(10).optional(),
});

export type RoleAssignmentDto = z.infer<typeof roleAssignmentSchema>;

export const authUserSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  firstName: z.string(),
  lastName: z.string(),
  accountStatus: z.enum(ACCOUNT_STATUSES),
  emailVerifiedAt: z.string().datetime().nullable(),
  roles: z.array(roleAssignmentSchema),
});

export type AuthUser = z.infer<typeof authUserSchema>;

export const sessionSchema = z.object({
  id: uuidSchema,
  deviceDescription: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime(),
  isCurrent: z.boolean(),
});

export type SessionDto = z.infer<typeof sessionSchema>;

export const adminCreateUserRequestSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  roles: z.array(roleAssignmentSchema).min(1),
});

export type AdminCreateUserRequest = z.infer<typeof adminCreateUserRequestSchema>;

export const adminUpdateUserStatusSchema = z.object({
  accountStatus: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]),
  suspendedReason: z.string().max(500).optional(),
});

export type AdminUpdateUserStatusRequest = z.infer<
  typeof adminUpdateUserStatusSchema
>;

export const adminAssignRoleRequestSchema = roleAssignmentSchema;

export type AdminAssignRoleRequest = z.infer<typeof adminAssignRoleRequestSchema>;

export const adminUserListItemSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  firstName: z.string(),
  lastName: z.string(),
  accountStatus: z.enum(ACCOUNT_STATUSES),
  emailVerifiedAt: z.string().datetime().nullable(),
  roles: z.array(roleAssignmentSchema),
  createdAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().nullable(),
});

export type AdminUserListItem = z.infer<typeof adminUserListItemSchema>;

export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
  ACCOUNT_DEACTIVATED: "ACCOUNT_DEACTIVATED",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  CSRF_INVALID: "CSRF_INVALID",
  ORIGIN_INVALID: "ORIGIN_INVALID",
  RATE_LIMITED: "RATE_LIMITED",
  FORBIDDEN: "FORBIDDEN",
  UNAUTHORIZED: "UNAUTHORIZED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  EMAIL_IN_USE: "EMAIL_IN_USE",
  LAST_SUPER_ADMIN: "LAST_SUPER_ADMIN",
  INVALID_ROLE_SCOPE: "INVALID_ROLE_SCOPE",
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];
