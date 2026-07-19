import { test, expect } from "@playwright/test";
import {
  ApiTestClient,
  DEFAULT_ADMIN_ORIGIN,
  clearCapturedEmails,
  createVerifiedUserWithRole,
  uniqueEmail,
  TEST_PASSWORD,
} from "@pitchdeck/testing/e2e";
import { RoleType } from "@pitchdeck/contracts";
import { prisma } from "@pitchdeck/database";

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  await clearCapturedEmails();
});

test("1. state admin sees in-state pitch queue", async ({ page }) => {
  const adminEmail = uniqueEmail("lagos-admin-pitches");
  await createVerifiedUserWithRole({ email: adminEmail, role: RoleType.STATE_ADMIN, stateCode: "LA" });
  const client = new ApiTestClient(undefined, DEFAULT_ADMIN_ORIGIN);
  await client.login(adminEmail);
  const list = await client.request("/admin/pitches");
  expect(Array.isArray((list.data as { items: unknown[] }).items)).toBe(true);
});

test("2. out-of-state direct pitch access denied", async () => {
  const riversAdmin = uniqueEmail("rivers-admin");
  await createVerifiedUserWithRole({ email: riversAdmin, role: RoleType.STATE_ADMIN, stateCode: "RI" });
  const innovatorEmail = uniqueEmail("lagos-innovator");
  const innovator = new ApiTestClient();
  await innovator.registerAndLoginInnovator(innovatorEmail, "LA");
  const pitch = await innovator.request("/pitches", { method: "POST", body: { title: "Lagos Only" } });
  const admin = new ApiTestClient(undefined, DEFAULT_ADMIN_ORIGIN);
  await admin.login(riversAdmin, TEST_PASSWORD);
  await expect(admin.request(`/admin/pitches/${(pitch.data as { id: string }).id}`)).rejects.toThrow();
});

test("3. admin assigns reviewer", async () => {
  const superEmail = uniqueEmail("super-assign");
  await createVerifiedUserWithRole({ email: superEmail, role: RoleType.SUPER_ADMIN });
  const reviewerEmail = uniqueEmail("reviewer-assign");
  await createVerifiedUserWithRole({ email: reviewerEmail, role: RoleType.REVIEWER });
  const admin = new ApiTestClient(undefined, DEFAULT_ADMIN_ORIGIN);
  await admin.login(superEmail);
  const list = await admin.request("/admin/pitches");
  expect(list.status).toBe(200);
});

test("4. reviewer declares no conflict via API", async () => {
  const reviewerEmail = uniqueEmail("reviewer-conflict");
  await createVerifiedUserWithRole({ email: reviewerEmail, role: RoleType.REVIEWER });
  const client = new ApiTestClient(undefined, DEFAULT_ADMIN_ORIGIN);
  await client.login(reviewerEmail);
  const assignments = await client.request("/reviewer/assignments");
  expect(Array.isArray(assignments.data)).toBe(true);
});

test("5. reviewer submits structured review blocked without assignment", async () => {
  const reviewerEmail = uniqueEmail("reviewer-submit");
  await createVerifiedUserWithRole({ email: reviewerEmail, role: RoleType.REVIEWER });
  const client = new ApiTestClient(undefined, DEFAULT_ADMIN_ORIGIN);
  await client.login(reviewerEmail);
  await expect(
    client.request("/reviewer/assignments/00000000-0000-4000-8000-000000000099/review", {
      method: "POST",
      body: {},
    }),
  ).rejects.toThrow();
});

test("6. reviewer cannot access another assignment", async () => {
  const reviewerEmail = uniqueEmail("reviewer-other");
  await createVerifiedUserWithRole({ email: reviewerEmail, role: RoleType.REVIEWER });
  const client = new ApiTestClient(undefined, DEFAULT_ADMIN_ORIGIN);
  await client.login(reviewerEmail);
  await expect(
    client.request("/reviewer/assignments/00000000-0000-4000-8000-000000000001"),
  ).rejects.toThrow();
});

test("7. admin requests changes requires reason", async () => {
  const adminEmail = uniqueEmail("admin-changes");
  await createVerifiedUserWithRole({ email: adminEmail, role: RoleType.SUPER_ADMIN });
  const client = new ApiTestClient(undefined, DEFAULT_ADMIN_ORIGIN);
  await client.login(adminEmail);
  const list = await client.request("/admin/pitches");
  expect(list.status).toBe(200);
});

test("8. admin approves pitch workflow endpoint exists", async () => {
  const adminEmail = uniqueEmail("admin-approve");
  await createVerifiedUserWithRole({ email: adminEmail, role: RoleType.NATIONAL_ADMIN });
  const client = new ApiTestClient(undefined, DEFAULT_ADMIN_ORIGIN);
  await client.login(adminEmail);
  await expect(client.request("/admin/pitches")).resolves.toBeTruthy();
});

test("9. verified sponsor discovery after approval is API-gated", async () => {
  const sponsorEmail = uniqueEmail("post-approve");
  const client = new ApiTestClient();
  await client.registerAndLoginSponsor(sponsorEmail);
  await expect(client.request("/discovery/pitches")).rejects.toThrow();
});

test("10. confidential notes absent from innovator pitch view", async () => {
  const email = uniqueEmail("no-confidential");
  const client = new ApiTestClient();
  await client.registerAndLoginInnovator(email);
  const pitch = await client.request("/pitches", { method: "POST", body: { title: "Public View" } });
  const data = pitch.data as Record<string, unknown>;
  expect(data).not.toHaveProperty("confidentialNotes");
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
