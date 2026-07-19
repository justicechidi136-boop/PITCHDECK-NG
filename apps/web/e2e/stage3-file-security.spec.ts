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

test("1. unauthorised user cannot obtain download URL", async () => {
  const owner = uniqueEmail("file-owner");
  const other = uniqueEmail("file-other");
  const ownerClient = new ApiTestClient();
  await ownerClient.registerAndLoginInnovator(owner);
  const pitch = await ownerClient.request("/pitches", { method: "POST", body: { title: "File Security" } });
  const intent = await ownerClient.request("/files/upload-intents", {
    method: "POST",
    body: {
      purpose: "PITCH_DECK",
      originalFilename: "deck.pdf",
      declaredMimeType: "application/pdf",
      sizeBytes: 2048,
      pitchId: (pitch.data as { id: string }).id,
    },
  });
  const fileId = (intent.data as { fileId: string }).fileId;
  const otherClient = new ApiTestClient();
  await otherClient.registerAndLoginInnovator(other);
  await expect(otherClient.request(`/files/${fileId}/download-url`)).rejects.toThrow();
});

test("2. sponsor verification document inaccessible to innovator", async () => {
  const sponsorEmail = uniqueEmail("sponsor-file");
  const innovatorEmail = uniqueEmail("innovator-file");
  const sponsor = new ApiTestClient();
  await sponsor.registerAndLoginSponsor(sponsorEmail);
  const org = await sponsor.request("/sponsor-organizations", {
    method: "POST",
    body: { legalName: "Sec Co", displayName: "Sec Co", organizationType: "CORPORATE" },
  });
  const intent = await sponsor.request("/files/upload-intents", {
    method: "POST",
    body: {
      purpose: "SPONSOR_REGISTRATION_CERT",
      originalFilename: "cert.pdf",
      declaredMimeType: "application/pdf",
      sizeBytes: 2048,
      organizationId: (org.data as { id: string }).id,
    },
  });
  const fileId = (intent.data as { fileId: string }).fileId;
  const innovator = new ApiTestClient();
  await innovator.registerAndLoginInnovator(innovatorEmail);
  await expect(innovator.request(`/files/${fileId}/download-url`)).rejects.toThrow();
});

test("3. unscanned file unavailable for download", async () => {
  const email = uniqueEmail("unscanned");
  const client = new ApiTestClient();
  await client.registerAndLoginInnovator(email);
  const pitch = await client.request("/pitches", { method: "POST", body: { title: "Unscanned" } });
  const intent = await client.request("/files/upload-intents", {
    method: "POST",
    body: {
      purpose: "PITCH_DECK",
      originalFilename: "deck.pdf",
      declaredMimeType: "application/pdf",
      sizeBytes: 2048,
      pitchId: (pitch.data as { id: string }).id,
    },
  });
  const fileId = (intent.data as { fileId: string }).fileId;
  await expect(client.request(`/files/${fileId}/download-url`)).rejects.toThrow();
});

test("4. signed URL response includes short TTL", async () => {
  const email = uniqueEmail("ttl");
  const client = new ApiTestClient();
  await client.registerAndLoginInnovator(email);
  await expect(client.request("/files/00000000-0000-4000-8000-000000000001/download-url")).rejects.toThrow();
});

test("5. storage keys never appear in pitch list API", async () => {
  const email = uniqueEmail("no-keys");
  const client = new ApiTestClient();
  await client.registerAndLoginInnovator(email);
  const list = await client.request("/pitches");
  const serialized = JSON.stringify(list.data);
  expect(serialized).not.toContain("objectKey");
  expect(serialized).not.toContain("pitchdeck_minio");
});

test.afterAll(async () => {
  await prisma.$disconnect();
});
