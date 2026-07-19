#!/usr/bin/env tsx
import { PrismaClient, ScopeType } from "@prisma/client";
import { RoleType, AccountStatus, normalizeEmail } from "@pitchdeck/contracts";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD;
  const firstName = process.env.BOOTSTRAP_SUPER_ADMIN_FIRST_NAME ?? "Super";
  const lastName = process.env.BOOTSTRAP_SUPER_ADMIN_LAST_NAME ?? "Admin";

  if (!email || !password) {
    console.error(
      "BOOTSTRAP_SUPER_ADMIN_EMAIL and BOOTSTRAP_SUPER_ADMIN_PASSWORD are required",
    );
    process.exit(1);
  }

  if (password.length < 12 || password.length > 128) {
    console.error("Bootstrap password must be 12-128 characters");
    process.exit(1);
  }

  const emailNormalized = normalizeEmail(email);
  const existing = await prisma.user.findUnique({ where: { emailNormalized } });

  if (existing) {
    const hasSuperAdmin = await prisma.roleAssignment.findFirst({
      where: { userId: existing.id, role: { type: RoleType.SUPER_ADMIN } },
    });
    if (hasSuperAdmin) {
      console.log("Super admin already exists — bootstrap skipped (idempotent)");
      return;
    }
  }

  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { type: RoleType.SUPER_ADMIN },
  });

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          accountStatus: AccountStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      })
    : await prisma.user.create({
        data: {
          email: email.trim(),
          emailNormalized,
          firstName,
          lastName,
          passwordHash,
          accountStatus: AccountStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      });

  const existingAssignment = await prisma.roleAssignment.findFirst({
    where: {
      userId: user.id,
      roleId: superAdminRole.id,
      scopeType: ScopeType.GLOBAL,
      stateId: null,
    },
  });

  if (!existingAssignment) {
    await prisma.roleAssignment.create({
      data: {
        userId: user.id,
        roleId: superAdminRole.id,
        scopeType: ScopeType.GLOBAL,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      action: "BOOTSTRAP",
      entityType: "User",
      entityId: user.id,
      actorId: user.id,
      metadata: { bootstrap: true },
    },
  });

  console.log(`Super admin bootstrapped: ${user.email}`);
}

main()
  .catch((error: unknown) => {
    console.error("Bootstrap failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
