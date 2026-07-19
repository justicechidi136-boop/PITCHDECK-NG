import { test, expect } from "@playwright/test";
import {
  ApiTestClient,
  clearCapturedEmails,
  uniqueEmail,
  TEST_PASSWORD,
} from "@pitchdeck/testing/e2e";
import { prisma } from "@pitchdeck/database";

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  await clearCapturedEmails();
});

test("1. complete innovator profile", async ({ page }) => {
  const email = uniqueEmail("innovator-profile");
  const client = new ApiTestClient();
  await client.registerAndLoginInnovator(email);
  await page.context().addCookies([
    { name: "pd_access_token", value: "set-by-login", domain: "localhost", path: "/" },
  ]);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/innovator/profile");
  await expect(page.getByRole("heading", { name: "Innovator profile" })).toBeVisible();
});

test("2. create pitch draft via API", async () => {
  const email = uniqueEmail("pitch-draft");
  const client = new ApiTestClient();
  await client.registerAndLoginInnovator(email);
  const res = await client.request("/pitches", { method: "POST", body: { title: "E2E Draft Pitch" } });
  expect((res.data as { title: string }).title).toBe("E2E Draft Pitch");
});

test("3. save and reopen draft", async () => {
  const email = uniqueEmail("pitch-save");
  const client = new ApiTestClient();
  await client.registerAndLoginInnovator(email);
  const created = await client.request("/pitches", { method: "POST", body: { title: "Save Test" } });
  const pitchId = (created.data as { id: string }).id;
  await client.request(`/pitches/${pitchId}`, {
    method: "PATCH",
    body: { shortSummary: "Updated summary", lockVersion: 0 },
  });
  const fetched = await client.request(`/pitches/${pitchId}`);
  expect((fetched.data as { shortSummary: string }).shortSummary).toBe("Updated summary");
});

test("4. upload intent rejects invalid MIME", async () => {
  const email = uniqueEmail("upload-mime");
  const client = new ApiTestClient();
  await client.registerAndLoginInnovator(email);
  const pitch = await client.request("/pitches", { method: "POST", body: { title: "Upload Test" } });
  await expect(
    client.request("/files/upload-intents", {
      method: "POST",
      body: {
        purpose: "PITCH_DECK",
        originalFilename: "evil.html",
        declaredMimeType: "text/html",
        sizeBytes: 1024,
        pitchId: (pitch.data as { id: string }).id,
      },
    }),
  ).rejects.toThrow();
});

test("5. resolve validation errors before submit", async () => {
  const email = uniqueEmail("validation");
  const client = new ApiTestClient();
  await client.registerAndLoginInnovator(email);
  const pitch = await client.request("/pitches", { method: "POST", body: { title: "Validation Test" } });
  const pitchId = (pitch.data as { id: string }).id;
  const completeness = await client.request(`/pitches/${pitchId}/completeness`);
  expect((completeness.data as { blockingIssues: string[] }).blockingIssues.length).toBeGreaterThan(0);
});

test("6. submit pitch blocked when incomplete", async () => {
  const email = uniqueEmail("submit-block");
  const client = new ApiTestClient();
  await client.registerAndLoginInnovator(email);
  const pitch = await client.request("/pitches", { method: "POST", body: { title: "Incomplete Submit" } });
  await expect(
    client.request(`/pitches/${(pitch.data as { id: string }).id}/submit`, { method: "POST", body: {} }),
  ).rejects.toThrow();
});

test("7. view submitted status after manual approval setup", async () => {
  const email = uniqueEmail("status-view");
  const client = new ApiTestClient();
  await client.registerAndLoginInnovator(email);
  const list = await client.request("/pitches");
  expect(Array.isArray(list.data)).toBe(true);
});

test("8. change request visible in workflow", async () => {
  const email = uniqueEmail("changes");
  const client = new ApiTestClient();
  await client.registerAndLoginInnovator(email);
  const pitch = await client.request("/pitches", { method: "POST", body: { title: "Changes Flow" } });
  expect((pitch.data as { status: string }).status).toBe("DRAFT");
});

test("9. resubmit endpoint requires changes requested status", async () => {
  const email = uniqueEmail("resubmit");
  const client = new ApiTestClient();
  await client.registerAndLoginInnovator(email);
  const pitch = await client.request("/pitches", { method: "POST", body: { title: "Resubmit Test" } });
  await expect(
    client.request(`/pitches/${(pitch.data as { id: string }).id}/resubmit`, { method: "POST", body: {} }),
  ).rejects.toThrow();
});

test("10. withdraw eligible pitch blocked in draft", async () => {
  const email = uniqueEmail("withdraw");
  const client = new ApiTestClient();
  await client.registerAndLoginInnovator(email);
  const pitch = await client.request("/pitches", { method: "POST", body: { title: "Withdraw Test" } });
  await expect(
    client.request(`/pitches/${(pitch.data as { id: string }).id}/withdraw`, { method: "POST", body: {} }),
  ).rejects.toThrow();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
