import { test, expect } from "@playwright/test";
import {
  ApiTestClient,
  clearCapturedEmails,
  uniqueEmail,
} from "@pitchdeck/testing/e2e";
import { prisma } from "@pitchdeck/database";

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  await clearCapturedEmails();
});

test("1. create sponsor organisation", async () => {
  const email = uniqueEmail("sponsor-org");
  const client = new ApiTestClient();
  await client.registerAndLoginSponsor(email);
  const org = await client.request("/sponsor-organizations", {
    method: "POST",
    body: { legalName: "E2E Corp", displayName: "E2E Corp", organizationType: "CORPORATE" },
  });
  expect((org.data as { displayName: string }).displayName).toBe("E2E Corp");
});

test("2. upload verification document intent", async () => {
  const email = uniqueEmail("sponsor-upload");
  const client = new ApiTestClient();
  await client.registerAndLoginSponsor(email);
  const org = await client.request("/sponsor-organizations", {
    method: "POST",
    body: { legalName: "Upload Co", displayName: "Upload Co", organizationType: "NGO" },
  });
  const intent = await client.request("/files/upload-intents", {
    method: "POST",
    body: {
      purpose: "SPONSOR_REGISTRATION_CERT",
      originalFilename: "cert.pdf",
      declaredMimeType: "application/pdf",
      sizeBytes: 1024,
      organizationId: (org.data as { id: string }).id,
    },
  });
  expect((intent.data as { fileId: string }).fileId).toBeTruthy();
});

test("3. submit verification blocked without document", async () => {
  const email = uniqueEmail("sponsor-verify");
  const client = new ApiTestClient();
  await client.registerAndLoginSponsor(email);
  const org = await client.request("/sponsor-organizations", {
    method: "POST",
    body: { legalName: "Verify Co", displayName: "Verify Co", organizationType: "CORPORATE" },
  });
  await expect(
    client.request(`/sponsor-organizations/${(org.data as { id: string }).id}/verification/submit`, {
      method: "POST",
      body: {},
    }),
  ).rejects.toThrow();
});

test("4. view verification timeline", async () => {
  const email = uniqueEmail("sponsor-timeline");
  const client = new ApiTestClient();
  await client.registerAndLoginSponsor(email);
  const org = await client.request("/sponsor-organizations", {
    method: "POST",
    body: { legalName: "Timeline Co", displayName: "Timeline Co", organizationType: "CORPORATE" },
  });
  const verification = await client.request(
    `/sponsor-organizations/${(org.data as { id: string }).id}/verification`,
  );
  expect((verification.data as { status: string }).status).toBe("DRAFT");
});

test("5. verified sponsor discovery requires verification", async () => {
  const email = uniqueEmail("sponsor-discover");
  const client = new ApiTestClient();
  await client.registerAndLoginSponsor(email);
  await expect(client.request("/discovery/pitches")).rejects.toThrow();
});

test("6. filter approved pitches empty for unverified", async () => {
  const email = uniqueEmail("sponsor-filter");
  const client = new ApiTestClient();
  await client.registerAndLoginSponsor(email);
  await expect(client.request("/discovery/pitches?page=1")).rejects.toThrow();
});

test("7. open approved pitch details denied when unverified", async () => {
  const email = uniqueEmail("sponsor-detail");
  const client = new ApiTestClient();
  await client.registerAndLoginSponsor(email);
  await expect(client.request("/discovery/pitches/00000000-0000-4000-8000-000000000001")).rejects.toThrow();
});

test("8. unverified sponsor denied discovery UI", async ({ page }) => {
  const email = uniqueEmail("sponsor-ui");
  const client = new ApiTestClient();
  await client.registerAndLoginSponsor(email);
  await page.goto("/sponsor/discover");
  await expect(page.getByText(/verified sponsor organisation/i)).toBeVisible({ timeout: 15000 });
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
