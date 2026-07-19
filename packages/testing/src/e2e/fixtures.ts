import * as argon2 from "argon2";
import { AccountStatus, RoleType, ScopeType } from "@pitchdeck/contracts";
import { prisma } from "@pitchdeck/database";
import {
  ApiTestClient,
  DEFAULT_ADMIN_ORIGIN,
  DEFAULT_API_URL,
  TEST_PASSWORD,
  extractQueryParam,
  waitForCapturedEmail,
} from "./api-client.js";

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
} as const;

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS) as Promise<string>;
}

export const SUPER_ADMIN_EMAIL =
  process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL ?? "superadmin@e2e.pitchdeck.test";
export const SUPER_ADMIN_PASSWORD =
  process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD ?? "SuperAdminPass123!";

export function ensureSuperAdminCredentials(): {
  email: string;
  password: string;
} {
  return { email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD };
}

export async function createVerifiedInnovator(input: {
  email: string;
  stateCode?: string;
  password?: string;
}): Promise<{ email: string; password: string; userId: string }> {
  const client = new ApiTestClient(DEFAULT_API_URL, DEFAULT_ADMIN_ORIGIN);
  await client.registerInnovator({
    email: input.email,
    password: input.password,
    stateCode: input.stateCode ?? "LA",
  });
  const captured = await waitForCapturedEmail(input.email);
  const token = extractQueryParam(captured.actionUrl, "token");
  await client.request("/auth/email-verification/confirm", {
    method: "POST",
    body: { token },
  });
  const user = await prisma.user.findUniqueOrThrow({
    where: { emailNormalized: input.email.toLowerCase() },
  });
  return {
    email: input.email,
    password: input.password ?? TEST_PASSWORD,
    userId: user.id,
  };
}

export async function createVerifiedUserWithRole(input: {
  email: string;
  role: RoleType;
  stateCode?: string;
  password?: string;
  accountStatus?: AccountStatus;
}): Promise<{ email: string; password: string; userId: string }> {
  const password = input.password ?? TEST_PASSWORD;
  const passwordHash = await hashPassword(password);
  const role = await prisma.role.findUniqueOrThrow({ where: { type: input.role } });
  const state =
    input.stateCode != null
      ? await prisma.state.findUniqueOrThrow({ where: { code: input.stateCode } })
      : null;

  const user = await prisma.user.create({
    data: {
      email: input.email,
      emailNormalized: input.email.toLowerCase(),
      firstName: "E2E",
      lastName: input.role,
      passwordHash,
      accountStatus: input.accountStatus ?? AccountStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
      ...(state ? { stateId: state.id } : {}),
      roleAssignments: {
        create: {
          roleId: role.id,
          scopeType:
            input.role === RoleType.STATE_ADMIN
              ? ScopeType.STATE
              : input.role === RoleType.NATIONAL_ADMIN
                ? ScopeType.COUNTRY
                : ScopeType.GLOBAL,
          ...(input.role === RoleType.NATIONAL_ADMIN ? { countryCode: "NG" } : {}),
          ...(state ? { stateId: state.id } : {}),
        },
      },
    },
  });

  return { email: input.email, password, userId: user.id };
}

export async function deleteUserByEmail(email: string): Promise<void> {
  await prisma.user.deleteMany({
    where: { emailNormalized: email.toLowerCase() },
  });
}
