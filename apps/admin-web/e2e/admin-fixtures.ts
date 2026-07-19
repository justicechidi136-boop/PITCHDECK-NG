import fs from "node:fs";
import path from "node:path";

export interface AdminE2EFixtures {
  superAdmin: { email: string; password: string };
  innovator: { email: string; password: string; userId: string };
  sponsor: { email: string; password: string; userId: string };
  lagosInnovator: { email: string; password: string; userId: string };
  riversInnovator: { email: string; password: string; userId: string };
  lagosStateAdmin: { email: string; password: string; userId: string };
  suspendedAdmin: { email: string; password: string; userId: string };
}

export const ADMIN_E2E_FIXTURES_PATH = path.join(
  process.cwd(),
  "e2e",
  ".admin-e2e-fixtures.json",
);

export function writeAdminE2EFixtures(fixtures: AdminE2EFixtures): void {
  fs.mkdirSync(path.dirname(ADMIN_E2E_FIXTURES_PATH), { recursive: true });
  fs.writeFileSync(ADMIN_E2E_FIXTURES_PATH, JSON.stringify(fixtures), "utf8");
}

export function readAdminE2EFixtures(): AdminE2EFixtures {
  if (!fs.existsSync(ADMIN_E2E_FIXTURES_PATH)) {
    throw new Error(
      "Admin E2E fixtures not found. Ensure Playwright globalSetup completed successfully.",
    );
  }

  return JSON.parse(fs.readFileSync(ADMIN_E2E_FIXTURES_PATH, "utf8")) as AdminE2EFixtures;
}
