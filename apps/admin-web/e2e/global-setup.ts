import { execSync } from "node:child_process";
import path from "node:path";
import { AccountStatus, RoleType } from "@pitchdeck/contracts";
import {
  createVerifiedUserWithRole,
  deleteUserByEmail,
  ensureSuperAdminCredentials,
  uniqueEmail,
} from "@pitchdeck/testing/e2e";
import { writeAdminE2EFixtures, type AdminE2EFixtures } from "./admin-fixtures";

const repoRoot = path.resolve(process.cwd(), "../..");

export default async function globalSetup() {
  process.env.ENABLE_TEST_ENDPOINTS ??= "true";
  process.env.DATABASE_URL ??=
    "postgresql://pitchdeck:pitchdeck_dev@localhost:15432/pitchdeck?schema=public";

  execSync("pnpm --filter @pitchdeck/database admin:bootstrap", {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      ENABLE_TEST_ENDPOINTS: "true",
      BOOTSTRAP_SUPER_ADMIN_EMAIL:
        process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL ?? "superadmin@e2e.pitchdeck.test",
      BOOTSTRAP_SUPER_ADMIN_PASSWORD:
        process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD ?? "SuperAdminPass123!",
    },
  });

  const superAdmin = ensureSuperAdminCredentials();
  const innovatorEmail = uniqueEmail("innovator-deny");
  const sponsorEmail = uniqueEmail("sponsor-deny");
  const lagosInnovatorEmail = uniqueEmail("lagos-user");
  const riversInnovatorEmail = uniqueEmail("rivers-user");
  const lagosAdminEmail = uniqueEmail("lagos-admin");
  const suspendedAdminEmail = uniqueEmail("suspended-admin");

  for (const email of [
    innovatorEmail,
    sponsorEmail,
    lagosInnovatorEmail,
    riversInnovatorEmail,
    lagosAdminEmail,
    suspendedAdminEmail,
  ]) {
    await deleteUserByEmail(email);
  }

  const fixtures: AdminE2EFixtures = {
    superAdmin,
    innovator: await createVerifiedUserWithRole({
      email: innovatorEmail,
      role: RoleType.INNOVATOR,
      stateCode: "LA",
    }),
    sponsor: await createVerifiedUserWithRole({
      email: sponsorEmail,
      role: RoleType.SPONSOR,
      stateCode: "LA",
    }),
    lagosInnovator: await createVerifiedUserWithRole({
      email: lagosInnovatorEmail,
      role: RoleType.INNOVATOR,
      stateCode: "LA",
    }),
    riversInnovator: await createVerifiedUserWithRole({
      email: riversInnovatorEmail,
      role: RoleType.INNOVATOR,
      stateCode: "RI",
    }),
    lagosStateAdmin: await createVerifiedUserWithRole({
      email: lagosAdminEmail,
      role: RoleType.STATE_ADMIN,
      stateCode: "LA",
    }),
    suspendedAdmin: await createVerifiedUserWithRole({
      email: suspendedAdminEmail,
      role: RoleType.STATE_ADMIN,
      stateCode: "LA",
      accountStatus: AccountStatus.SUSPENDED,
    }),
  };

  writeAdminE2EFixtures(fixtures);
}
